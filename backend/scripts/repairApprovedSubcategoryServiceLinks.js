const mongoose = require('mongoose');
require('dotenv').config();

const Service = require('../models/Service');
const CategoryRequest = require('../models/CategoryRequest');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function repairApprovedSubcategoryServiceLinks() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.DB_URI;

    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const approvedSubcategoryRequests = await CategoryRequest.find({
      status: 'approved',
      requestType: 'subcategory',
      categoryId: { $exists: true, $ne: null },
      subcategoryId: { $exists: true, $ne: null },
    });

    console.log(`Found ${approvedSubcategoryRequests.length} approved subcategory requests`);

    let totalUpdated = 0;

    for (const request of approvedSubcategoryRequests) {
      const result = await Service.updateMany(
        {
          providerId: request.providerId,
          categoryId: request.categoryId,
          subcategoryId: { $in: [null, undefined] },
          title: { $regex: `^${escapeRegex(request.name)}$`, $options: 'i' },
        },
        {
          $set: {
            subcategoryId: request.subcategoryId,
          },
        }
      );

      const updatedCount = result.modifiedCount || 0;
      totalUpdated += updatedCount;

      console.log(
        `Request "${request.name}" -> updated ${updatedCount} service(s)`
      );
    }

    console.log(`Repair complete. Total services updated: ${totalUpdated}`);
  } catch (err) {
    console.error('Repair failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

repairApprovedSubcategoryServiceLinks();