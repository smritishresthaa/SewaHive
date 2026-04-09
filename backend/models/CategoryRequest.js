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

    // Requested category / subcategory details
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    justification: {
      type: String,
      required: true,
    },

    requestType: {
      type: String,
      enum: ['category', 'subcategory'],
      default: 'category',
      index: true,
    },

    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
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
    rejectionReason: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    // If approved, link to created category/subcategory
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    subcategoryId: { type: Schema.Types.ObjectId, ref: 'Subcategory' },
  },
  { timestamps: true }
);

CategoryRequestSchema.index({ providerId: 1, status: 1 });
CategoryRequestSchema.index({ status: 1, createdAt: -1 });
CategoryRequestSchema.index({ providerId: 1, requestType: 1, parentCategoryId: 1, name: 1 });

module.exports = model('CategoryRequest', CategoryRequestSchema);
