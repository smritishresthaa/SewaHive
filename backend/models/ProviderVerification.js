// models/ProviderVerification.js
const { Schema, model } = require('mongoose');

const ProviderVerificationSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Document category (e.g. citizenship vs passport)
    documentType: {
      type: String,
      enum: ['citizenship', 'passport', 'driving_license'],
      default: 'citizenship',
    },

    documents: [
      {
        type: {
          type: String, // e.g. 'citizenship-front', 'passport', 'selfie'
        },
        url: String,
        mimeType: String,
        sizeBytes: Number,
        blurScore: Number,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        adminComment: String,
        rejectionReason: String,
      },
    ],

    addressProofType: {
      type: String,
      validate: {
        validator: function(v) {
          if (v === null || v === undefined || v === '') return true;
          return ['utility_bill', 'ward_letter', 'rental_agreement', 'other'].includes(v);
        },
        message: 'Invalid address proof type',
      },
    },

    addressDocuments: [
      {
        type: {
          type: String, // e.g. 'address-proof'
        },
        url: String,
        mimeType: String,
        sizeBytes: Number,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        adminComment: String,
        rejectionReason: String,
      },
    ],

    declaredName: String,
    declaredDob: Date,
    profileMatch: {
      nameMatch: Boolean,
      dobMatch: Boolean,
      notes: String,
    },

    gpsVerification: {
      lat: Number,
      lng: Number,
      capturedAt: Date,
    },

    status: {
      type: String,
      enum: ['submitted', 'under_review', 'needs_correction', 'approved', 'rejected'],
      default: 'submitted',
    },

    adminComment: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    screeningStatus: {
      type: String,
      enum: ['pending', 'cleared', 'flagged'],
      default: 'pending',
    },
    flagReason: String,

    auditLogs: [
      {
        action: String,
        note: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],

    // Keep in sync conceptually with providerDetails.badges
    badge: {
      type: String,
      validate: {
        validator: function(v) {
          if (v === null || v === undefined || v === '') return true;
          return ['verified', 'pro', 'top-rated'].includes(v);
        },
        message: 'Invalid badge',
      },
    },
  },
  { timestamps: true }
);

ProviderVerificationSchema.index({ providerId: 1, createdAt: -1 });

module.exports = model('ProviderVerification', ProviderVerificationSchema);
