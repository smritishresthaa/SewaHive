// models/Service.js
const { Schema, model } = require("mongoose");

const ServiceSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // CATEGORY REFERENCE (admin-controlled only)
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // SUBCATEGORY REFERENCE (optional)
    subcategoryId: { type: Schema.Types.ObjectId, ref: "Subcategory", index: true },

    // BASIC SERVICE DETAILS
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    images: [String],

    // PRICING MODEL (flexible pricing system)
    priceMode: {
      type: String,
      enum: ["fixed", "range", "quote_required"],
      default: "fixed",
    },

    // Fixed Price Mode
    basePrice: { type: Number, required: true, min: 0 },
    emergencyPrice: { type: Number, default: 0, min: 0 },
    includedHours: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, min: 0 },
    fixedRate: { type: Number, min: 0 },

    // Range Price Mode
    priceRange: {
      min: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 0, min: 0 },
    },

    // Quote Required Mode
    quoteDescription: { type: String, default: "" },
    visitFee: { type: Number, default: 0, min: 0 },

    // AVAILABILITY
    availability: [
      {
        day: String, // monday, tuesday, etc.
        start: String, // "10:00"
        end: String, // "18:00"
      },
    ],

    // RATING
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // ANALYTICS
    bookingsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    // GEO COVERAGE
    coverage: {
      type: { type: String, enum: ["Polygon", "Circle"] },
      radius: Number,
      polygon: {},
    },

    maxDistance: Number, // quick radius filter

    // STATUS
    isActive: { type: Boolean, default: true },

    // ADMIN RESTRICTIONS
    adminDisabled: { type: Boolean, default: false },
    adminDisabledReason: String,
    adminDisabledAt: Date,
    adminDisabledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ServiceSchema.index({ providerId: 1, isActive: 1 });
ServiceSchema.index({ categoryId: 1, isActive: 1 });

module.exports = model("Service", ServiceSchema);