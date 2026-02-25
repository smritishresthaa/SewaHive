// models/ProviderAnalytics.js
const { Schema, model } = require('mongoose');

const ProviderAnalyticsSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // "YYYY-MM"

    completedBookings: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    avgResponseMinutes: { type: Number, default: 0 },

    bookingsPerWeek: { type: [Number], default: [] },
    earningsPerWeek: { type: [Number], default: [] },
    busiestDayOfWeek: { type: String, default: '' },

    trends: {
      bookingsChange: { type: Number, default: 0 },
      earningsChange: { type: Number, default: 0 },
      ratingChange: { type: Number, default: 0 },
      responseTimeChange: { type: Number, default: 0 },
    },

    insights: { type: [String], default: [] },
  },
  { timestamps: true }
);

ProviderAnalyticsSchema.index({ providerId: 1, month: 1 }, { unique: true });
ProviderAnalyticsSchema.index({ month: 1 });

module.exports = model('ProviderAnalytics', ProviderAnalyticsSchema);
