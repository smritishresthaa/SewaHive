// routes/admin.js
const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Service = require('../models/Service');
const Review = require('../models/Review');
const AdminServiceConfig = require('../models/AdminServiceConfig');
const { broadcastToRole } = require('../utils/notificationStream');
const ProviderVerification = require('../models/ProviderVerification');
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const User = require('../models/User');
const CategoryRequest = require('../models/CategoryRequest');
const Conversation = require('../models/Conversation');
const ModerationQueue = require('../models/ModerationQueue');
const {
  ensureBookingForChat,
  getBookingChatHistory,
} = require('../utils/chatService');

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============================================
// CATEGORY SKILL REVIEW (Phase 1)
// ============================================

// GET pending skill proofs
router.get('/skills-review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status = 'pending_review', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find users who have a skill proof matching the requested status
    const users = await User.find({
      'providerDetails.skillProofs.status': status
    })
      .select('profile.name email providerDetails.skillProofs')
      .populate('providerDetails.skillProofs.categoryId', 'name')
      .skip(skip)
      .limit(parseInt(limit));

    // Flatten the results to return individual skill proof requests
    const items = [];
    users.forEach(user => {
      user.providerDetails.skillProofs.forEach(proof => {
        if (proof.status === status) {
          items.push({
            providerId: user._id,
            providerName: user.profile.name,
            providerEmail: user.email,
            proof
          });
        }
      });
    });

    // Note: Total count is approximate here due to flattening
    const total = items.length; 

    res.json({
      items,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e) {
    next(e);
  }
});

// PUT approve/reject/request correction for a skill proof
router.put('/skills-review/:providerId/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { providerId, categoryId } = req.params;
    const { status, adminFeedback } = req.body;

    if (!['approved', 'needs_correction', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(providerId);
    if (!user) return res.status(404).json({ message: 'Provider not found' });

    const proofIndex = user.providerDetails.skillProofs.findIndex(
      p => p.categoryId.toString() === categoryId
    );

    if (proofIndex === -1) {
      return res.status(404).json({ message: 'Skill proof not found for this category' });
    }

    // Update the proof status
    user.providerDetails.skillProofs[proofIndex].status = status;
    user.providerDetails.skillProofs[proofIndex].adminFeedback = adminFeedback || '';
    user.providerDetails.skillProofs[proofIndex].reviewedAt = new Date();

    // If approved, add to approvedCategories (if not already there)
    if (status === 'approved') {
      const isAlreadyApproved = user.providerDetails.approvedCategories.some(
        id => id.toString() === categoryId
      );
      if (!isAlreadyApproved) {
        user.providerDetails.approvedCategories.push(categoryId);
      }
    } else {
      // If rejected or needs correction, ensure it's removed from approvedCategories
      user.providerDetails.approvedCategories = user.providerDetails.approvedCategories.filter(
        id => id.toString() !== categoryId
      );
    }

    await user.save();

    res.json({ 
      success: true, 
      message: `Skill proof marked as ${status}`,
      skillProof: user.providerDetails.skillProofs[proofIndex]
    });
  } catch (e) {
    next(e);
  }
});

// ============================================
// MODERATION QUEUE (Phase 2)
// ============================================

