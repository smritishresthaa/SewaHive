#!/usr/bin/env node
// scripts/migrateBadgesToArray.js
// Run: node scripts/migrateBadgesToArray.js

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function migrateBadgesToArray() {
  try {
    console.log('Starting badges migration...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const providers = await User.find({ role: 'provider' }).select('providerDetails.badges');
    let updatedCount = 0;

    for (const provider of providers) {
      const badges = provider.providerDetails?.badges;
      let nextBadges = [];

      if (Array.isArray(badges)) {
        nextBadges = badges.filter((badge) => badge && badge !== 'none');
      } else if (typeof badges === 'string') {
        if (badges && badges !== 'none') {
          nextBadges = [badges];
        }
      }

      const badgesChanged =
        !Array.isArray(badges) ||
        badges.length !== nextBadges.length ||
        badges.some((badge, index) => badge !== nextBadges[index]);

      if (badgesChanged) {
        provider.providerDetails = provider.providerDetails || {};
        provider.providerDetails.badges = nextBadges;
        await provider.save();
        updatedCount += 1;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} provider(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrateBadgesToArray();
