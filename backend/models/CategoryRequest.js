// models/CategoryRequest.js
const { Schema, model } = require('mongoose');

const CategoryRequestSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Requested category details
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    justification: {
      type: String,
      required: true,
    },

    // Request status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Admin response
    adminNotes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    // If approved, link to created category
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  },
  { timestamps: true }
);

CategoryRequestSchema.index({ providerId: 1, status: 1 });
CategoryRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = model('CategoryRequest', CategoryRequestSchema);
