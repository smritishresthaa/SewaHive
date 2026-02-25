// models/Leaderboard.js
const { Schema, model } = require('mongoose');

const LeaderboardSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    points: { type: Number, default: 0 },
    month: { type: String, required: true }, // "YYYY-MM"
    rank: { type: Number },
    globalRank: { type: Number },

    metrics: {
      completedBookings: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      avgResponseMinutes: { type: Number, default: 0 },
    },

    scores: {
      bookingScore: { type: Number, default: 0 },
      ratingScore: { type: Number, default: 0 },
      speedScore: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
    },

    qualifiesForLeaderboard: { type: Boolean, default: false },
    isRisingProvider: { type: Boolean, default: false },

    location: {
      city: { type: String, default: '' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

LeaderboardSchema.index({ providerId: 1, month: 1, categoryId: 1 }, { unique: true });
LeaderboardSchema.index({ month: 1, categoryId: 1, rank: 1 });
LeaderboardSchema.index({ month: 1, rank: 1 });

module.exports = model('Leaderboard', LeaderboardSchema);
