// routes/notifications.js
const express = require("express");
const { authGuard, authGuardFromQuery } = require("../middleware/auth");
const { addClient, removeClient } = require("../utils/notificationStream");
const Notification = require("../models/Notification");

const router = express.Router();

/**
 * Get user notifications (paginated)
 */
router.get("/", authGuard, async (req, res, next) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;

    const query = { userId: req.user.id };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("fromUserId", "profile.name profile.avatarUrl")
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    // Support both formats for backward compatibility
    res.json({ 
      notifications, 
      data: notifications, // For NotificationsPage
      unreadCount 
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Get unread count only
 */
router.get("/unread-count", authGuard, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    res.json({ count });
  } catch (e) {
    next(e);
  }
});

/**
 * SSE stream for real-time notifications
 */
router.get("/stream", authGuardFromQuery, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addClient(req.user.id, req.user.role, res);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: {}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient(req.user.id, res);
  });
});

/**
 * Mark single notification as read
 */
router.patch("/:id/read", authGuard, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Mark all notifications as read
 */
router.patch("/mark-all-read", authGuard, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Delete a notification
 */
router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    await Notification.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
