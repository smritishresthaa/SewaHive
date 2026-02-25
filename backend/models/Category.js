// models/Category.js
const { Schema, model } = require('mongoose');

const CategorySchema = new Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    // Icon/Image for UI display
    icon: String,
    image: String,
    iconKey: String,
    sortOrder: { type: Number, default: 0 },

    // Price guidance (to help with price review logic)
    recommendedPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000 },
    },

    // Suggested pricing mode (guidance only)
    suggestedPriceMode: {
      type: String,
      enum: ['fixed', 'range', 'quote_required'],
    },

    // Subcategories (optional, admin-managed)
    subcategories: [{ type: String, default: [] }],

    // Status: active categories are visible to providers
    status: {
      type: String,
      enum: ['active', 'inactive', 'deleted'],
      default: 'active',
      index: true,
    },

    // Admin notes for this category
    adminNotes: String,

    // SewaHive-specific features
    emergencyServiceAllowed: {
      type: Boolean,
      default: false,
    },

    kycVerificationRequired: {
      type: Boolean,
      default: false,
    },

    // Soft delete tracking
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Track creation/modification by admin
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CategorySchema.index({ status: 1, name: 1 });

module.exports = model('Category', CategorySchema);
