// utils/leaderboardAggregations.js

const Booking = require('../models/Booking');
const Review = require('../models/Review');

async function getProviderResponseTimeAvg(providerId, monthStart, monthEnd) {
  const [result] = await Booking.aggregate([
    {
      $match: {
        providerId,
        status: 'completed',
        completedAt: { $gte: monthStart, $lt: monthEnd },
        requestedAt: { $type: 'date' },
        acceptedAt: { $type: 'date' },
      },
    },
    {
      $project: {
        responseMinutes: {
          $divide: [{ $subtract: ['$acceptedAt', '$requestedAt'] }, 60000],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgResponseMinutes: { $avg: '$responseMinutes' },
      },
    },
  ]);

  return result?.avgResponseMinutes ?? 0;
}

async function getMaxCompletedBookings(monthStart, monthEnd) {
  const [result] = await Booking.aggregate([
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
    {
      $group: {
        _id: null,
        maxTotal: { $max: '$total' },
      },
    },
  ]);

  return result?.maxTotal ?? 0;
}

async function getProviderMetrics(providerId, monthStart, monthEnd) {
  const [bookingResult] = await Booking.aggregate([
    {
      $match: {
        providerId,
        status: 'completed',
        completedAt: { $gte: monthStart, $lt: monthEnd },
      },
    },
    {
      $group: {
        _id: null,
        completedBookings: { $sum: 1 },
      },
    },
  ]);

  const [reviewResult] = await Review.aggregate([
    {
      $match: {
        providerId,
        createdAt: { $gte: monthStart, $lt: monthEnd },
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const avgResponseMinutes = await getProviderResponseTimeAvg(
    providerId,
    monthStart,
    monthEnd
  );

  return {
    completedBookings: bookingResult?.completedBookings ?? 0,
    avgRating: reviewResult?.avgRating ?? 0,
    reviewCount: reviewResult?.reviewCount ?? 0,
    avgResponseMinutes,
  };
}

module.exports = {
  getProviderResponseTimeAvg,
  getMaxCompletedBookings,
  getProviderMetrics,
};