// GET moderation queue
router.get('/moderation', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { status };

    const items = await ModerationQueue.find(query)
      .populate('providerId', 'profile.name email')
      .populate('flaggedBy', 'profile.name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ModerationQueue.countDocuments(query);

    res.json({
      items,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

// PUT resolve/dismiss moderation item
router.put('/moderation/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, adminComment } = req.body;
    
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const item = await ModerationQueue.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Moderation item not found' });
    }

    item.status = status;
    item.adminComment = adminComment;
    item.reviewedBy = req.user.id;
    item.reviewedAt = new Date();

    await item.save();

    // If resolved (meaning the content is inappropriate), remove it from the provider's profile
    if (status === 'resolved') {
      const provider = await User.findById(item.providerId);
      if (provider) {
        if (item.contentType === 'portfolio') {
          provider.providerDetails.portfolio = provider.providerDetails.portfolio.filter(
            (p) => p._id.toString() !== item.contentId.toString()
          );
        } else if (item.contentType === 'certificate') {
          provider.providerDetails.certificates = provider.providerDetails.certificates.filter(
            (c) => c._id.toString() !== item.contentId.toString()
          );
        }
        await provider.save();
      }
    }

    res.json({ message: `Moderation item ${status}`, item });
  } catch (e) {
    next(e);
  }
});

// ============================================
// DASHBOARD STATISTICS
// ============================================

// GET dashboard statistics
router.get('/dashboard/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Payment = require('../models/Payment');

    // Count total users (clients)
    const totalUsers = await User.countDocuments({ role: 'client' });

    // Count total providers
    const totalProviders = await User.countDocuments({ role: 'provider' });

    // Count verified providers (get all providers with approved verification status)
    // Method 1: Get providers with 'approved' verification status
    const approvedVerificationProviders = await ProviderVerification.distinct('providerId', {
      status: 'approved',
    });

    // Method 2: Get providers with approved kycStatus
    const approvedKycProviders = await User.find({
      role: 'provider',
      kycStatus: 'approved',
    }).select('_id');

    // Combine both sets to get unique verified providers
    const verifiedProviderIds = new Set();
    approvedVerificationProviders.forEach(id => verifiedProviderIds.add(String(id)));
    approvedKycProviders.forEach(user => verifiedProviderIds.add(String(user._id)));

    const verifiedProviders = verifiedProviderIds.size;

    // Count pending badge applications (for user stats)
    const pendingBadgeVerifications = await ProviderVerification.countDocuments({
      status: { $in: ['submitted', 'under_review'] },
    });

    // Count total bookings
    const totalBookings = await Booking.countDocuments();

    // Count bookings by status
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const ongoingBookings = await Booking.countDocuments({
      status: { $in: ['accepted', 'work_in_progress', 'on_the_way'] },
    });
    const cancelledBookings = await Booking.countDocuments({
      status: { $in: ['cancelled', 'declined'] },
    });

    // Count disputes by status
    const totalDisputes = await Dispute.countDocuments();
    const openDisputes = await Dispute.countDocuments({ status: 'open' });
    const resolvedDisputes = await Dispute.countDocuments({ status: 'resolved' });
    const rejectedDisputes = await Dispute.countDocuments({ status: 'rejected' });
    const pendingDisputes = openDisputes; // For backward compatibility with admin dashboard

    // Count verifications by status
    const totalVerifications = await ProviderVerification.countDocuments();
    const pendingVerifications = await ProviderVerification.countDocuments({
      status: 'pending',
    });
    const approvedVerifications = await ProviderVerification.countDocuments({
      status: 'approved',
    });
    const rejectedVerifications = await ProviderVerification.countDocuments({
      status: 'rejected',
    });

    // Get total revenue (sum of all released payments)
    const revenueData = await Payment.aggregate([
      { $match: { status: 'RELEASED' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Count payment transactions
    const totalTransactions = await Payment.countDocuments();
    const completedTransactions = await Payment.countDocuments({ status: 'RELEASED' });
    const pendingTransactions = await Payment.countDocuments({
      status: { $in: ['INITIATED', 'FUNDS_HELD', 'DISPUTED'] },
    });
    const failedTransactions = await Payment.countDocuments({ status: 'FAILED' });

    // Count categories by status
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ status: 'active' });
    const inactiveCategories = await Category.countDocuments({ status: 'inactive' });

    // Count reviews and calculate average rating
    const totalReviews = await Review.countDocuments();
    const reviewStats = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const averageRating = reviewStats[0]?.avgRating || 0;

    // Count services by moderation status
    const activeServices = await Service.countDocuments({
      isActive: true,
      $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
    });
    const flaggedServices = await Service.countDocuments({
      adminDisabled: true,
    });
    const suspendedServices = await Service.countDocuments({
      isActive: false,
    });

    // Get recent bookings (last 10)
    const recentBookings = await Booking.find()
      .populate('clientId', 'profile.name email')
      .populate('providerId', 'profile.name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        users: {
          totalUsers,
          totalProviders,
          verifiedProviders, // Providers with verified badge
          pendingVerifications: pendingBadgeVerifications,
        },
        bookings: {
          totalBookings,
          completedBookings,
          ongoingBookings,
          cancelledBookings,
        },
        services: {
          activeServices,
          flaggedServices,
          suspendedServices,
        },
        admin: {
          pendingDisputes,
          pendingVerifications,
        },
        verifications: {
          totalVerifications,
          pendingVerifications,
          approvedVerifications,
          rejectedVerifications,
        },
        payments: {
          totalRevenue,
          totalTransactions,
          completedTransactions,
          pendingTransactions,
          failedTransactions,
        },
        categories: {
          totalCategories,
          activeCategories,
          inactiveCategories,
        },
        reviews: {
          totalReviews,
          averageRating,
        },
        disputes: {
          totalDisputes,
          openDisputes,
          resolvedDisputes,
          rejectedDisputes,
        },
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CATEGORIES CRUD
// ============================================

// GET all categories (with filter options)
router.get('/categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let filter = { status: { $ne: 'deleted' } };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const categories = await Category.find(filter)
      .populate('createdBy', 'profile.name email')
      .populate('updatedBy', 'profile.name email')
      .sort({ createdAt: -1 });

    // Add service count, price range, and analytics for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
        const serviceFilter = {
          $or: [
            { categoryId: category._id },
            { category: categoryNameRegex }
          ]
        };

        const serviceCount = await Service.countDocuments(serviceFilter);
        const activeServiceCount = await Service.countDocuments({
          ...serviceFilter,
          isActive: true,
          $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }]
        });

        // Get dynamic price range from actual services
        const priceAgg = await Service.aggregate([
          { $match: serviceFilter },
          {
            $project: {
              minCandidate: { $ifNull: ['$priceRange.min', '$basePrice'] },
              maxCandidate: { $ifNull: ['$priceRange.max', '$basePrice'] }
            }
          },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$minCandidate' },
              maxPrice: { $max: '$maxCandidate' }
            }
          }
        ]);

        const dynamicPriceRange = priceAgg.length > 0 ? {
          min: priceAgg[0].minPrice || category.recommendedPriceRange?.min || 0,
          max: priceAgg[0].maxPrice || category.recommendedPriceRange?.max || 10000
        } : category.recommendedPriceRange || { min: 0, max: 10000 };

        // Get provider count
        const providerCount = await Service.distinct('providerId', serviceFilter).then(arr => arr.length);

        // Get booking count
        const bookingCount = await Booking.aggregate([
          {
            $lookup: {
              from: 'services',
              localField: 'serviceId',
              foreignField: '_id',
              as: 'service'
            }
          },
          { $unwind: '$service' },
          {
            $match: {
              $or: [
                { 'service.categoryId': category._id },
                { 'service.category': categoryNameRegex }
              ]
            }
          },
          { $count: 'total' }
        ]);

        const totalBookings = bookingCount.length > 0 ? bookingCount[0].total : 0;

        // Get revenue (completed bookings)
        const revenueAgg = await Booking.aggregate([
          {
            $lookup: {
              from: 'services',
              localField: 'serviceId',
              foreignField: '_id',
              as: 'service'
            }
          },
          { $unwind: '$service' },
          {
            $match: {
              status: 'completed',
              $or: [
                { 'service.categoryId': category._id },
                { 'service.category': categoryNameRegex }
              ]
            }
          },
          { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        const revenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        const subcategoriesDetailed = await Subcategory.find({ categoryId: category._id })
          .sort({ sortOrder: 1, name: 1 })
          .select('name description status sortOrder');

        let subcategories = subcategoriesDetailed.map((sub) => sub.name);
        if (!subcategories.length) {
          subcategories = await Service.distinct('subcategory', serviceFilter);
          subcategories = subcategories.filter((item) => item && item.trim());
        }

        return {
          ...category.toObject(),
          serviceCount,
          activeServiceCount,
          dynamicPriceRange,
          subcategories,
          subcategoriesDetailed,
          analytics: {
            providerCount,
            totalBookings,
            revenue
          }
        };
      })
    );

    res.json({ success: true, data: categoriesWithCounts });
  } catch (err) {
    next(err);
  }
});

