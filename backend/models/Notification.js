const { Schema, model } = require("mongoose");

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    category: {
      type: String,
      enum: [
        "booking",
        "payment",
        "review",
        "dispute",
        "verification",
        "system",
        "admin",
      ],
      default: "booking",
    },

    type: {
      type: String,
      enum: [
        // Booking events
        "booking_request",
        "booking_accepted",
        "booking_confirmed",
        "booking_started",
        "booking_completed",
        "booking_cancelled",
        "booking_rejected",
        "booking_expired",
        "booking_rescheduled",
        "booking_reminder",
        "booking_no_show",
        "provider_en_route",
        "provider_completed_service",
        "service_completed",

        // Quote workflow
        "quote_requested",
        "quote_sent",
        "quote_pending_review",
        "quote_approved",
        "quote_rejected",
        "quote_accepted",

        // Adjusted quote workflow
        "adjusted_quote_proposed",
        "adjusted_quote_accepted",
        "adjusted_quote_rejected",

        // Payment events
        "payment_received",
        "payment_failed",
        "payment_held",
        "payment_released",
        "payment_confirmed",
        "refund_processed",
        "refund_failed",
        "payment_refunded",
        "refund_request",

        // Review events
        "review_received",

        // Dispute events
        "dispute_opened",
        "dispute_info_requested",
        "dispute_resolved",
        "chat_message",

        // Verification events
        "verification_submitted",
        "verification_approved",
        "verification_rejected",
        "verification_needs_correction",
        "verification_under_review",

        // Account events
        "account_update",

        // System
        "system_message",
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    disputeId: { type: Schema.Types.ObjectId, ref: "Dispute" },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review" },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User" },

    targetRoute: {
      type: String,
      default: "/dashboard",
    },
    targetRouteParams: { type: Schema.Types.Mixed },

    metadata: { type: Schema.Types.Mixed },

    isRead: { type: Boolean, default: false },
    readAt: Date,

    emailSent: { type: Boolean, default: false },
    smsSent: { type: Boolean, default: false },
    pushSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ bookingId: 1 });
NotificationSchema.index({ disputeId: 1 });
NotificationSchema.index({ userId: 1, type: 1 });

module.exports = model("Notification", NotificationSchema);