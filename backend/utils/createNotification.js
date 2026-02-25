// utils/createNotification.js
const Notification = require("../models/Notification");
const { sendEmail, sendSMS } = require("./notifications");
const User = require("../models/User");

/**
 * Determine the target route based on notification type and context
 * This enables deep-linking: click notification → open correct page
 */
function getTargetRoute(type, targetId) {
  const routes = {
    // Booking notifications
    'booking_request': { route: '/provider/bookings', params: { bookingId: targetId, tab: 'requests' } },
    'booking_accepted': { route: '/client/bookings/history', params: { bookingId: targetId, tab: 'active' } },
    'booking_confirmed': { route: '/bookings/:bookingId', params: { bookingId: targetId } },
    'booking_started': { route: '/bookings/:bookingId', params: { bookingId: targetId } },
    'booking_completed': { route: '/bookings/:bookingId', params: { bookingId: targetId } },
    'booking_cancelled': { route: '/client/bookings/history', params: { bookingId: targetId } },
    
    // Quote notifications
    'quote_requested': { route: '/provider/bookings', params: { bookingId: targetId, tab: 'quotes' } },
    'quote_sent': { route: '/client/bookings/history', params: { bookingId: targetId, tab: 'quotes' } },
    'quote_approved': { route: '/provider/bookings', params: { bookingId: targetId } },
    'quote_rejected': { route: '/provider/bookings', params: { bookingId: targetId } },
    
    // Payment notifications
    'payment_received': { route: '/provider/earnings', params: {} },
    'payment_failed': { route: '/bookings/:bookingId', params: { bookingId: targetId } },
    
    // Review notifications
    'review_received': { route: '/provider/reviews', params: {} },

    // Chat notifications
    'chat_message': { route: '/chat/booking/:bookingId', params: { bookingId: targetId } },
    
    // Dispute notifications
    'dispute_created': { route: '/disputes/:disputeId', params: { disputeId: targetId } },
    'dispute_resolved': { route: '/disputes/:disputeId', params: { disputeId: targetId } },
    
    // Verification notifications
    'verification_submitted': { route: '/admin/verification', params: {} },
    'verification_approved': { route: '/provider/profile', params: { tab: 'verification' } },
    'verification_rejected': { route: '/provider/profile', params: { tab: 'verification' } },
    'verification_needs_correction': { route: '/provider/verification', params: {} },
    'verification_under_review': { route: '/provider/verification', params: {} },
    
    // Default
    'system_message': { route: '/dashboard', params: {} },
  };

  return routes[type] || { route: '/dashboard', params: {} };
}

/**
 * Create an in-app notification and optionally send email/SMS
 * @param {Object} options - Notification options
 * @param {String} options.userId - Recipient user ID
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.category - Category (booking, payment, review, etc)
 * @param {String} options.bookingId - Related booking ID (optional)
 * @param {String} options.disputeId - Related dispute ID (optional)
 * @param {String} options.fromUserId - Sender user ID (optional)
 * @param {Object} options.metadata - Additional data (optional)
 * @param {Boolean} options.sendEmail - Whether to send email (default: false)
 * @param {Boolean} options.sendSMS - Whether to send SMS (default: false)
 * @param {String} options.targetRoute - Override the default target route (optional)
 * @param {Object} options.targetRouteParams - Override target route params (optional)
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
    // Determine target route for deep-linking
    const targetId = bookingId || disputeId;
    const routeConfig = getTargetRoute(type, targetId);
    
    const finalRoute = targetRoute || routeConfig.route;
    const finalParams = targetRouteParams || routeConfig.params;

    // Create in-app notification
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

    // Get user details for email/SMS
    const user = await User.findById(userId);
    if (!user) return notification;

    // Check if user has notifications enabled
    if (user.role === "provider" && !user.providerDetails?.notificationsEnabled) {
      return notification; // Skip email/SMS if notifications disabled
    }

    // Send email if requested and user has email
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
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated notification from SewaHive. If you wish to stop receiving these emails, update your notification preferences in Settings.
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

    // Send SMS if requested and user has phone
    if (shouldSendSMS && user.phone) {
      try {
        const smsMessage = `${title}: ${message}`;
        await sendSMS(user.phone, smsMessage);

        notification.smsSent = true;
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
 * Notify all admin users about an important event
 * @param {Object} options - Notification options
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.category - Category (default: 'admin')
 * @param {String} options.bookingId - Related booking ID (optional)
 * @param {String} options.disputeId - Related dispute ID (optional)
 * @param {String} options.fromUserId - Sender user ID (optional)
 * @param {Object} options.metadata - Additional data (optional)
 * @param {String} options.targetRoute - Target route for admins (optional)
 * @param {Object} options.targetRouteParams - Target route params (optional)
 */
async function notifyAllAdmins({
  type,
  title,
  message,
  category = 'admin',
  bookingId,
  disputeId,
  fromUserId,
  metadata = {},
  targetRoute,
  targetRouteParams,
}) {
  try {
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    
    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return [];
    }

    // Create notifications for all admins
    const notifications = await Promise.all(
      adminUsers.map(admin => 
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
          sendEmail: false, // Don't spam admin emails
          sendSMS: false,
        })
      )
    );

    // Also broadcast to all connected admin SSE streams
    const { broadcastToRole } = require('./notificationStream');
    broadcastToRole('admin', {
      event: 'notification',
      notification: notifications[0], // Send one as template
    });

    return notifications;
  } catch (error) {
    console.error('Error notifying admins:', error);
    throw error;
  }
}

module.exports = { createNotification, createNotificationForUser: createNotification, notifyAllAdmins };