// GET category summary for service catalog manager
router.get('/categories/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const categories = await Category.find({ status: { $ne: 'deleted' } }).sort({ name: 1 });

    let summary = await Promise.all(
      categories.map(async (category) => {
        const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
        const serviceFilter = {
          $or: [{ categoryId: category._id }, { category: categoryNameRegex }],
        };

        const serviceCount = await Service.countDocuments(serviceFilter);
        const activeServiceCount = await Service.countDocuments({
          ...serviceFilter,
          isActive: true,
          $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
        });

        const providers = await Service.distinct('providerId', serviceFilter);

        let subcategories = await Subcategory.find({ categoryId: category._id })
          .sort({ sortOrder: 1, name: 1 })
          .select('name')
          .then((items) => items.map((item) => item.name));

        if (!subcategories.length) {
          subcategories = await Service.distinct('subcategory', serviceFilter);
          subcategories = subcategories.filter((item) => item && item.trim());
        }

        return {
          _id: category._id,
          name: category.name,
          status: category.status,
          serviceCount,
          activeServiceCount,
          providersCount: providers.length,
          subcategories,
        };
      })
    );

    const serviceCategories = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          serviceCount: { $sum: 1 },
          providerIds: { $addToSet: '$providerId' },
          subcategories: { $addToSet: '$subcategory' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const summaryByName = new Map(summary.map((item) => [item.name?.toLowerCase(), item]));

    serviceCategories
      .filter((item) => item._id)
      .forEach((item) => {
        const key = item._id.toLowerCase();
        if (!summaryByName.has(key)) {
          summary.push({
            _id: null,
            name: item._id,
            status: 'active',
            serviceCount: item.serviceCount,
            activeServiceCount: item.serviceCount,
            providersCount: item.providerIds.length,
            subcategories: (item.subcategories || []).filter((sub) => sub && sub.trim()),
          });
          summaryByName.set(key, true);
        }
      });

    summary.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET single category by ID
router.get('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId)
      .populate('createdBy', 'profile.name email')
      .populate('updatedBy', 'profile.name email');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// CREATE category
router.post('/categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      icon,
      image,
      iconKey,
      sortOrder,
      recommendedPriceRange,
      suggestedPriceMode,
      adminNotes,
      subcategories,
      status,
    } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res
        .status(400)
        .json({ success: false, message: 'Name and description are required' });
    }

    // Check if category already exists
    const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = new Category({
      name: name.trim(),
      description,
      icon,
      image,
      iconKey,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      recommendedPriceRange: recommendedPriceRange || { min: 0, max: 10000 },
      suggestedPriceMode,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      adminNotes,
      status: status || 'active',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE category
router.put('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      icon,
      image,
      iconKey,
      sortOrder,
      recommendedPriceRange,
      suggestedPriceMode,
      adminNotes,
      status,
      subcategories,
    } = req.body;

    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if new name conflicts with another category
    if (name && name !== category.name) {
      const existing = await Category.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.categoryId },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
      category.name = name.trim();
    }

    // Update fields
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (iconKey !== undefined) category.iconKey = iconKey;
    if (sortOrder !== undefined) {
      category.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
    }
    if (recommendedPriceRange) category.recommendedPriceRange = recommendedPriceRange;
    if (suggestedPriceMode !== undefined) category.suggestedPriceMode = suggestedPriceMode;
    if (adminNotes !== undefined) category.adminNotes = adminNotes;
    if (Array.isArray(subcategories)) category.subcategories = subcategories;
    if (status) category.status = status;

    category.updatedBy = req.user._id;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE category (only if no services/bookings)
router.delete('/categories/:categoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const services = await Service.find({
      $or: [{ categoryId: category._id }, { category: category.name }],
    }).select('_id');

    if (services.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active services. Disable it instead.',
      });
    }

    const bookingCount = await Booking.countDocuments({ serviceId: { $in: services } });
    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category linked to bookings. Disable it instead.',
      });
    }

    category.status = 'deleted';
    category.deletedAt = new Date();
    category.deletedBy = req.user._id;
    await category.save();

    await AdminServiceConfig.updateMany(
      {},
      { $pull: { categoryOverrides: { categoryId: category._id } } }
    );

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// DISABLE/ENABLE category (soft delete pattern)
router.patch('/categories/:categoryId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      {
        status,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Keep existing services active; only block new ones via validation.

    res.json({
      success: true,
      message: `Category ${status === 'active' ? 'enabled' : 'disabled'} successfully`,
      data: category,
    });

    broadcastToRole('provider', {
      event: 'admin_update',
      action: 'category_status_changed',
      data: { categoryId: String(category._id), status },
    });
  } catch (err) {
    next(err);
  }
});

// GET services under a specific category
router.get('/categories/:categoryId/services', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const categoryNameRegex = new RegExp(`^${escapeRegex(category.name)}$`, 'i');
    const services = await Service.find({
      $or: [
        { categoryId: category._id },
        { category: categoryNameRegex }
      ]
    })
    .populate('providerId', 'profile.name profile.avatar email')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SUBCATEGORIES CRUD
// ============================================

// GET subcategories (optional filters)
router.get('/subcategories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { categoryId, status, search } = req.query;
    const filter = {};

    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const subcategories = await Subcategory.find(filter)
      .populate('categoryId', 'name status')
      .sort({ sortOrder: 1, name: 1 });

    res.json({ success: true, data: subcategories });
  } catch (err) {
    next(err);
  }
});

