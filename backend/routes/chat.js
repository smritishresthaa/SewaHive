const express = require("express");
const { authGuard } = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { chatImageUpload, chatVoiceUpload, chatVideoUpload } = require("../middleware/chatUpload");

const {
  ensureBookingForChat,
  getOrCreateConversationForBooking,
  getBookingChatHistory,
  sendBookingMessage,
  markBookingAsRead,
  buildPairKey,
  buildBlockState,
} = require("../utils/chatService");

const router = express.Router();

async function getConversationSummaryForUser({ booking, role }) {
  const conversation = await getOrCreateConversationForBooking(booking);
  const unreadCount =
    role === "client"
      ? Number(conversation.unreadByClient || 0)
      : Number(conversation.unreadByProvider || 0);

  return {
    conversation,
    unreadCount,
    peer:
      role === "client"
        ? {
            id: booking.providerId?._id,
            name: booking.providerId?.profile?.name || booking.providerId?.email || "Provider",
            avatarUrl: booking.providerId?.profile?.avatarUrl || null,
          }
        : {
            id: booking.clientId?._id,
            name: booking.clientId?.profile?.name || booking.clientId?.email || "Client",
            avatarUrl: booking.clientId?.profile?.avatarUrl || null,
          },
  };
}

router.post(
  "/booking/:bookingId/upload-video",
  authGuard,
  chatVideoUpload.single("video"),
  async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const { booking } = await ensureBookingForChat({ bookingId, user: req.user });

      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }

      const attachment = {
        url: req.file.path,
        publicId: req.file.filename || "",
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size || 0,
        width: null,
        height: null,
      };

      const { message } = await sendBookingMessage({
        booking,
        senderId: req.user.id,
        text: "",
        type: "video",
        attachment,
      });

      try {
        const { getIO } = require("../utils/socket");
        const io = getIO();
        if (io) io.to(`booking:${booking._id}`).emit("new_message", message);
      } catch (_) {}

      res.status(201).json({ message });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/conversations", authGuard, async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const role = req.user.role;

    if (!["client", "provider"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const query = role === "client" ? { clientId: userId } : { providerId: userId };

    const rawConversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 })
      .populate({
        path: "bookingId",
        select: "_id status scheduledAt requestedAt serviceId clientId providerId",
        populate: [
          { path: "serviceId", select: "title" },
          { path: "clientId", select: "profile email" },
          { path: "providerId", select: "profile email" },
        ],
      })
      .lean();

    const dedupedByPair = new Map();

    for (const conversation of rawConversations) {
      const pairKey =
        conversation.pairKey ||
        buildPairKey(conversation.clientId, conversation.providerId);

      const existing = dedupedByPair.get(pairKey);
      if (!existing) {
        dedupedByPair.set(pairKey, {
          ...conversation,
          unreadByClient: Number(conversation.unreadByClient || 0),
          unreadByProvider: Number(conversation.unreadByProvider || 0),
        });
        continue;
      }

      existing.unreadByClient += Number(conversation.unreadByClient || 0);
      existing.unreadByProvider += Number(conversation.unreadByProvider || 0);

      const existingLast = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
      const currentLast = conversation.lastMessageAt ? new Date(conversation.lastMessageAt).getTime() : 0;

      if (currentLast > existingLast) {
        existing.lastMessageAt = conversation.lastMessageAt;
        existing.lastMessageText = conversation.lastMessageText;
        existing.bookingId = conversation.bookingId;
        existing.updatedAt = conversation.updatedAt;
      }

      if (!existing.blockedBy && conversation.blockedBy) {
        existing.blockedBy = conversation.blockedBy;
        existing.blockedAt = conversation.blockedAt;
      }
    }

    const data = Array.from(dedupedByPair.values())
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((conversation) => {
        const booking = conversation.bookingId || {};
        const unreadCount =
          role === "client"
            ? Number(conversation.unreadByClient || 0)
            : Number(conversation.unreadByProvider || 0);

        const block = buildBlockState(conversation, userId);
        const resolvedBookingId = booking?._id || conversation.bookingId;

        return {
          _id: conversation._id,
          conversationId: conversation._id,
          pairKey: conversation.pairKey,
          bookingId: resolvedBookingId,
          bookingStatus: booking?.status || "unknown",
          serviceTitle: booking?.serviceId?.title || "Service",
          peer:
            role === "client"
              ? {
                  id: booking?.providerId?._id || conversation.providerId,
                  name: booking?.providerId?.profile?.name || booking?.providerId?.email || "Provider",
                  avatarUrl: booking?.providerId?.profile?.avatarUrl || null,
                }
              : {
                  id: booking?.clientId?._id || conversation.clientId,
                  name: booking?.clientId?.profile?.name || booking?.clientId?.email || "Client",
                  avatarUrl: booking?.clientId?.profile?.avatarUrl || null,
                },
          lastMessageAt: conversation.lastMessageAt,
          lastMessageText: conversation.lastMessageText,
          unreadCount,
          blocked: block,
          route:
            role === "client"
              ? `/client/bookings/${resolvedBookingId}/chat`
              : `/provider/bookings/${resolvedBookingId}/chat`,
        };
      });

    res.json({ conversations: data });
  } catch (e) {
    next(e);
  }
});

