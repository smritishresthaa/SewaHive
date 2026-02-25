// backend/cron/monthlyLeaderboard.js
const Leaderboard = require('../models/Leaderboard');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { calculateSpeedScore } = require('../utils/responseTime');
const {
  calculateBookingScore,
  calculateRatingScore,
  calculateTotalScore,
  qualifiesForLeaderboard,
} = require('../utils/leaderboardScoring');

async function runMonthlyLeaderboard() {
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7); // "YYYY-MM"

  // Month boundaries (inclusive start, exclusive end)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Completed bookings this month
  const bookings = await Booking.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: monthStart, $lt: monthEnd },
      },
    },
    {
      $group: {
        _id: '$providerId',
        total: { $sum: 1 },
      },
    },
  ]);

  const bookingsMap = new Map();
  bookings.forEach((b) => {
    bookingsMap.set(String(b._id), b.total);
  });

  // Avg response time this month (minutes)
  const responseTimes = await Booking.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: monthStart, $lt: monthEnd },
        requestedAt: { $type: 'date' },
        acceptedAt: { $type: 'date' },
      },
    },
    {
      $project: {
        providerId: 1,
        responseMinutes: {
          $divide: [{ $subtract: ['$acceptedAt', '$requestedAt'] }, 60000],
        },
      },
    },
    {
      $group: {
        _id: '$providerId',
        avgResponseMinutes: { $avg: '$responseMinutes' },
      },
    },
  ]);

  const responseMap = new Map();
  responseTimes.forEach((r) => {
    responseMap.set(String(r._id), r.avgResponseMinutes || 0);
  });

  const reviews = await Review.aggregate([
    {
      $match: {
        createdAt: { $gte: monthStart, $lt: monthEnd },
      },
    },
    {
      $group: {
        _id: '$providerId',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
        fiveStars: {
          $sum: {
            $cond: [{ $eq: ['$rating', 5] }, 1, 0],
          },
        },
      },
    },
  ]);

  const reviewMap = new Map();
  reviews.forEach((r) => {
    reviewMap.set(String(r._id), {
      avgRating: r.avgRating || 0,
      reviewCount: r.reviewCount || 0,
      fiveStars: r.fiveStars || 0,
    });
  });

  // Calculate points
  const pointsMap = new Map();

  bookings.forEach((b) => {
    const key = String(b._id);
    const prev = pointsMap.get(key) || 0;
    pointsMap.set(key, prev + b.total * 10);
  });

  reviews.forEach((r) => {
    const key = String(r._id);
    const prev = pointsMap.get(key) || 0;
    pointsMap.set(key, prev + r.fiveStars * 5);
  });

  const maxBookings = Math.max(0, ...bookings.map((b) => b.total || 0));
  const providerIds = new Set([
    ...bookings.map((b) => String(b._id)),
    ...reviews.map((r) => String(r._id)),
    ...responseTimes.map((r) => String(r._id)),
  ]);

  const entries = Array.from(providerIds).map((providerId) => {
    const completedBookings = bookingsMap.get(providerId) || 0;
    const responseMinutes = responseMap.get(providerId) || 0;
    const reviewStats = reviewMap.get(providerId) || { avgRating: 0, reviewCount: 0 };

    const bookingScore = calculateBookingScore(completedBookings, maxBookings);
    const ratingScore = calculateRatingScore(reviewStats.avgRating || 0);
    const speedScore = calculateSpeedScore(responseMinutes);

    const totalScore = calculateTotalScore({
      bookingScore,
      ratingScore,
      speedScore,
    });

    const metrics = {
      completedBookings,
      avgRating: reviewStats.avgRating || 0,
      reviewCount: reviewStats.reviewCount || 0,
      avgResponseMinutes: responseMinutes,
    };

    return {
      providerId,
      points: totalScore,
      metrics,
      scores: {
        bookingScore,
        ratingScore,
        speedScore,
        totalScore,
      },
      qualifiesForLeaderboard: qualifiesForLeaderboard(metrics),
      isRisingProvider:
        completedBookings > 0 && !qualifiesForLeaderboard(metrics),
    };
  });

  // Sort descending by points
  entries.sort((a, b) => b.points - a.points);

  // Upsert leaderboard records
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    await Leaderboard.updateOne(
      { providerId: e.providerId, month: monthStr },
      {
        $set: {
          points: e.points,
          rank: i + 1,
          qualifiesForLeaderboard: e.qualifiesForLeaderboard,
          isRisingProvider: e.isRisingProvider,
          metrics: {
            completedBookings: e.metrics.completedBookings,
            avgRating: e.metrics.avgRating,
            reviewCount: e.metrics.reviewCount,
            avgResponseMinutes: e.metrics.avgResponseMinutes,
          },
          scores: {
            bookingScore: e.scores.bookingScore,
            ratingScore: e.scores.ratingScore,
            speedScore: e.scores.speedScore,
            totalScore: e.scores.totalScore,
          },
        },
      },
      { upsert: true }
    );
  }
}

module.exports = { runMonthlyLeaderboard };