// CREATE subcategory
router.post('/subcategories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { categoryId, name, description, status, sortOrder, suggestedPriceMode } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ success: false, message: 'Category and name are required' });
    }

    const category = await Category.findById(categoryId);
    if (!category || category.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const existing = await Subcategory.findOne({
      categoryId,
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subcategory already exists' });
    }

    const subcategory = await Subcategory.create({
      categoryId,
      name: name.trim(),
      description: description || '',
      status: status || 'active',
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      suggestedPriceMode,
    });

    res.status(201).json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// UPDATE subcategory
router.put('/subcategories/:subcategoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, status, sortOrder, suggestedPriceMode } = req.body;

    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    if (name && name.trim() !== subcategory.name) {
      const duplicate = await Subcategory.findOne({
        categoryId: subcategory.categoryId,
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        _id: { $ne: subcategory._id },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Subcategory name already exists' });
      }
      subcategory.name = name.trim();
    }

    if (description !== undefined) subcategory.description = description;
    if (status) subcategory.status = status;
    if (sortOrder !== undefined) {
      subcategory.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
    }
    if (suggestedPriceMode !== undefined) subcategory.suggestedPriceMode = suggestedPriceMode;

    await subcategory.save();

    res.json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// UPDATE subcategory status
router.patch('/subcategories/:subcategoryId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const subcategory = await Subcategory.findByIdAndUpdate(
      req.params.subcategoryId,
      { status },
      { new: true }
    );

    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    res.json({ success: true, data: subcategory });
  } catch (err) {
    next(err);
  }
});

// DELETE subcategory (only if no services)
router.delete('/subcategories/:subcategoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findById(req.params.subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found' });
    }

    const linkedServices = await Service.countDocuments({ subcategoryId: subcategory._id });
    if (linkedServices > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subcategory with linked services. Disable it instead.',
      });
    }

    await Subcategory.deleteOne({ _id: subcategory._id });

    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================
// CATEGORY REQUESTS
// ============================================

// GET all category requests
router.get('/category-requests', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const requests = await CategoryRequest.find(filter)
      .populate('providerId', 'profile.name email')
      .populate('reviewedBy', 'profile.name email')
      .populate('categoryId', 'name status')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

// APPROVE category request
router.post('/category-requests/:requestId/approve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const request = await CategoryRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: `^${escapeRegex(request.name)}$`, $options: 'i' } 
    });

    if (existingCategory) {
      request.status = 'rejected';
      request.adminNotes = 'Category already exists';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      return res.status(400).json({ 
        success: false, 
        message: 'Category already exists',
        category: existingCategory 
      });
    }

    // Create new category
    const category = await Category.create({
      name: request.name,
      description: request.description,
      status: 'active',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Update request
    request.status = 'approved';
    request.categoryId = category._id;
    request.adminNotes = req.body.adminNotes || 'Approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Notify provider
    broadcastToRole('provider', {
      event: 'category_request_approved',
      data: { 
        requestId: String(request._id),
        categoryId: String(category._id),
        categoryName: category.name,
        providerId: String(request.providerId)
      },
    });

    res.json({ 
      success: true, 
      message: 'Category request approved and category created',
      category 
    });
  } catch (err) {
    next(err);
  }
});

