// scripts/backfillUserKycStatus.js
const mongoose = require("mongoose");
const User = require("../models/User");
const { resolveProviderKycStatus } = require("../utils/kyc");

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI or MONGODB_URI");
  }

  await mongoose.connect(mongoUri);

  const providers = await User.find({ role: "provider" }).select("_id kycStatus");
  let updated = 0;

  for (const provider of providers) {
    const desired = await resolveProviderKycStatus({
      user: provider,
      providerId: provider._id,
    });

    if (provider.kycStatus !== desired) {
      await User.findByIdAndUpdate(provider._id, { kycStatus: desired });
      updated += 1;
    }
  }

  console.log(`Updated ${updated} providers`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});