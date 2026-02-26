const Booking = require("../models/Booking");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Dispute = require("../models/Dispute");
const User = require("../models/User");
const { resolveProviderKycStatus, isKycApproved } = require("./kyc");
const { createNotification } = require("./createNotification");

const CHAT_ALLOWED_STATUSES = new Set([
  "requested",
  "accepted",
  "pending_payment",
  "confirmed",
  "in-progress",
  "provider_completed",
  "awaiting_client_confirmation",
  "pending-completion",
  "completed",
  "disputed",
  "quote_requested",
  "quote_sent",
  "quote_pending_admin_review",
  "quote_accepted",
]);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeLimit(limitValue, fallback = 30) {
  const parsed = Number(limitValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
}

function mapSenderRoleFromBooking(booking, userId) {
  const isClient = String(booking.clientId?._id || booking.clientId) === String(userId);
  if (isClient) return "client";
  return "provider";
}

async function ensureBookingForChat({ bookingId, user, allowAdminRead = false, adminDisputeOnly = false }) {
  const booking = await Booking.findById(bookingId)
    .populate("clientId", "_id profile email")
    .populate("providerId", "_id profile email")
    .populate("serviceId", "title priceMode");

  if (!booking) {
    throw createHttpError(404, "Booking not found");
  }

  const userId = String(user.id);
  const isClient = String(booking.clientId?._id || booking.clientId) === userId;
  const isProvider = String(booking.providerId?._id || booking.providerId) === userId;
  const isAdmin = user.role === "admin";

  if (!isClient && !isProvider) {
    if (!allowAdminRead || !isAdmin) {
      throw createHttpError(403, "Forbidden: Booking chat access denied");
    }

    if (adminDisputeOnly) {
      const hasDispute = Boolean(booking.disputeId) || Boolean(await Dispute.findOne({ bookingId }).select("_id").lean());
      if (!hasDispute) {
        throw createHttpError(403, "Admin chat access is only available for disputed bookings");
      }
    }
  } else {
    if (!CHAT_ALLOWED_STATUSES.has(booking.status)) {
      throw createHttpError(400, "Chat is not available for this booking status");
    }

    const providerUser = await User.findById(booking.providerId?._id || booking.providerId);
    if (!providerUser) {
      throw createHttpError(404, "Provider not found");
    }

    const providerKycStatus = await resolveProviderKycStatus({
      user: providerUser,
      providerId: String(providerUser._id),
    });

    if (!isKycApproved(providerKycStatus)) {
      throw createHttpError(403, "Chat is disabled because provider KYC is not approved");
    }
  }

  return {
    booking,
    participantRole: isClient ? "client" : isProvider ? "provider" : "admin",
  };
}

async function getOrCreateConversationForBooking(booking) {
  const bookingId = booking._id;

  let conversation = await Conversation.findOne({ bookingId });
  if (!conversation) {
    conversation = await Conversation.create({
      bookingId,
      clientId: booking.clientId?._id || booking.clientId,
      providerId: booking.providerId?._id || booking.providerId,
      lastMessageAt: null,
      lastMessageText: "",
      unreadByClient: 0,
      unreadByProvider: 0,
    });
  }

  return conversation;
}

async function getBookingChatHistory({ bookingId, before, limit = 30 }) {
  const safeLimit = normalizeLimit(limit);
  const query = { bookingId };

  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const docs = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit + 1)
    .lean();

  const hasMore = docs.length > safeLimit;
  const messages = (hasMore ? docs.slice(0, safeLimit) : docs).reverse();

  return {
    messages,
    hasMore,
    nextBefore: messages.length ? messages[0].createdAt : null,
  };
}

async function sendBookingMessage({ booking, senderId, text, type = "text", attachment = null }) {
  const msgType = type || "text";
  const trimmedText = String(text || "").trim();

  if (msgType === "text" && !trimmedText) {
    throw createHttpError(400, "Message text is required");
  }

  // Build display text for conversation preview
  let previewText = trimmedText;
  if (msgType === "image") previewText = trimmedText || "📷 Photo";
  if (msgType === "voice") previewText = trimmedText || "🎤 Voice message";

  const senderRole = mapSenderRoleFromBooking(booking, senderId);
  const receiverId =
    senderRole === "client"
      ? booking.providerId?._id || booking.providerId
      : booking.clientId?._id || booking.clientId;

  const conversation = await getOrCreateConversationForBooking(booking);

  const messageData = {
    bookingId: booking._id,
    conversationId: conversation._id,
    senderId,
    receiverId,
    senderRole,
    type: msgType,
    text: trimmedText,
    status: "sent",
  };

  if (attachment && (msgType === "image" || msgType === "voice")) {
    messageData.attachment = attachment;
  }

  const message = await Message.create(messageData);

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageAt: message.createdAt,
        lastMessageText: previewText.slice(0, 300),
      },
      $inc:
        senderRole === "client"
          ? { unreadByProvider: 1 }
          : { unreadByClient: 1 },
    }
  );

  if (String(receiverId) !== String(senderId)) {
    const bookingCode = String(booking._id).slice(-6);
    await createNotification({
      userId: receiverId,
      type: "chat_message",
      title: `New message for booking #${bookingCode}`,
      message: previewText.length > 120 ? `${previewText.slice(0, 117)}...` : previewText,
      category: "booking",
      bookingId: booking._id,
      fromUserId: senderId,
      targetRoute: `/chat/booking/${booking._id}`,
      targetRouteParams: { bookingId: booking._id },
    });
  }

  return {
    message,
    receiverId: String(receiverId),
    senderRole,
  };
}

async function markBookingAsRead({ booking, userId, participantRole }) {
  if (!["client", "provider"].includes(participantRole)) {
    return { updatedCount: 0, unreadCount: 0 };
  }

  const readAt = new Date();
  const updateResult = await Message.updateMany(
    {
      bookingId: booking._id,
      receiverId: userId,
      status: { $ne: "read" },
    },
    {
      $set: {
        status: "read",
        readAt,
      },
    }
  );

  const conversation = await getOrCreateConversationForBooking(booking);
  const unreadField = participantRole === "client" ? "unreadByClient" : "unreadByProvider";
  const setPayload = {};
  setPayload[unreadField] = 0;

  await Conversation.updateOne({ _id: conversation._id }, { $set: setPayload });

  return {
    updatedCount: Number(updateResult.modifiedCount || 0),
    unreadCount: 0,
  };
}

module.exports = {
  CHAT_ALLOWED_STATUSES,
  ensureBookingForChat,
  getOrCreateConversationForBooking,
  getBookingChatHistory,
  sendBookingMessage,
  markBookingAsRead,
  createHttpError,
};
