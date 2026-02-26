const express = require("express");
const { authGuard } = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const { chatImageUpload, chatVoiceUpload } = require("../middleware/chatUpload");
const {
  ensureBookingForChat,
  getOrCreateConversationForBooking,
  getBookingChatHistory,
  sendBookingMessage,
  markBookingAsRead,
} = require("../utils/chatService");

const router = express.Router();

router.get("/conversations", authGuard, async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const role = req.user.role;

    if (!["client", "provider"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const query = role === "client" ? { clientId: userId } : { providerId: userId };

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
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

    const data = conversations
      .filter((conversation) => Boolean(conversation.bookingId))
      .map((conversation) => {
        const booking = conversation.bookingId;
        const unreadCount = role === "client"
          ? Number(conversation.unreadByClient || 0)
          : Number(conversation.unreadByProvider || 0);

        return {
          _id: conversation._id,
          bookingId: booking._id,
          bookingStatus: booking.status,
          serviceTitle: booking.serviceId?.title || "Service",
          peer:
            role === "client"
              ? {
                  id: booking.providerId?._id,
                  name: booking.providerId?.profile?.name || booking.providerId?.email || "Provider",
                }
              : {
                  id: booking.clientId?._id,
                  name: booking.clientId?.profile?.name || booking.clientId?.email || "Client",
                },
          lastMessageAt: conversation.lastMessageAt,
          lastMessageText: conversation.lastMessageText,
          unreadCount,
          route:
            role === "client"
              ? `/client/bookings/${booking._id}/chat`
              : `/provider/bookings/${booking._id}/chat`,
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
      bookingId: booking._id,
      before,
      limit,
    });

    const unreadCount =
      participantRole === "client"
        ? Number(conversation.unreadByClient || 0)
        : Number(conversation.unreadByProvider || 0);

    res.json({
      conversation,
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

router.post("/booking/:bookingId/message", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { text, type, attachment } = req.body;

    const { booking } = await ensureBookingForChat({
      bookingId,
      user: req.user,
    });

    const { message } = await sendBookingMessage({
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
        const room = `booking:${booking._id}`;
        io.to(room).emit("new_message", message);
        emitted = true;
      }
    } catch (socketErr) {
      emitted = false;
    }

    res.status(201).json({ message, emitted });
  } catch (e) {
    next(e);
  }
});

// ─── Image Upload ──────────────────────────────────────
router.post(
  "/booking/:bookingId/upload-image",
  authGuard,
  chatImageUpload.single("image"),
  async (req, res, next) => {
    try {
      const { bookingId } = req.params;

      // Verify booking participant
      const { booking } = await ensureBookingForChat({
        bookingId,
        user: req.user,
      });

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log(`[ChatUpload] Image uploaded by user ${req.user.id} for booking ${bookingId}`);

      const attachment = {
        url: req.file.path,
        publicId: req.file.filename || "",
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size || 0,
        width: null,
        height: null,
      };

      // Send as message
      const { message } = await sendBookingMessage({
        booking,
        senderId: req.user.id,
        text: "",
        type: "image",
        attachment,
      });

      // Emit via socket
      try {
        const { getIO } = require("../utils/socket");
        const io = getIO();
        if (io) {
          io.to(`booking:${booking._id}`).emit("new_message", message);
        }
      } catch (_) {}

      res.status(201).json({ message });
    } catch (e) {
      next(e);
    }
  }
);

// ─── Voice Upload ──────────────────────────────────────
router.post(
  "/booking/:bookingId/upload-voice",
  authGuard,
  chatVoiceUpload.single("voice"),
  async (req, res, next) => {
    try {
      const { bookingId } = req.params;

      const { booking } = await ensureBookingForChat({
        bookingId,
        user: req.user,
      });

      if (!req.file) {
        return res.status(400).json({ message: "No voice file provided" });
      }

      // Parse optional duration from client
      let durationSec = null;
      if (req.body.durationSec) {
        durationSec = Math.min(Number(req.body.durationSec) || 0, 120);
      }

      console.log(`[ChatUpload] Voice uploaded by user ${req.user.id} for booking ${bookingId}, duration: ${durationSec}s`);

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
        if (io) {
          io.to(`booking:${booking._id}`).emit("new_message", message);
        }
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
        const room = `booking:${booking._id}`;
        io.to(room).emit("messages_read", {
          bookingId: String(booking._id),
          userId: String(req.user.id),
          readAt: new Date().toISOString(),
        });
      }
    } catch (socketErr) {
      // no-op
    }

    res.json({
      ok: true,
      updatedCount: readResult.updatedCount,
    });
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
