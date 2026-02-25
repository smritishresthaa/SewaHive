// models/ModerationQueue.js
const { Schema, model } = require('mongoose');

const ModerationQueueSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contentType: {
      type: String,
      enum: ['portfolio', 'certificate'],
      required: true,
    },
    contentId: { type: Schema.Types.ObjectId, required: true }, // ID of the specific portfolio item or certificate
    reason: { type: String, required: true },
    flaggedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Can be null if flagged by system
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminComment: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = model('ModerationQueue', ModerationQueueSchema);
