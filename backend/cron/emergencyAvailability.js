// backend/cron/emergencyAvailability.js
const User = require('../models/User');

async function runEmergencyAvailability() {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

  await User.updateMany(
    {
      role: 'provider',
      'providerDetails.emergencyAvailable': true,
      updatedAt: { $lt: cutoff },
    },
    {
      $set: { 'providerDetails.emergencyAvailable': false },
    }
  );
}

module.exports = { runEmergencyAvailability };