router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { before, limit = 30 } = req.query;

    const { booking, participantRole } = await ensureBookingForChat({
      bookingId,
      user: req.user,
    });

    const conversation = await getOrCreateConversationForBooking(booking);
    const history = await getBookingChatHistory({
      booking,
      before,
      limit,
    });

    const unreadCount =
      participantRole === "client"
        ? Number(conversation.unreadByClient || 0)
        : Number(conversation.unreadByProvider || 0);

    res.json({
      conversation: {
        ...conversation.toObject(),
        block: buildBlockState(conversation, req.user.id),
      },
      booking: {
        _id: booking._id,
        status: booking.status,
        serviceTitle: booking.serviceId?.title || "Service",
        clientId: booking.clientId?._id || booking.clientId,
        providerId: booking.providerId?._id || booking.providerId,
      },
      messages: history.messages,
      pagination: {
        hasMore: history.hasMore,
        nextBefore: history.nextBefore,
      },
      unreadCount,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/booking/:bookingId/block", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { booking } = await ensureBookingForChat({ bookingId, user: req.user });
    const conversation = await getOrCreateConversationForBooking(booking);

    conversation.blockedBy = req.user.id;
    conversation.blockedAt = new Date();
    await conversation.save();

    res.json({
      success: true,
      block: buildBlockState(conversation, req.user.id),
      message: "Chat blocked. Existing history remains visible, but new messages are disabled until you unblock.",
    });
  } catch (e) {
    next(e);
  }
});

router.delete("/booking/:bookingId/block", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { booking } = await ensureBookingForChat({ bookingId, user: req.user });
    const conversation = await getOrCreateConversationForBooking(booking);

    if (conversation.blockedBy && String(conversation.blockedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only the user who blocked the chat can unblock it" });
    }

    conversation.blockedBy = null;
    conversation.blockedAt = null;
    await conversation.save();

    res.json({
      success: true,
      block: buildBlockState(conversation, req.user.id),
      message: "Chat unblocked",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/booking/:bookingId/message", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { text, type, attachment } = req.body;

    const { booking } = await ensureBookingForChat({
      bookingId,
      user: req.user,
    });

    const { message, conversation } = await sendBookingMessage({
      booking,
      senderId: req.user.id,
      text,
      type: type || "text",
      attachment: attachment || null,
    });

    let emitted = false;
    try {
      const { getIO } = require("../utils/socket");
      const io = getIO();
      if (io) {
        io.to(`booking:${booking._id}`).emit("new_message", message);
        emitted = true;
      }
    } catch (_) {}

    res.status(201).json({ message, emitted, block: buildBlockState(conversation, req.user.id) });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/booking/:bookingId/upload-image",
  authGuard,
  chatImageUpload.single("image"),
  async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const { booking } = await ensureBookingForChat({ bookingId, user: req.user });

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const attachment = {
        url: req.file.path,
        publicId: req.file.filename || "",
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size || 0,
        width: null,
        height: null,
      };

      const { message } = await sendBookingMessage({
        booking,
        senderId: req.user.id,
        text: "",
        type: "image",
        attachment,
      });

      try {
        const { getIO } = require("../utils/socket");
        const io = getIO();
        if (io) io.to(`booking:${booking._id}`).emit("new_message", message);
      } catch (_) {}

      res.status(201).json({ message });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/booking/:bookingId/upload-voice",
  authGuard,
  chatVoiceUpload.single("voice"),
  async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const { booking } = await ensureBookingForChat({ bookingId, user: req.user });

      if (!req.file) {
        return res.status(400).json({ message: "No voice file provided" });
      }

      let durationSec = null;
      if (req.body.durationSec) {
        durationSec = Math.min(Number(req.body.durationSec) || 0, 120);
      }

      const attachment = {
        url: req.file.path,
        publicId: req.file.filename || "",
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size || 0,
        durationSec,
      };

      const { message } = await sendBookingMessage({
        booking,
        senderId: req.user.id,
        text: "",
        type: "voice",
        attachment,
      });

      try {
        const { getIO } = require("../utils/socket");
        const io = getIO();
        if (io) io.to(`booking:${booking._id}`).emit("new_message", message);
      } catch (_) {}

      res.status(201).json({ message });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/booking/:bookingId/read", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const { booking, participantRole } = await ensureBookingForChat({
      bookingId,
      user: req.user,
    });

    const readResult = await markBookingAsRead({
      booking,
      userId: req.user.id,
      participantRole,
    });

    try {
      const { getIO } = require("../utils/socket");
      const io = getIO();
      if (io) {
        io.to(`booking:${booking._id}`).emit("messages_read", {
          bookingId: String(booking._id),
          userId: String(req.user.id),
          readAt: new Date().toISOString(),
        });
      }
    } catch (_) {}

    res.json({ ok: true, updatedCount: readResult.updatedCount });
  } catch (e) {
    next(e);
  }
});

router.post("/booking/:bookingId/read-notifications", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { booking } = await ensureBookingForChat({ bookingId, user: req.user });

    const result = await Notification.updateMany(
      {
        userId: req.user.id,
        type: "chat_message",
        bookingId: booking._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({ ok: true, updatedCount: Number(result.modifiedCount || 0) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
