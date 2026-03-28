// models/Dispute.js
const { Schema, model } = require('mongoose');

const DisputeSchema = new Schema(
  {
    // RELATIONSHIPS
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    clientId: { type: Schema.Types.ObjectId, ref: 'User' },
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },

    // WHO OPENED IT (legacy)
    openedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // WHO OPENED IT (new)
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    raisedByRole: { type: String, enum: ['client', 'provider'] },

    // ADMIN ASSIGNEE
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },

    // DISPUTE CATEGORY (new)
    category: {
      type: String,
      enum: ['service_quality', 'payment_issue', 'provider_behaviour', 'safety_concern', 'other'],
      default: 'other',
    },

    // DISPUTE REASON (legacy)
    reason: {
      type: String,
      enum: [
        'SERVICE_NOT_COMPLETED',
        'POOR_QUALITY',
        'PROVIDER_UNAVAILABLE',
        'DIFFERENT_FROM_DESCRIPTION',
        'SAFETY_ISSUE',
        'PAYMENT_ISSUE',
        'OTHER'
      ],
      default: 'OTHER',
    },

    // MESSAGE & EVIDENCE
    message: { type: String },
    description: { type: String },
    evidence: [{ type: String }],
    evidenceFiles: [
      {
        url: String,
        originalName: String,
        size: Number,
        mimeType: String,
      },
    ],

    // TIMER EVIDENCE SNAPSHOT (pricing/timing disputes)
    timerSnapshot: {
      totalSeconds: Number,
      totalHours: Number,
      includedHours: Number,
      hourlyRate: Number,
      estimatedExtraCost: Number,
      sessions: [
        {
          startedAt: Date,
          pausedAt: Date,
          durationSeconds: Number,
        },
      ],
      capturedAt: Date,
    },

    // PROVIDER RESPONSE (legacy)
    providerResponse: {
      message: String,
      evidence: [{ type: String }],
      submittedAt: Date,
    },

    // REQUESTED INFO (new)
    requestedInfo: [
      {
        field: String,
        response: String,
        requestedAt: Date,
        respondedAt: Date,
      },
    ],

    // AMOUNT IN DISPUTE
    amount: { type: Number },

    // ADMIN RESOLUTION (legacy)
    adminDecision: {
      type: {
        type: String,
        enum: ['RELEASE_FULL', 'REFUND_FULL', 'REFUND_PARTIAL', 'PENDING'],
        default: 'PENDING',
      },
      refundAmount: Number,
      notes: String,
      decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      decidedAt: Date,
    },

    // ADMIN RESOLUTION (new)
    resolutionDetails: {
      resolutionType: {
        type: String,
        enum: ['refund_full', 'refund_partial', 'reservice', 'booking_valid', 'warning'],
      },
      refundAmount: Number,
      reason: String,
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
    },

    // STATUS FLOW
    status: {
      type: String,
      enum: [
        'open',
        'client_provided',
        'awaiting_provider',
        'provider_responded',
        'resolved',
        'rejected',
        'closed',
        'opened',
        'under_review'
      ],
      default: 'opened',
    },

    // TIMELINE
    openedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    closedAt: Date,

    // INTERNAL NOTES
    adminNotes: String,
  },
  { timestamps: true }
);

// Helpful when listing open disputes for admin
DisputeSchema.index({ status: 1, createdAt: -1 });

module.exports = model('Dispute', DisputeSchema);