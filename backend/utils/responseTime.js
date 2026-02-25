// utils/responseTime.js

const SPEED_SCORE_BUCKETS = [
  { maxMinutes: 5, score: 100 },
  { maxMinutes: 30, score: 80 },
  { maxMinutes: 120, score: 50 },
  { maxMinutes: 1440, score: 20 },
];

function calculateResponseMinutes(requestedAt, acceptedAt) {
  if (!requestedAt || !acceptedAt) {
    return null;
  }

  const requestedTime = new Date(requestedAt).getTime();
  const acceptedTime = new Date(acceptedAt).getTime();

  if (Number.isNaN(requestedTime) || Number.isNaN(acceptedTime)) {
    return null;
  }

  const diffMs = acceptedTime - requestedTime;
  if (diffMs < 0) {
    return null;
  }

  return diffMs / (1000 * 60);
}

function calculateSpeedScore(avgResponseMinutes) {
  if (avgResponseMinutes === null || avgResponseMinutes === undefined) {
    return 0;
  }

  for (const bucket of SPEED_SCORE_BUCKETS) {
    if (avgResponseMinutes <= bucket.maxMinutes) {
      return bucket.score;
    }
  }

  return 0;
}

module.exports = {
  calculateResponseMinutes,
  calculateSpeedScore,
  SPEED_SCORE_BUCKETS,
};
