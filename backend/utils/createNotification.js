// utils/createNotification.js
const Notification = require("../models/Notification");
const { sendEmail, sendSMS } = require("./notifications");
const User = require("../models/User");

/**
 * Determine the target route based on notification type and context
 * This enables deep-linking: click notification -> open correct page
 */
function getTargetRoute(type, targetId) {
  const routes = {
    // Booking notifications
    booking_request: {
      route: "/provider/bookings",
      params: { bookingId: targetId, tab: "requests" },
    },
    booking_accepted: {
      route: "/client/bookings/history",
      params: { bookingId: targetId, tab: "active" },
    },
    booking_confirmed: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    booking_started: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    booking_completed: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    provider_completed_service: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    service_completed: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    booking_cancelled: {
      route: "/client/bookings/history",
      params: { bookingId: targetId },
    },

    // Quote notifications
    quote_requested: {
      route: "/provider/bookings",
      params: { bookingId: targetId, tab: "quotes" },
    },
    quote_sent: {
      route: "/client/bookings/history",
      params: { bookingId: targetId, tab: "quotes" },
    },
    quote_approved: {
      route: "/provider/bookings",
      params: { bookingId: targetId },
    },
    quote_rejected: {
      route: "/provider/bookings",
      params: { bookingId: targetId },
    },

    // Payment notifications
    payment_received: {
      route: "/provider/earnings",
      params: {},
    },
    payment_failed: {
      route: "/bookings/:bookingId",
      params: { bookingId: targetId },
    },
    payment_held: {
      route: "/client/bookings/history",
      params: { bookingId: targetId },
    },
    payment_released: {
      route: "/provider/earnings",
      params: { bookingId: targetId },
    },
    refund_processed: {
      route: "/client/bookings/history",
      params: { bookingId: targetId },
    },
    payment_refunded: {
      route: "/client/bookings/history",
      params: { bookingId: targetId },
    },

    // Review notifications
    review_received: {
      route: "/provider/reviews",
      params: {},
    },

    // Chat notifications
    chat_message: {
      route: "/chat/booking/:bookingId",
      params: { bookingId: targetId },
    },

    // Dispute notifications
    dispute_opened: {
      route: "/disputes/:disputeId",
      params: { disputeId: targetId },
    },
    dispute_info_requested: {
      route: "/disputes/:disputeId",
      params: { disputeId: targetId },
    },
    dispute_resolved: {
      route: "/disputes/:disputeId",
      params: { disputeId: targetId },
    },

    // Verification notifications
    verification_submitted: {
      route: "/admin/verification",
      params: {},
    },
    verification_approved: {
      route: "/provider/profile",
      params: { tab: "verification" },
    },
    verification_rejected: {
      route: "/provider/profile",
      params: { tab: "verification" },
    },
    verification_needs_correction: {
      route: "/provider/verification",
      params: {},
    },
    verification_under_review: {
      route: "/provider/verification",
      params: {},
    },

    // Default
    system_message: {
      route: "/dashboard",
      params: {},
    },
  };

  return routes[type] || { route: "/dashboard", params: {} };
}

function buildSmsMessage({ type, title, message, metadata = {} }) {
  const isEmergency = Boolean(metadata?.isEmergency);

  if (isEmergency && type === "booking_request") {
    return "SewaHive emergency alert: You have a new emergency booking request. Open the app now.";
  }

  if (isEmergency && type === "quote_requested") {
    return "SewaHive emergency alert: A client requested an emergency quote. Open the app now.";
  }

  if (isEmergency && type === "booking_accepted") {
    return "SewaHive update: Your emergency booking has been accepted by the provider. Open the app for details.";
  }

  const compact = `${title}: ${message}`.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

/**
 * Create an in-app notification and optionally send email/SMS
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  category = "booking",
  bookingId,
  disputeId,
  fromUserId,
  metadata = {},
  sendEmail: shouldSendEmail = false,
  sendSMS: shouldSendSMS = false,
  targetRoute,
  targetRouteParams,
}) {
  try {
    const targetId = bookingId || disputeId;
    const routeConfig = getTargetRoute(type, targetId);

    const finalRoute = targetRoute || routeConfig.route;
    const finalParams = targetRouteParams || routeConfig.params;

    const notification = await Notification.create({
      userId,
      category,
      type,
      title,
      message,
      bookingId,
      disputeId,
      fromUserId,
      metadata,
      targetRoute: finalRoute,
      targetRouteParams: finalParams,
      isRead: false,
    });

    const { emitToUser } = require("./notificationStream");
    emitToUser(String(userId), {
      event: "notification",
      notification,
    });

    const user = await User.findById(userId);
    if (!user) return notification;

    if (
      user.role === "provider" &&
      user.providerDetails &&
      user.providerDetails.notificationsEnabled === false
    ) {
      return notification;
    }

    // EMAIL
    if (shouldSendEmail && user.email) {
      try {
        const appLink = `${process.env.CLIENT_URL}${finalRoute}`;

        await sendEmail(
          user.email,
          title,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">${title}</h2>
              <p style="font-size: 16px; color: #333;">${message}</p>
              <p style="margin-top: 20px;">
                <a href="${appLink}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Details
                </a>
              </p>
            </div>
          `
        );

        notification.emailSent = true;
        await notification.save();
      } catch (err) {
        console.error("Failed to send email notification:", err);
      }
    }

    // SMS
    if (shouldSendSMS && user.phone) {
      try {
        const smsMessage = buildSmsMessage({
          type,
          title,
          message,
          metadata,
        });

        const smsResult = await sendSMS(user.phone, smsMessage, {
          userId: user._id,
          bookingId,
          emergency: metadata?.isEmergency,
          mockMode: process.env.SMS_MOCK_MODE === "true",
        });

        notification.smsSent = Boolean(smsResult?.ok);
        await notification.save();
      } catch (err) {
        console.error("Failed to send SMS notification:", err);
      }
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Notify all admin users
 */
async function notifyAllAdmins({
  type,
  title,
  message,
  category = "admin",
  bookingId,
  disputeId,
  fromUserId,
  metadata = {},
  targetRoute,
  targetRouteParams,
}) {
  try {
    const adminUsers = await User.find({ role: "admin" }).select("_id");

    if (adminUsers.length === 0) {
      console.log("No admin users found to notify");
      return [];
    }

    const notifications = await Promise.all(
      adminUsers.map((admin) =>
        createNotification({
          userId: admin._id,
          type,
          title,
          message,
          category,
          bookingId,
          disputeId,
          fromUserId,
          metadata,
          targetRoute,
          targetRouteParams,
          sendEmail: false,
          sendSMS: false,
        })
      )
    );

    const { broadcastToRole } = require("./notificationStream");
    broadcastToRole("admin", {
      event: "notification",
      notification: notifications[0],
    });

    return notifications;
  } catch (error) {
    console.error("Error notifying admins:", error);
    throw error;
  }
}

module.exports = {
  createNotification,
  createNotificationForUser: createNotification,
  notifyAllAdmins,
};