// utils/leaderboardScoring.js

const WEIGHTS = {
  bookings: 0.45,
  rating: 0.35,
  speed: 0.2,
};

function qualifiesForLeaderboard(metrics) {
  if (!metrics) {
    return false;
  }

  return (metrics.completedBookings || 0) >= 3 && (metrics.reviewCount || 0) >= 3;
}

function calculateBookingScore(providerBookings, maxBookings) {
  if (!maxBookings || maxBookings <= 0) {
    return 0;
  }

  return (providerBookings / maxBookings) * 100;
}

function calculateRatingScore(avgRating) {
  if (!avgRating) {
    return 0;
  }

  return (avgRating / 5) * 100;
}

function calculateTotalScore(scores) {
  if (!scores) {
    return 0;
  }

  return (
    (scores.bookingScore || 0) * WEIGHTS.bookings +
    (scores.ratingScore || 0) * WEIGHTS.rating +
    (scores.speedScore || 0) * WEIGHTS.speed
  );
}

module.exports = {
  WEIGHTS,
  qualifiesForLeaderboard,
  calculateBookingScore,
  calculateRatingScore,
  calculateTotalScore,
};
