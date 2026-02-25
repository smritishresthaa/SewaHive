// backend/utils/geo.js
function toRad(v) {
  return (v * Math.PI) / 180;
}

function haversineDistance([lon1, lat1], [lon2, lat2]) {
  const R = 6371; // kilometres

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a point is within a provider's coverage area
 * @param {Object} providerCoverage - { lat, lng, radiusKm }
 * @param {[number, number]} clientLocation - [longitude, latitude]
 * @returns {Object} { isWithinRange: boolean, distance: number }
 */
function isWithinCoverage(providerCoverage, clientLocation) {
  if (!providerCoverage?.lat || !providerCoverage?.lng || !providerCoverage?.radiusKm) {
    return { isWithinRange: false, distance: null, reason: 'Provider coverage not configured' };
  }

  const providerPoint = [providerCoverage.lng, providerCoverage.lat];
  const distance = haversineDistance(providerPoint, clientLocation);
  
  return {
    isWithinRange: distance <= providerCoverage.radiusKm,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    maxRange: providerCoverage.radiusKm,
  };
}

module.exports = { haversineDistance, isWithinCoverage };
