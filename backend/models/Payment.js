// models/Payment.js
const { Schema, model } = require('mongoose');

const PaymentSchema = new Schema(
  {
    // RELATIONSHIPS
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ESEWA DATA
    transaction_uuid: { type: String, unique: true, required: true },
    referenceId: String, // eSewa ref id
    signature: String, // signed response
    gateway: { type: String, default: 'eSewa' },

    // PRICING
    amount: { type: Number, required: true },
    basePrice: Number,
    emergencyFee: Number,
    platformFee: Number,
    providerEarnings: Number,

    purpose: {
      type: String,
      enum: ['initial_escrow', 'additional_escrow'],
      default: 'initial_escrow',
    },

    // STATUS (Escrow Flow)
    status: {
      type: String,
      enum: [
        'INITIATED',        // Payment started
        'FUNDS_HELD',       // eSewa payment verified, funds held in escrow
        'RELEASED',         // Released to provider after confirmation
        'FAILED',           // Payment failed
        'REFUNDED',         // Full refund issued
        'DISPUTED',         // Dispute raised, awaiting admin decision
        'PARTIALLY_REFUNDED' // Partial refund after dispute
      ],
      default: 'INITIATED',
    },

    // ESCROW SPECIFIC
    escrownReleasedAt: Date, // Legacy field (typo)
    releasedAt: Date, // When payment was released to provider
    clientConfirmedAt: Date,
    providerClaimedAt: Date,

    // DISPUTE INFO
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute' },
    disputeReason: String,

    // TIMESTAMPS
    verifiedAt: Date,
    refundedAt: Date,

    // OPTIONAL FOR INVOICE
    invoiceNumber: String,
    receipt: {}, // store raw gateway response
  },
  { timestamps: true }
);

PaymentSchema.index({ bookingId: 1, status: 1, createdAt: -1 });

module.exports = model('Payment', PaymentSchema);