// REJECT category request
router.post('/category-requests/:requestId/reject', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const request = await CategoryRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    request.status = 'rejected';
    request.adminNotes = req.body.adminNotes || 'Does not meet platform requirements';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Notify provider
    broadcastToRole('provider', {
      event: 'category_request_rejected',
      data: { 
        requestId: String(request._id),
        reason: request.adminNotes,
        providerId: String(request.providerId)
      },
    });

    res.json({ 
      success: true, 
      message: 'Category request rejected'
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SERVICE FLAGGING / RESTRICTIONS
// ============================================
router.patch('/services/:serviceId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (status === 'inactive') {
      service.isActive = false;
      service.adminDisabled = true;
      service.adminDisabledReason = reason || 'Service restricted by admin';
      service.adminDisabledAt = new Date();
      service.adminDisabledBy = req.user._id;
    } else {
      service.isActive = true;
      service.adminDisabled = false;
      service.adminDisabledReason = null;
      service.adminDisabledAt = null;
      service.adminDisabledBy = null;
    }

    await service.save();

    const { createNotification } = require('../utils/createNotification');
    await createNotification({
      userId: service.providerId,
      type: status === 'inactive' ? 'service_flagged' : 'service_restored',
      title: status === 'inactive' ? 'Service Restricted' : 'Service Restored',
      message:
        status === 'inactive'
          ? `Your service "${service.title}" was restricted by admin. ${service.adminDisabledReason || ''}`
          : `Your service "${service.title}" is active again.`,
      metadata: { serviceId: service._id, status },
    });

    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

// ============================================
// SERVICE MANAGEMENT (PRICING, FEATURED, MODERATION, ANALYTICS)
// ============================================

// GET service pricing configuration
router.get('/services/pricing', authenticate, requireAdmin, async (req, res, next) => {
  try {
    let config = await AdminServiceConfig.findOne()
      .populate('categoryOverrides.categoryId', 'name');

    if (!config) {
      config = await AdminServiceConfig.create({ updatedBy: req.user._id });
    }

    const overrides = config.categoryOverrides.map((override) => ({
      categoryId: override.categoryId?._id || override.categoryId,
      categoryName: override.categoryId?.name || 'Unknown',
      commission: override.commission,
      emergencySurcharge: override.emergencySurcharge,
    }));

    res.json({
      success: true,
      data: {
        platformCommission: config.platformCommission,
        processingFee: config.processingFee,
        emergencySurcharge: config.emergencySurcharge,
        minimumServiceFee: config.minimumServiceFee,
        promoDiscountEnabled: config.promoDiscountEnabled,
        categoryOverrides: overrides,
      },
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE service pricing configuration
router.put('/services/pricing', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      platformCommission,
      processingFee,
      emergencySurcharge,
      minimumServiceFee,
      promoDiscountEnabled,
      categoryOverrides,
    } = req.body;

    const config = await AdminServiceConfig.findOne();
    const updated = config || new AdminServiceConfig();

    if (platformCommission !== undefined) updated.platformCommission = platformCommission;
    if (processingFee !== undefined) updated.processingFee = processingFee;
    if (emergencySurcharge !== undefined) updated.emergencySurcharge = emergencySurcharge;
    if (minimumServiceFee !== undefined) updated.minimumServiceFee = minimumServiceFee;
    if (promoDiscountEnabled !== undefined) updated.promoDiscountEnabled = promoDiscountEnabled;
    if (Array.isArray(categoryOverrides)) updated.categoryOverrides = categoryOverrides;

    updated.updatedBy = req.user._id;
    await updated.save();

    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (err) {
    next(err);
  }
});

// GET featured providers
router.get('/providers/featured', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const scope = req.query.scope || 'featured';
    const filter = { role: 'provider' };
    if (scope === 'featured') {
      filter['providerDetails.featured'] = true;
    }

    const providers = await User.find(filter)
      .select('profile.name providerDetails.categories providerDetails.rating providerDetails.completedBookings providerDetails.featured')
      .sort({ 'providerDetails.rating.average': -1 })
      .limit(50);

    const data = providers.map((provider) => ({
      id: provider._id,
      name: provider.profile?.name || 'Unknown',
      category: provider.providerDetails?.categories?.[0] || 'General',
      rating: provider.providerDetails?.rating?.average || 0,
      featured: Boolean(provider.providerDetails?.featured),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// TOGGLE featured provider
router.patch('/providers/:providerId/featured', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { featured } = req.body;

    const provider = await User.findOne({ _id: req.params.providerId, role: 'provider' });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.providerDetails = provider.providerDetails || {};
    provider.providerDetails.featured = Boolean(featured);
    await provider.save();

    res.json({ success: true, data: { id: provider._id, featured: provider.providerDetails.featured } });
  } catch (err) {
    next(err);
  }
});

// GET service moderation queue
router.get('/services/moderation', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    const activeFilter = {
      isActive: true,
      $or: [{ adminDisabled: false }, { adminDisabled: { $exists: false } }],
    };

    if (status === 'flagged') filter.adminDisabled = true;
    if (status === 'suspended') filter.isActive = false;
    if (status === 'active') {
      filter.$and = filter.$and || [];
      filter.$and.push(activeFilter);
    }

    if (status === 'pending') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filter.$and = filter.$and || [];
      filter.$and.push(activeFilter);
      filter.createdAt = { $gte: sevenDaysAgo };
    }

    if (search) {
      const searchClause = {
        $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        ],
      };

      if (filter.$and) {
        filter.$and.push(searchClause);
      } else {
        filter.$or = searchClause.$or;
      }
    }

    const services = await Service.find(filter)
      .populate('providerId', 'profile.name email')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    const queue = services.map((service) => {
      let derivedStatus = 'active';
      if (service.adminDisabled) derivedStatus = 'flagged';
      else if (!service.isActive) derivedStatus = 'suspended';
      else if (service.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        derivedStatus = 'pending';
      }

      return {
        id: service._id,
        service: service.title,
        provider: service.providerId?.profile?.name || 'Unknown',
        category: service.categoryId?.name || service.category,
        status: derivedStatus,
        flagReason: service.adminDisabledReason || '-',
      };
    });

    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

// GET service analytics
router.get('/services/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Get top services by actual booking count
    const topServicesAgg = await Booking.aggregate([
      { $group: { _id: '$serviceId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
    ]);

    const topServices = topServicesAgg.map((item) => ({
      name: item.service?.title || 'Unknown Service',
      bookings: item.bookingCount,
    }));

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentCategories = await Booking.aggregate([
      { $match: { createdAt: { $gte: last30 } } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      { $group: { _id: '$service.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const previousCategories = await Booking.aggregate([
      { $match: { createdAt: { $gte: prev30, $lt: last30 } } },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      { $unwind: '$service' },
      { $group: { _id: '$service.category', count: { $sum: 1 } } },
    ]);

    const previousMap = previousCategories.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const trendingCategories = currentCategories.map((item) => {
      const previous = previousMap[item._id] || 0;
      const growth = previous === 0
        ? 100
        : Math.round(((item.count - previous) / previous) * 100);

      return {
        name: item._id || 'General',
        growth: `${growth >= 0 ? '+' : ''}${growth}%`,
      };
    });

    // Get top providers by actual completed booking count
    const topProvidersAgg = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$providerId', completedJobs: { $sum: 1 } } },
      { $sort: { completedJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'provider',
        },
      },
      { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
    ]);

    const topProviders = topProvidersAgg.map((item) => ({
      name: item.provider?.profile?.name || 'Unknown Provider',
      jobs: item.completedJobs,
      rating: item.provider?.providerDetails?.rating?.average || 0,
    }));

    res.json({
      success: true,
      data: {
        topServices,
        trendingCategories,
        topProviders,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET stats for a category (how many services use it)
router.get('/categories/:categoryId/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const servicesCount = await Service.countDocuments({ categoryId: req.params.categoryId });
    const activeServicesCount = await Service.countDocuments({
      categoryId: req.params.categoryId,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        category,
        servicesCount,
        activeServicesCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PRICE REVIEW / QUOTE APPROVAL
// ============================================

// GET pending quotes/pricing that need review
router.get('/quotes/pending', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    
    // Get bookings with quotes that need admin review
    const pendingQuotes = await Booking.find({
      'quote.status': 'pending_admin_review',
    })
      .populate('clientId', 'profile.name email phone')
      .populate('providerId', 'profile.name email')
      .populate('serviceId', 'title category')
      .sort({ 'quote.createdAt': -1 });

    res.json({ success: true, data: pendingQuotes });
  } catch (err) {
    next(err);
  }
});

// APPROVE or REJECT quote
router.patch('/quotes/:bookingId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const { action, approvedPrice, adminComment } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.quote || booking.quote.status !== 'pending_admin_review') {
      return res.status(400).json({ success: false, message: 'No pending quote for this booking' });
    }

    if (action === 'approve') {
      // Use provided approvedPrice or provider's quoted price
      const finalPrice = approvedPrice || booking.quote.quotedPrice;
      booking.quote.status = 'approved';
      booking.quote.approvedPrice = finalPrice;
      booking.quote.approvedAt = new Date();
      booking.quote.adminComment = adminComment;
      booking.price = finalPrice;
      booking.totalAmount = finalPrice + (booking.platformFee || 0) + (booking.emergencyFee || 0);
    } else if (action === 'reject') {
      booking.quote.status = 'rejected';
      booking.quote.rejectionReason = adminComment;
      booking.quote.rejectedAt = new Date();
      // When rejected, booking reverts to pending state
      booking.status = 'quote_rejected';
    }

    await booking.save();

    // Notify provider
    const { createNotification } = require('../utils/createNotification');
    await createNotification({
      userId: booking.providerId,
      type: action === 'approve' ? 'quote_approved' : 'quote_rejected',
      title: action === 'approve' ? 'Quote Approved' : 'Quote Rejected',
      message: `Your quote for booking ${booking._id} has been ${action}ed. ${adminComment ? `Comment: ${adminComment}` : ''}`,
      bookingId: booking._id,
      metadata: {
        action,
        approvedPrice: booking.quote.approvedPrice,
        adminComment,
      },
    });

    res.json({
      success: true,
      message: `Quote ${action}ed successfully`,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PROVIDER VERIFICATION & MANAGEMENT
// ============================================

// GET all providers with verification status
router.get('/providers', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { status, search } = req.query;

    let filter = { role: 'provider' };
    if (status) filter['providerDetails.verificationStatus'] = status;
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const providers = await User.find(filter)
      .select(
        'profile email phone providerDetails.verificationStatus providerDetails.badges providerDetails.completedBookings createdAt'
      )
      .sort({ createdAt: -1 });

    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

// GET provider verification documents
router.get('/providers/:providerId/verification', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');

    const provider = await User.findById(req.params.providerId).select('profile providerDetails email');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        provider: {
          _id: provider._id,
          name: provider.profile?.name,
          email: provider.email,
        },
        documents: provider.providerDetails?.verificationDocs || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// APPROVE/REJECT provider verification
router.patch(
  '/providers/:providerId/verification/:docIndex/review',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const User = require('../models/User');
      const { status, adminComment } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const provider = await User.findById(req.params.providerId);
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }

      const docIndex = parseInt(req.params.docIndex);
      if (docIndex < 0 || docIndex >= provider.providerDetails.verificationDocs.length) {
        return res.status(400).json({ success: false, message: 'Invalid document index' });
      }

      provider.providerDetails.verificationDocs[docIndex].status = status;
      provider.providerDetails.verificationDocs[docIndex].adminComment = adminComment;
      provider.providerDetails.verificationDocs[docIndex].reviewedAt = new Date();

      // If all docs approved, update provider badge
      const allApproved = provider.providerDetails.verificationDocs.every(
        (doc) => doc.status === 'approved'
      );
      if (allApproved) {
        const existingBadges = Array.isArray(provider.providerDetails.badges)
          ? provider.providerDetails.badges
          : provider.providerDetails.badges
          ? [provider.providerDetails.badges]
          : [];

        if (!existingBadges.includes('verified')) {
          provider.providerDetails.badges = [...existingBadges, 'verified'];
        }
      }

      await provider.save();

      const ProviderVerification = require('../models/ProviderVerification');
      await ProviderVerification.findOneAndUpdate(
        { providerId: provider._id },
        {
          status,
          adminComment,
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
        },
        { sort: { createdAt: -1 } }
      );

      await User.findByIdAndUpdate(provider._id, {
        kycStatus: status === 'approved' ? 'approved' : 'rejected',
      });

      // Notify provider
      const { createNotification } = require('../utils/createNotification');
      await createNotification({
        userId: provider._id,
        type: 'verification_' + status,
        title: `Verification ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your verification document has been ${status}. ${adminComment ? `Comment: ${adminComment}` : ''}`,
        metadata: { docIndex, adminComment },
      });

      res.json({
        success: true,
        message: `Verification document ${status} successfully`,
        data: provider,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================
// PROVIDER KYC VERIFICATIONS (NEW FLOW)
// ============================================

// GET all provider verifications
router.get('/verifications', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const query = ProviderVerification.find(filter)
      .populate('providerId', 'profile.name email phone')
      .sort({ createdAt: -1 });

    let records = await query;

    if (search) {
      const searchLower = String(search).toLowerCase();
      records = records.filter((r) => {
        const name = r.providerId?.profile?.name?.toLowerCase() || '';
        const email = r.providerId?.email?.toLowerCase() || '';
        const phone = r.providerId?.phone || '';
        return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
      });
    }

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

// APPROVE/REJECT provider verification
router.patch('/verifications/:verificationId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      status,
      adminComment,
      docReviews = [],
      screeningStatus,
      flagReason,
      badge,
    } = req.body;

    console.log('📋 KYC Review Request:', {
      verificationId: req.params.verificationId,
      docReviewsCount: docReviews.length,
      screeningStatus,
      status,
    });

    const allowedStatuses = ['submitted', 'under_review', 'needs_correction', 'approved', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const verification = await ProviderVerification.findById(req.params.verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }

    // Update documents with review status
    if (Array.isArray(docReviews) && docReviews.length > 0) {
      console.log('Processing doc reviews:', docReviews.length);
      
      docReviews.forEach((review) => {
        if (!review?.docId) {
          console.warn('⚠️ Review missing docId:', review);
          return;
        }

        console.log('Updating doc:', review.docId, 'with status:', review.status);
        
        let targetDoc = null;
        
        // Try to find in documents array
        if (verification.documents && verification.documents.length > 0) {
          targetDoc = verification.documents.find(d => String(d._id) === String(review.docId));
        }
        
        // Try to find in addressDocuments array if not found
        if (!targetDoc && verification.addressDocuments && verification.addressDocuments.length > 0) {
          targetDoc = verification.addressDocuments.find(d => String(d._id) === String(review.docId));
        }
        
        if (targetDoc) {
          if (review.status) targetDoc.status = review.status;
          if (typeof review.adminComment === 'string') targetDoc.adminComment = review.adminComment;
          if (typeof review.rejectionReason === 'string') targetDoc.rejectionReason = review.rejectionReason;
          console.log('✅ Updated doc successfully');
        } else {
          console.warn('⚠️ Document not found:', review.docId);
        }
      });
    }

    // Determine overall status based on document reviews
    const allDocs = [
      ...(verification.documents || []),
      ...(verification.addressDocuments || []),
    ];
    
    console.log('Total docs to check:', allDocs.length);
    const anyRejected = allDocs.some((doc) => doc.status === 'rejected');
    const allApproved = allDocs.length > 0 && allDocs.every((doc) => doc.status === 'approved');

    let derivedStatus = status || null;
    if (!derivedStatus) {
      if (anyRejected) derivedStatus = 'needs_correction';
      else if (allApproved) derivedStatus = 'approved';
      else if (docReviews.length > 0) derivedStatus = 'under_review';
      else derivedStatus = verification.status || 'submitted';
    }

    console.log('Derived status:', derivedStatus, 'anyRejected:', anyRejected, 'allApproved:', allApproved);

    verification.status = derivedStatus;
    if (typeof adminComment === 'string') {
      verification.adminComment = adminComment || null;
    }
    if (screeningStatus) verification.screeningStatus = screeningStatus;
    if (typeof flagReason === 'string') verification.flagReason = flagReason || null;
    
    // Save badge to verification document if approved
    if (derivedStatus === 'approved' && badge) {
      verification.badge = badge;
    }

    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user._id;
    verification.auditLogs = verification.auditLogs || [];
    verification.auditLogs.push({
      action: `review_${derivedStatus}`,
      note: adminComment || null,
      by: req.user._id,
    });

    await verification.save();
    console.log('✅ Verification saved with status:', derivedStatus);

    const User = require('../models/User');
    const { normalizeKycStatus } = require('../utils/kyc');
    
    if (derivedStatus === 'approved') {
      const nextBadge = badge || 'verified';
      console.log('Approving provider with badge:', nextBadge);
      
      // Fetch user first and ensure badges is an array
      const user = await User.findById(verification.providerId);
      if (user) {
        // Ensure providerDetails.badges is an array
        if (!Array.isArray(user.providerDetails.badges)) {
          user.providerDetails.badges = [];
        }
        
        // Add badge if it doesn't already exist
        if (!user.providerDetails.badges.includes(nextBadge)) {
          user.providerDetails.badges.push(nextBadge);
        }
        
        // Update KYC status
        user.kycStatus = normalizeKycStatus(derivedStatus);
        
        // Save the user
        await user.save();
        console.log('✅ Provider updated with approved status and badge:', nextBadge);
      } else {
        console.warn('⚠️ Provider user not found:', verification.providerId);
      }
    } else if (['rejected', 'needs_correction', 'under_review', 'submitted'].includes(derivedStatus)) {
      console.log('Setting provider KYC status to:', derivedStatus);
      
      await User.findByIdAndUpdate(verification.providerId, {
        kycStatus: normalizeKycStatus(derivedStatus),
      });
      console.log('✅ Provider updated with status:', derivedStatus);
    }

    const { createNotification } = require('../utils/createNotification');
    if (['approved', 'rejected', 'needs_correction'].includes(derivedStatus)) {
      const rejectedDocs = allDocs
        .filter((doc) => doc.status === 'rejected')
        .map((doc) => doc.type)
        .join(', ');

      const baseMessage = adminComment || `Your verification was ${derivedStatus.replace('_', ' ')}.`;
      const message = rejectedDocs
        ? `${baseMessage} Please reupload: ${rejectedDocs}.`
        : baseMessage;

      console.log('Sending notification with message:', message);
      
      await createNotification({
        userId: verification.providerId,
        type: `verification_${derivedStatus}`,
        title:
          derivedStatus === 'approved'
            ? 'Verification Approved'
            : derivedStatus === 'needs_correction'
            ? 'Verification Needs Correction'
            : 'Verification Rejected',
        message,
        category: 'verification',
        metadata: { verificationId: verification._id },
      });
      console.log('✅ Notification sent to provider');
    }

    console.log('✅ KYC Review completed successfully');
    res.json({ success: true, data: verification });
  } catch (err) {
    console.error('❌ KYC Review Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    next(err);
  }
});

// ============================================
// DISPUTES (ADMIN)
// ============================================
router.get('/chat/booking/:bookingId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { before, limit = 30 } = req.query;

    const { booking } = await ensureBookingForChat({
      bookingId,
      user: { id: req.user.id, role: req.user.role },
      allowAdminRead: true,
      adminDisputeOnly: true,
    });

    const conversation = await Conversation.findOne({ bookingId: booking._id }).lean();
    const history = await getBookingChatHistory({
      bookingId: booking._id,
      before,
      limit,
    });

    res.json({
      booking: {
        _id: booking._id,
        status: booking.status,
        disputeId: booking.disputeId || null,
        clientId: booking.clientId?._id || booking.clientId,
        providerId: booking.providerId?._id || booking.providerId,
      },
      conversation,
      messages: history.messages,
      pagination: {
        hasMore: history.hasMore,
        nextBefore: history.nextBefore,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/disputes', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('bookingId', 'clientId providerId status')
      .populate('openedBy', 'profile.name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
});

router.patch('/disputes/:id/resolve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { adminResolution } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      {
        adminResolution,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
      { new: true }
    );

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    if (dispute.bookingId) {
      const booking = await Booking.findById(dispute.bookingId).select('clientId providerId status');
      if (booking) {
        const { createNotification } = require('../utils/createNotification');
        const message = adminResolution || 'Your dispute has been resolved by admin.';

        if (booking.clientId) {
          await createNotification({
            userId: booking.clientId,
            type: 'dispute_resolved',
            title: 'Dispute Resolved',
            message,
            disputeId: dispute._id,
            bookingId: dispute.bookingId,
          });
        }

        if (booking.providerId) {
          await createNotification({
            userId: booking.providerId,
            type: 'dispute_resolved',
            title: 'Dispute Resolved',
            message,
            disputeId: dispute._id,
            bookingId: dispute.bookingId,
          });
        }

        if (adminResolution === 'booking_valid') {
          booking.status = 'awaiting_client_confirmation';
        } else if (adminResolution === 'refund_full' || adminResolution === 'refund_partial') {
          booking.status = 'resolved_refunded';
        } else if (adminResolution === 'reservice') {
          booking.status = 'confirmed';
        }

        await booking.save();
      }
    }

    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
});

// ============================================
// REVIEWS (ADMIN)
// ============================================

router.get('/reviews', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('clientId', 'profile.name email')
      .populate('providerId', 'profile.name email')
      .populate('bookingId', '_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments();

    res.json({ 
      success: true, 
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE a review (admin moderation)
router.delete('/reviews/:reviewId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.reviewId);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, message: 'Review removed successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================
// PROVIDER STATUS MANAGEMENT
// ============================================

// GET all providers with their status
router.get('/providers/status/list', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { providerStatus, search } = req.query;

    let filter = { role: 'provider' };
    if (providerStatus) filter.providerStatus = providerStatus;
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const providers = await User.find(filter)
      .select('profile email phone providerStatus providerDetails.badges providerDetails.completedBookings createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

// UPDATE provider status (pending -> verified/rejected)
router.patch('/providers/:providerId/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { providerStatus, adminComment } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(providerStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid provider status' });
    }

    const provider = await User.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'User is not a provider' });
    }

    const previousStatus = provider.providerStatus;
    provider.providerStatus = providerStatus;

    // Add admin comment if provided
    if (adminComment && provider.admin) {
      provider.admin.notes = adminComment;
    } else if (adminComment) {
      provider.admin = { notes: adminComment };
    }

    await provider.save();

    // Broadcast notification to provider
    const message = `Your provider account status has been updated to: ${providerStatus}`;
    broadcastToRole('provider', {
      type: 'provider_status_changed',
      title: 'Provider Status Update',
      message: message,
      providerId: provider._id,
      newStatus: providerStatus,
      previousStatus: previousStatus,
    });

    res.json({
      success: true,
      message: `Provider status updated from ${previousStatus} to ${providerStatus}`,
      data: {
        providerId: provider._id,
        name: provider.profile?.name,
        email: provider.email,
        providerStatus: provider.providerStatus,
        adminComment: provider.admin?.notes || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET provider details for admin review
router.get('/providers/:providerId/details', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');

    const provider = await User.findById(req.params.providerId).select(
      'profile email phone providerStatus providerDetails admin createdAt'
    );

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'User is not a provider' });
    }

    res.json({
      success: true,
      data: {
        _id: provider._id,
        name: provider.profile?.name,
        email: provider.email,
        phone: provider.phone,
        providerStatus: provider.providerStatus,
        categories: provider.providerDetails?.categories || [],
        hourlyRate: provider.providerDetails?.hourlyRate,
        basePrice: provider.providerDetails?.basePrice,
        experienceYears: provider.providerDetails?.experienceYears,
        rating: provider.providerDetails?.rating,
        completedBookings: provider.providerDetails?.completedBookings,
        verificationDocs: provider.providerDetails?.verificationDocs || [],
        adminNotes: provider.admin?.notes || null,
        createdAt: provider.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET all users (clients and providers)
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { role, status, search } = req.query;

    let filter = {};
    if (role && role !== 'all') filter.role = role;
    if (status && status !== 'all') {
      if (status === 'suspended') {
        filter.accountStatus = 'suspended';
      } else if (status === 'active') {
        filter.accountStatus = { $ne: 'suspended' };
      }
    }
    if (search) {
      filter.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('profile email phone role providerDetails accountStatus createdAt location providerStatus')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET all bookings with search
router.get('/bookings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    let bookings = [];

    if (search) {
      // Search by booking ID or populate and search user/service details
      const User = require('../models/User');
      
      // Try to find users matching the search
      const matchingUsers = await User.find({
        $or: [
          { 'profile.name': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      // Search bookings by user IDs or booking ID
      filter.$or = [
        { clientId: { $in: userIds } },
        { providerId: { $in: userIds } },
      ];

      // If search looks like an ID, include it
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        filter.$or.push({ _id: search });
      }
    }

    bookings = await Booking.find(filter)
      .populate('clientId', 'profile email')
      .populate('providerId', 'profile email')
      .populate('serviceId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

// GET all services with search
router.get('/services', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let filter = {};
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
        filter.adminDisabled = false;
      } else if (status === 'inactive') {
        filter.$or = [{ isActive: false }, { adminDisabled: true }];
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const services = await Service.find(filter)
      .populate('providerId', 'profile email')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id/suspend - Toggle suspend status
router.patch('/users/:id/suspend', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Toggle suspend status
    const newStatus = user.accountStatus === 'suspended' ? 'active' : 'suspended';
    user.accountStatus = newStatus;
    await user.save();

    // Send notification to user
    const createNotification = require('../utils/createNotification');
    await createNotification({
      userId: user._id,
      type: 'account_update',
      title: newStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
      message: newStatus === 'suspended' 
        ? 'Your account has been suspended by an administrator. Please contact support for more information.'
        : 'Your account has been reactivated. You can now use all services.',
      priority: 'high',
    });

    res.json({
      success: true,
      message: `User ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`,
      data: { accountStatus: newStatus },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - mark as deleted and suspended
    user.accountStatus = 'deleted';
    user.isDeleted = true;
    await user.save();

    // Note: You may want to also handle:
    // - Canceling active bookings
    // - Archiving services if provider
    // - Handling payments/refunds

    res.json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id/verify - Verify a provider
router.patch('/users/:id/verify', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'provider') {
      return res.status(400).json({ success: false, message: 'Can only verify provider accounts' });
    }

    // Update provider verification status
    user.providerStatus = 'verified';
    
    // Add verified badge if not already present
    if (!user.providerDetails) {
      user.providerDetails = {};
    }
    const currentBadges = Array.isArray(user.providerDetails.badges)
      ? user.providerDetails.badges
      : user.providerDetails.badges
      ? [user.providerDetails.badges]
      : [];

    user.providerDetails.badges = currentBadges.includes('verified')
      ? currentBadges
      : [...currentBadges, 'verified'];
    
    await user.save();

    // Send notification to provider
    const createNotification = require('../utils/createNotification');
    await createNotification({
      userId: user._id,
      type: 'verification_approved',
      title: 'Provider Verification Approved',
      message: 'Congratulations! Your provider account has been verified. You can now offer services.',
      priority: 'high',
    });

    res.json({
      success: true,
      message: 'Provider verified successfully',
      data: {
        providerStatus: user.providerStatus,
        badges: user.providerDetails.badges,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
