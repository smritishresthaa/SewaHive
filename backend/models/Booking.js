// models/Booking.js
const { Schema, model } = require("mongoose");

const BookingSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },

    // BOOKING TYPE
    type: {
      type: String,
      enum: ["normal", "emergency"],
      default: "normal",
    },

    // BOOKING SCHEDULE
    scheduledAt: { type: Date },
    schedule: {
      date: Date,
      slot: String,
    },

    // BOOKING LOCATION
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },

    // ADDRESS TEXT & LANDMARK
    addressText: { type: String, default: "" },
    landmark: { type: String, default: "" },

    // SERVICE ADDRESS
    address: {
      country: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      area: { type: String, default: "" },
    },

    // DISTANCE FROM PROVIDER TO CLIENT
    distanceKm: { type: Number },

    // PROVIDER LIVE LOCATION
    providerLiveLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // NOTES
    notes: { type: String, default: "" },

    // TIME TRACKING
    timeTracking: {
      totalSeconds: { type: Number, default: 0 },
      isTimerRunning: { type: Boolean, default: false },
      timerStartedAt: { type: Date },
      timerSessions: [
        {
          startedAt: Date,
          pausedAt: Date,
          durationSeconds: Number,
        },
      ],
    },

    // QUOTE SYSTEM
    quote: {
      status: {
        type: String,
        enum: [
          "none",
          "requested",
          "sent",
          "pending_admin_review",
          "approved",
          "accepted",
          "rejected",
        ],
        default: "none",
      },
      quotedPrice: Number,
      approvedPrice: Number,
      quoteMessage: String,
      createdAt: Date,
      sentAt: Date,
      approvedAt: Date,
      rejectedAt: Date,
      adminComment: String,
      rejectionReason: String,
    },

    // PRICING WORKFLOW SNAPSHOT
    pricing: {
      mode: {
        type: String,
        enum: ["fixed", "range", "quote_required", "FIXED", "RANGE", "QUOTE"],
        default: "FIXED",
      },
      priceLabel: { type: String, default: "Fixed Price" },
      basePrice: { type: Number, default: 0 },
      basePriceAtBooking: { type: Number, default: 0 },
      includedHours: { type: Number, default: 0 },
      hourlyRate: { type: Number, default: 0 },
      extraTimeCost: { type: Number, default: 0 },
      approvedExtraTimeCost: { type: Number, default: 0 },
      approvedAdjustmentsTotal: { type: Number, default: 0 },
      rangeMin: { type: Number, default: 0 },
      rangeMax: { type: Number, default: 0 },
      finalApprovedPrice: { type: Number, default: 0 },
      finalPrice: { type: Number, default: 0 },
      escrowHeldAmount: { type: Number, default: 0 },
      additionalEscrowRequired: { type: Number, default: 0 },

      adjustment: {
        status: {
          type: String,
          enum: ["none", "pending_client_approval", "accepted", "rejected"],
          default: "none",
        },
        proposedPrice: Number,
        basePrice: Number,
        extraTimeCost: Number,
        adjustedQuoteReason: String,
        reason: String,
        attachments: [
          {
            url: String,
            originalName: String,
            size: Number,
            mimeType: String,
          },
        ],
        proposedBy: { type: Schema.Types.ObjectId, ref: "User" },
        proposedAt: Date,
        clientDecisionAt: Date,
      },

      adjustmentHistory: [
        {
          proposedPrice: Number,
          basePrice: Number,
          extraTimeCost: Number,
          adjustedQuoteReason: String,
          reason: String,
          attachments: [
            {
              url: String,
              originalName: String,
              size: Number,
              mimeType: String,
            },
          ],
          proposedBy: { type: Schema.Types.ObjectId, ref: "User" },
          proposedAt: Date,
          status: {
            type: String,
            enum: ["pending_client_approval", "accepted", "rejected"],
          },
          decidedAt: Date,
        },
      ],

      maxRangeExceeded: { type: Boolean, default: false },
      requiresAdminReview: { type: Boolean, default: false },
      adminReviewReason: String,

      paymentAuditTrail: [
        {
          event: {
            type: String,
            enum: [
              "escrow_released",
              "escrow_adjusted",
              "escrow_frozen_on_dispute",
              "escrow_refunded",
              "escrow_refund_failed",
            ],
          },
          amount: Number,
          finalPayment: Number,
          approvedAdjustmentsTotal: Number,
          approvedExtraTimeCost: Number,
          actorId: { type: Schema.Types.ObjectId, ref: "User" },
          at: Date,
          note: String,
        },
      ],
    },

    // BOOKING PRICE / PAYMENT
    price: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    emergencyFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "initiated",
        "funds_held",
        "released",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
    },

    paymentRef: String,

    // ESCROW SPECIFIC
    clientConfirmedAt: Date,

    // BOOKING STATUS
    status: {
      type: String,
      enum: [
        "pending_payment",
        "requested",
        "rejected",

        "quote_requested",
        "quote_sent",
        "quote_pending_admin_review",
        "quote_rejected",
        "quote_accepted",

        "accepted",
        "confirmed",
        "provider_en_route",
        "in-progress",

        "provider_completed",
        "awaiting_client_confirmation",
        "pending-completion",

        "completed",

        "resolved_refunded",

        "cancelled",
        "expired",
        "no-show",
        "disputed",
      ],
      default: "pending_payment",
      index: true,
    },

    // TIMELINE FIELDS
    requestedAt: Date,
    acceptedAt: Date,
    confirmedAt: Date,
    enRouteAt: Date,
    startedAt: Date,
    providerCompletedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    expiredAt: Date,

    // CANCELLATION DETAILS
    cancellation: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      adminActionBy: { type: Schema.Types.ObjectId, ref: "User" },
      source: {
        type: String,
        enum: ["client", "provider", "admin", "system"],
        default: "client",
      },
      affectedParty: {
        type: String,
        enum: ["client", "provider", "both", "none"],
        default: "none",
      },
      reason: String,
      note: String,
      cancelledAt: Date,
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: [
          "none",
          "pending",
          "processed",
          "refunded",
          "partially_refunded",
          "not_required",
          "failed",
        ],
        default: "none",
      },
    },

    // EMERGENCY BOOKING DETAILS
    emergency: {
      acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
      respondedProviders: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },

    // REVIEW
    reviewId: { type: Schema.Types.ObjectId, ref: "Review" },

    // DISPUTES
    disputeId: { type: Schema.Types.ObjectId, ref: "Dispute" },

    // OPTIONAL SAFETY FEATURE
    otp: String,

    // REMINDER TRACKING
    reminders: {
      confirmationSent: { type: Boolean, default: false },
      oneHourSent: { type: Boolean, default: false },
      oneDaySent: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

BookingSchema.index({ location: "2dsphere" });
BookingSchema.index({ clientId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ providerId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, "quote.status": 1 });

module.exports = model("Booking", BookingSchema);