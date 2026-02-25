// models/Booking.js
const { Schema, model } = require('mongoose');

const BookingSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

    // BOOKING TYPE
    type: {
      type: String,
      enum: ['normal', 'emergency'],
      default: 'normal',
    },

    // BOOKING SCHEDULE
    scheduledAt: { type: Date }, // For normal bookings when confirmed
    schedule: {
      date: Date,
      slot: String,
    },

    // BOOKING LOCATION (GeoJSON for geographic queries)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },

    // ADDRESS TEXT & LANDMARK (human-readable)
    addressText: { type: String, default: '' }, // Full address string
    landmark: { type: String, default: '' }, // "near Bhatbhateni", etc.

    // SERVICE ADDRESS (structured)
    address: {
      country: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      area: { type: String, default: '' },
    },

    // DISTANCE FROM PROVIDER TO CLIENT
    distanceKm: { type: Number },

    // NOTES
    notes: { type: String, default: '' },

    // TIME TRACKING (seconds precision)
    timeTracking: {
      totalSeconds: { type: Number, default: 0 }, // Total seconds worked
      isTimerRunning: { type: Boolean, default: false },
      timerStartedAt: { type: Date }, // When current session started
      timerSessions: [ // History of work sessions
        {
          startedAt: Date,
          pausedAt: Date,
          durationSeconds: Number,
        }
      ],
    },

    // QUOTE SYSTEM (for uncertain jobs)
    quote: {
      status: {
        type: String,
        enum: ['none', 'requested', 'sent', 'pending_admin_review', 'approved', 'accepted', 'rejected'],
        default: 'none',
      },
      quotedPrice: Number, // Price quoted by provider
      approvedPrice: Number, // Price approved by admin
      quoteMessage: String, // Provider's explanation
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
        enum: ['fixed', 'range', 'quote_required', 'FIXED', 'RANGE', 'QUOTE'],
        default: 'FIXED',
      },
      priceLabel: { type: String, default: 'Fixed Price' },
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
          enum: ['none', 'pending_client_approval', 'accepted', 'rejected'],
          default: 'none',
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
        proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
          proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          proposedAt: Date,
          status: {
            type: String,
            enum: ['pending_client_approval', 'accepted', 'rejected'],
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
            enum: ['escrow_released', 'escrow_adjusted', 'escrow_frozen_on_dispute'],
          },
          amount: Number,
          finalPayment: Number,
          approvedAdjustmentsTotal: Number,
          approvedExtraTimeCost: Number,
          actorId: { type: Schema.Types.ObjectId, ref: 'User' },
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
        'pending',           // Not yet paid
        'initiated',         // Payment in progress
        'funds_held',        // Escrow: funds held for service
        'released',          // Escrow: funds released to provider
        'failed',            // Payment failed
        'refunded',          // Full refund issued
        'partially_refunded' // Partial refund (dispute resolved)
      ],
      default: 'pending',
    },

    paymentRef: String, // Khalti/eSewa token

    // ESCROW SPECIFIC (Confirmation timestamp)
    clientConfirmedAt: Date, // When client confirmed service completion

    // BOOKING STATUS (expanded with quote states)
    status: {
      type: String,
      enum: [
        // Payment states
        'pending_payment',              // Booking created, awaiting payment
        
        // Initial states
        'requested',
        'rejected',
        
        // Quote workflow
        'quote_requested',
        'quote_sent',
        'quote_pending_admin_review',
        'quote_rejected',
        'quote_accepted',
        
        // Confirmed workflow
        'accepted',
        'confirmed',
        'in-progress',
        
        // Escrow-specific states
        'provider_completed',           // Provider marked complete, awaiting client confirmation
        'awaiting_client_confirmation', // Explicitly waiting for client to confirm/dispute
        'pending-completion',           // Alias for awaiting_client_confirmation (UI-friendly)
        
        'completed',                    // Service completed + client confirmed/payment released

        // Dispute resolution states
        'resolved_refunded',            // Dispute resolved with refund outcome
        
        // Terminal states
        'cancelled',
        'no-show',
        'disputed',
      ],
      default: 'pending_payment',
      index: true,
    },

    // TIMELINE FIELDS
    requestedAt: Date,
    acceptedAt: Date,
    confirmedAt: Date,
    startedAt: Date,
    providerCompletedAt: Date, // When provider marks as complete
    completedAt: Date, // When client confirms completion
    cancelledAt: Date,

    // CANCELLATION DETAILS
    cancellation: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      cancelledAt: Date,
    },

    // EMERGENCY BOOKING DETAILS
    emergency: {
      acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      respondedProviders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    // REVIEW
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },

    // DISPUTES
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute' },

    // OPTIONAL SAFETY FEATURE
    otp: String,

    // PHASE 2B: REMINDER TRACKING
    reminders: {
      confirmationSent: { type: Boolean, default: false }, // Sent after booking confirmed
      oneHourSent: { type: Boolean, default: false },      // Sent 1 hour before scheduledAt
      oneDaySent: { type: Boolean, default: false },       // Sent 24 hours before scheduledAt
    },
  },
  { timestamps: true }
);

BookingSchema.index({ location: '2dsphere' });
BookingSchema.index({ clientId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ providerId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, 'quote.status': 1 });

module.exports = model('Booking', BookingSchema);
