// scripts/migrateCategoryApprovals.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
require('dotenv').config();

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Find all providers who are KYC approved
    const providers = await User.find({ role: 'provider', kycStatus: 'approved' });
    console.log(`Found ${providers.length} KYC approved providers.`);

    let updatedCount = 0;

    for (const provider of providers) {
      // Find all active services for this provider
      const services = await Service.find({ providerId: provider._id, isActive: true });
      
      // Extract unique category IDs (filter out nulls)
      const categoryIds = [...new Set(services.filter(s => s.categoryId).map(s => s.categoryId.toString()))];

      if (categoryIds.length > 0) {
        let needsUpdate = false;

        // Initialize arrays if they don't exist
        if (!provider.providerDetails.approvedCategories) {
          provider.providerDetails.approvedCategories = [];
        }
        if (!provider.providerDetails.skillProofs) {
          provider.providerDetails.skillProofs = [];
        }

        for (const catId of categoryIds) {
          // Check if already approved
          const isApproved = provider.providerDetails.approvedCategories.some(
            id => id.toString() === catId
          );

          if (!isApproved) {
            // Add to approved categories
            provider.providerDetails.approvedCategories.push(catId);
            
            // Add a dummy skill proof to represent the legacy approval
            provider.providerDetails.skillProofs.push({
              categoryId: catId,
              status: 'approved',
              experienceDescription: 'Legacy auto-approval based on existing active services.',
              adminFeedback: 'Auto-approved during system migration.',
              submittedAt: new Date(),
              reviewedAt: new Date()
            });
            
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await provider.save();
          updatedCount++;
          console.log(`Migrated provider ${provider.email} with ${categoryIds.length} categories.`);
        }
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} providers.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();