// // cron/trustScoring.js
// const User = require('../models/User');
// const { calculateProviderBadges } = require('../utils/trustScoring');

// async function runTrustScoring() {
//   console.log('Starting daily Badge Calculation & Trust Scoring job...');
//   try {
//     const providers = await User.find({ role: 'provider' });
//     let updated = 0;

//     for (const provider of providers) {
//       await calculateProviderBadges(provider._id);
//       updated++;
//     }

//     console.log(`Successfully updated badges for ${updated} providers.`);
//   } catch (error) {
//     console.error('Error running Badge Calculation job:', error);
//   }
// }

// module.exports = { runTrustScoring };


const User = require("../models/User");
const { recalculateProviderTrust } = require("../utils/trustScoring");

async function runTrustScoring() {
  console.log("Starting daily Badge Calculation & Trust Scoring job...");
  try {
    const providers = await User.find({ role: "provider" }).select("_id");
    let updated = 0;

    for (const provider of providers) {
      await recalculateProviderTrust(provider._id);
      updated += 1;
    }

    console.log(`Successfully updated trust scores for ${updated} providers.`);
  } catch (error) {
    console.error("Error running Badge Calculation job:", error);
  }
}

module.exports = { runTrustScoring };
