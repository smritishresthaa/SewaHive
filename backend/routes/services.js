const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const Service = require("../models/Service");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const ProviderVerification = require("../models/ProviderVerification");
const serviceImageUpload = require("../middleware/serviceImageUpload");
const { isWithinCoverage } = require("../utils/geo");

const router = express.Router();

/**
 * Helper: Check if provider has approved KYC
 */
async function isProviderVerified(providerId) {
  const user = await User.findById(providerId).select("kycStatus");
  if (user?.kycStatus === "approved") return true;

  const verification = await ProviderVerification.findOne({
    providerId,
  }).sort({ createdAt: -1 });

  return verification && verification.status === "approved";
}

async function getApprovedProviderIds(providerIds) {
  if (!providerIds || providerIds.length === 0) return new Set();

  const users = await User.find({
    _id: { $in: providerIds },
    role: "provider",
    kycStatus: "approved",
  }).select("_id");

  const approved = new Set(users.map((u) => String(u._id)));

  const remainingIds = providerIds.filter((id) => !approved.has(String(id)));
  if (remainingIds.length === 0) return approved;

  const legacyApproved = await ProviderVerification.find({
    providerId: { $in: remainingIds },
    status: "approved",
  }).select("providerId");

  legacyApproved.forEach((record) => {
    approved.add(String(record.providerId));
  });

  return approved;
}

function normalizeServicePriceMode(raw = "fixed") {
  const value = String(raw || "fixed").trim().toLowerCase();

  if (
    value === "quote_required" ||
    value === "quote" ||
    value === "quote_based" ||
    value === "quotebased"
  ) {
    return "quote_required";
  }

  if (value === "range") return "range";
  return "fixed";
}

/**
 * Helper: derive emergency information consistently
 */
function buildEmergencyMeta(service) {
  const emergencyPrice = Math.max(0, Number(service?.emergencyPrice || 0));
  const category = service?.categoryId;
  const priceMode = normalizeServicePriceMode(service?.priceMode);
  const supportsEmergencyPricing = priceMode === "fixed" || priceMode === "range";

  const categoryAllowsEmergency =
    category?.status === "active" && category?.emergencyServiceAllowed === true;

  const serviceAvailable =
    service?.isActive !== false && service?.adminDisabled !== true;

  const canRequestEmergency =
    serviceAvailable &&
    categoryAllowsEmergency &&
    supportsEmergencyPricing &&
    emergencyPrice > 0;

  let blockingReason = null;

  if (!serviceAvailable) {
    blockingReason = "Service is inactive or disabled";
  } else if (!categoryAllowsEmergency) {
    blockingReason = "Emergency is not enabled for this category";
  } else if (!supportsEmergencyPricing) {
    blockingReason = "Emergency booking is only supported for fixed and range services";
  } else if (emergencyPrice <= 0) {
    blockingReason = "Emergency price must be greater than 0";
  }

  return {
    emergencyPrice,
    priceMode,
    supportsEmergencyPricing,
    categoryAllowsEmergency,
    allowedByCategory: categoryAllowsEmergency,
    serviceAvailable,
    canRequestEmergency,
    blockingReason,
  };
}

function attachEmergencyMeta(serviceDoc) {
  const service =
    typeof serviceDoc?.toObject === "function" ? serviceDoc.toObject() : serviceDoc;

  return {
    ...service,
    emergencyMeta: buildEmergencyMeta(service),
  };
}

async function getServiceStatsMap(serviceIds = []) {
  const ids = serviceIds.map((id) => String(id)).filter(Boolean);
  if (!ids.length) return new Map();

  const { Types } = require("mongoose");
  const Booking = require("../models/Booking");
  const Review = require("../models/Review");

  const objectIds = ids.map((id) => new Types.ObjectId(id));

  const COUNTABLE_BOOKING_STATUSES = [
    "pending_payment",
    "quote_requested",
    "quote_sent",
    "quote_pending_admin_review",
    "quote_accepted",
    "accepted",
    "confirmed",
    "provider_en_route",
    "in-progress",
    "provider_completed",
    "awaiting_client_confirmation",
    "pending-completion",
    "completed",
    "disputed",
  ];

  const bookingsAgg = await Booking.aggregate([
    {
      $match: {
        serviceId: { $in: objectIds },
        status: { $in: COUNTABLE_BOOKING_STATUSES },
      },
    },
    {
      $group: {
        _id: "$serviceId",
        bookingsCount: { $sum: 1 },
      },
    },
  ]);

  const reviewsAgg = await Review.aggregate([
    {
      $lookup: {
        from: "bookings",
        localField: "bookingId",
        foreignField: "_id",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    {
      $match: {
        "booking.serviceId": { $in: objectIds },
      },
    },
    {
      $group: {
        _id: "$booking.serviceId",
        ratingCount: { $sum: 1 },
        ratingAvg: { $avg: "$rating" },
      },
    },
  ]);

  const bookingsMap = new Map(
    bookingsAgg.map((item) => [String(item._id), Number(item.bookingsCount || 0)])
  );

  const reviewsMap = new Map(
    reviewsAgg.map((item) => [
      String(item._id),
      {
        ratingCount: Number(item.ratingCount || 0),
        ratingAvg: Number(item.ratingAvg || 0),
      },
    ])
  );

  return new Map(
    ids.map((id) => [
      id,
      {
        bookingsCount: bookingsMap.get(id) || 0,
        ratingCount: reviewsMap.get(id)?.ratingCount || 0,
        ratingAvg: reviewsMap.get(id)?.ratingAvg || 0,
      },
    ])
  );
}

async function withDynamicServiceStats(services = []) {
  const statsMap = await getServiceStatsMap(services.map((s) => s._id));
  return services.map((serviceDoc) => {
    const service = attachEmergencyMeta(serviceDoc);
    const stats = statsMap.get(String(service._id)) || { bookingsCount: 0, ratingCount: 0, ratingAvg: 0 };
    service.bookingsCount = stats.bookingsCount;
    service.ratingCount = stats.ratingCount || service.ratingCount || 0;
    service.ratingAvg = stats.ratingAvg || service.ratingAvg || 0;
    service.views = Number(service.views || 0);
    return service;
  });
}

/**
 * Get popular services (public, for landing page)
 * Sorted by bookingsCount desc, then ratingAvg desc
 */
router.get("/popular", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    let services = await Service.find({
      isActive: true,
      adminDisabled: { $ne: true },
    })
      .populate(
        "categoryId",
        "name icon iconKey image status emergencyServiceAllowed"
      )
      .populate("subcategoryId", "name status")
      .populate(
        "providerId",
        "profile.name profile.avatarUrl providerDetails.badges providerDetails.rating kycStatus"
      )
      .sort({ bookingsCount: -1, ratingAvg: -1 })
      .limit(limit * 3);

    services = services.filter((s) => s.categoryId?.status === "active");
    services = services.slice(0, limit);

    const statsMap = await getServiceStatsMap(services.map((s) => s._id));
    const formatted = services.map((s) => {
      const emergencyMeta = buildEmergencyMeta(s);
      const dynamicStats = statsMap.get(String(s._id)) || { bookingsCount: 0, ratingCount: 0, ratingAvg: 0 };

      return {
        _id: s._id,
        title: s.title,
        description: s.description,
        images: s.images || [],
        image: s.images?.[0] || s.categoryId?.image || null,
        basePrice: s.basePrice,
        emergencyPrice: s.emergencyPrice || 0,
        priceMode: s.priceMode,
        priceRange: s.priceRange || {},
        views: Number(s.views || 0),
        ratingAvg: dynamicStats.ratingAvg || s.ratingAvg || 0,
        ratingCount: dynamicStats.ratingCount || s.ratingCount || 0,
        bookingsCount: dynamicStats.bookingsCount,
        emergencyMeta,
        category: s.categoryId
          ? {
              _id: s.categoryId._id,
              name: s.categoryId.name,
              icon: s.categoryId.icon,
              iconKey: s.categoryId.iconKey,
              emergencyServiceAllowed: s.categoryId.emergencyServiceAllowed,
            }
          : null,
        provider: s.providerId
          ? {
              _id: s.providerId._id,
              name: s.providerId.profile?.name || "Service Provider",
              avatar: s.providerId.profile?.avatarUrl || null,
              badges: s.providerId.providerDetails?.badges || [],
              kycStatus: s.providerId.kycStatus,
              rating: s.providerId.providerDetails?.rating || {},
              completionRate: s.providerId.providerDetails?.completedBookings || 0,
            }
          : null,
      };
    });

    res.json({ success: true, services: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * List services (with optional location & category filter)
 */
router.get("/list", async (req, res, next) => {
  try {
    const { categoryId, lng, lat, radius = 5000 } = req.query;

    const query = { isActive: true, adminDisabled: { $ne: true } };
    if (categoryId) query.categoryId = categoryId;

    let services = await Service.find(query)
      .populate(
        "categoryId",
        "name icon iconKey image status emergencyServiceAllowed"
      )
      .populate("subcategoryId", "name status")
      .populate(
        "providerId",
        "kycStatus profile.name profile.avatarUrl providerDetails.badges providerDetails.rating providerDetails.metrics providerDetails.approvedCategories providerDetails.coverage providerDetails.trustScore"
      )
      .limit(100);

    services = services.filter((service) => {
      if (service.categoryId?.status !== "active") return false;
      return true;
    });

    if (lng && lat) {
      const clientLocation = [Number(lng), Number(lat)];

      services = services.filter((service) => {
        const coverage = service.providerId?.providerDetails?.coverage;
        const check = isWithinCoverage(coverage, clientLocation);
        return check.isWithinRange;
      });

      services.sort((a, b) => {
        const scoreA = a.providerId?.providerDetails?.trustScore || 0;
        const scoreB = b.providerId?.providerDetails?.trustScore || 0;
        return scoreB - scoreA;
      });
    } else {
      services.sort((a, b) => {
        const scoreA = a.providerId?.providerDetails?.trustScore || 0;
        const scoreB = b.providerId?.providerDetails?.trustScore || 0;
        return scoreB - scoreA;
      });
    }

    const enrichedServices = await withDynamicServiceStats(services);

    res.json({ services: enrichedServices });
  } catch (e) {
    next(e);
  }
});

/**
 * Upload service images (provider only)
 */
router.post(
  "/upload-images",
  authGuard,
  roleGuard(["provider"]),
  serviceImageUpload.array("images", 6),
  async (req, res, next) => {
    try {
      const images = (req.files || [])
        .map((file) => file.path || file.secure_url || file.url)
        .filter(Boolean);

      if (images.length === 0) {
        return res.status(400).json({ message: "No valid images uploaded" });
      }

      res.json({ success: true, images });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Get provider's own services
 */
router.get(
  "/my-services",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const services = await Service.find({ providerId: req.user.id })
        .populate(
          "categoryId",
          "name status icon iconKey description recommendedPriceRange emergencyServiceAllowed"
        )
        .populate("subcategoryId", "name status");

      const enrichedServices = await withDynamicServiceStats(services);

      res.json({ services: enrichedServices });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Get single service by ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    await Service.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    const service = await Service.findById(req.params.id)
      .populate("providerId", "profile providerDetails kycStatus")
      .populate(
        "categoryId",
        "name status icon iconKey description recommendedPriceRange emergencyServiceAllowed"
      )
      .populate("subcategoryId", "name status");

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    let kycStatus = service.providerId?.kycStatus;
    const verification = await ProviderVerification.findOne({
      providerId: service.providerId?._id,
    }).sort({ createdAt: -1 });

    if (verification?.status) {
      kycStatus = verification.status;
    }

    const [serviceJson] = await withDynamicServiceStats([service]);
    serviceJson.providerKycStatus = kycStatus;

    res.json({ service: serviceJson });
  } catch (e) {
    next(e);
  }
});

/**
 * Create service
 */
router.post(
  "/create",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      if (!req.body.categoryId) {
        return res.status(400).json({
          message: "Category is required. Please select a category or request a new one.",
        });
      }

      const category = await Category.findById(req.body.categoryId).select("status");
      if (!category) {
        return res.status(404).json({ message: "Selected category does not exist" });
      }
      if (category.status !== "active") {
        return res.status(403).json({ message: "Selected category is inactive" });
      }

      if (req.body.subcategoryId) {
        const subcategory = await Subcategory.findById(req.body.subcategoryId).select(
          "status categoryId"
        );
        if (!subcategory) {
          return res.status(404).json({ message: "Selected subcategory does not exist" });
        }
        if (subcategory.status !== "active") {
          return res.status(403).json({ message: "Selected subcategory is inactive" });
        }
        if (String(subcategory.categoryId) !== String(req.body.categoryId)) {
          return res
            .status(400)
            .json({ message: "Subcategory does not belong to selected category" });
        }
      }

      const requestedActive = req.body.isActive !== false;
      if (requestedActive) {
        const isVerified = await isProviderVerified(req.user.id);
        if (!isVerified) {
          const verification = await ProviderVerification.findOne({
            providerId: req.user.id,
          }).sort({ createdAt: -1 });

          return res.status(403).json({
            message: "KYC verification required to publish services",
            reason:
              "You can create draft services, but must complete KYC verification before publishing them.",
            kycStatus: verification?.status || "not_submitted",
            suggestion: "Create as draft (isActive: false) or complete KYC verification first.",
          });
        }

        const user = await User.findById(req.user.id).select(
          "providerDetails.approvedCategories"
        );
        const isCategoryApproved = user.providerDetails.approvedCategories.some(
          (id) => id.toString() === req.body.categoryId
        );

        if (!isCategoryApproved) {
          return res.status(403).json({
            message: "Category skill proof required",
            reason:
              "You must submit and get approval for your skill proof in this category before publishing services.",
            suggestion:
              "Go to your Trust Center to upload your portfolio and tools for this category.",
          });
        }
      }

      const payload = {
        providerId: req.user.id,
        categoryId: req.body.categoryId,
        subcategoryId: req.body.subcategoryId || null,
        title: req.body.title,
        description: req.body.description,
        images: req.body.images,
        priceMode: req.body.priceMode,
        basePrice: req.body.basePrice,
        emergencyPrice: req.body.emergencyPrice,
        includedHours: req.body.includedHours,
        hourlyRate: req.body.hourlyRate,
        fixedRate: req.body.fixedRate,
        priceRange: req.body.priceRange,
        quoteDescription: req.body.quoteDescription,
        visitFee: req.body.visitFee,
        availability: req.body.availability,
        coverage: req.body.coverage,
        maxDistance: req.body.maxDistance,
        isActive: requestedActive,
      };

      const service = await Service.create(payload);
      res.json({ id: service._id });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update service
 */
router.post(
  "/update/:id",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const service = await Service.findOne({ _id: id, providerId: req.user.id });

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (service.adminDisabled) {
        return res.status(403).json({ message: "Service is restricted by admin" });
      }

      if (req.body.categoryId && String(req.body.categoryId) !== String(service.categoryId)) {
        const category = await Category.findById(req.body.categoryId).select("status");
        if (!category) {
          return res.status(404).json({ message: "Selected category does not exist" });
        }
        if (category.status !== "active") {
          return res.status(403).json({ message: "Selected category is inactive" });
        }
      }

      if (req.body.subcategoryId) {
        const targetCategoryId = req.body.categoryId || service.categoryId;
        const subcategory = await Subcategory.findById(req.body.subcategoryId).select(
          "status categoryId"
        );
        if (!subcategory) {
          return res.status(404).json({ message: "Selected subcategory does not exist" });
        }
        if (subcategory.status !== "active") {
          return res.status(403).json({ message: "Selected subcategory is inactive" });
        }
        if (String(subcategory.categoryId) !== String(targetCategoryId)) {
          return res
            .status(400)
            .json({ message: "Subcategory does not belong to selected category" });
        }
      }

      if (req.body.isActive === true && !service.isActive) {
        const isVerified = await isProviderVerified(req.user.id);
        if (!isVerified) {
          const verification = await ProviderVerification.findOne({
            providerId: req.user.id,
          }).sort({ createdAt: -1 });

          return res.status(403).json({
            message: "KYC verification required to activate service",
            reason: "You must complete KYC verification before publishing services.",
            kycStatus: verification?.status || "not_submitted",
          });
        }

        const targetCategoryId = req.body.categoryId || service.categoryId;
        const user = await User.findById(req.user.id).select(
          "providerDetails.approvedCategories"
        );
        const isCategoryApproved = user.providerDetails.approvedCategories.some(
          (id) => id.toString() === targetCategoryId.toString()
        );

        if (!isCategoryApproved) {
          return res.status(403).json({
            message: "Category skill proof required",
            reason:
              "You must submit and get approval for your skill proof in this category before publishing services.",
            suggestion:
              "Go to your Trust Center to upload your portfolio and tools for this category.",
          });
        }
      }

      if (req.body.categoryId && String(req.body.categoryId) !== String(service.categoryId)) {
        if (req.body.subcategoryId === undefined) {
          service.subcategoryId = null;
        }
      }

      const allowedUpdates = [
        "categoryId",
        "subcategoryId",
        "title",
        "description",
        "images",
        "priceMode",
        "basePrice",
        "emergencyPrice",
        "includedHours",
        "hourlyRate",
        "fixedRate",
        "priceRange",
        "quoteDescription",
        "visitFee",
        "availability",
        "coverage",
        "maxDistance",
        "isActive",
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          service[field] = req.body[field];
        }
      });

      await service.save();

      res.json({ service });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Delete service
 */
router.delete(
  "/delete/:id",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      await Service.deleteOne({ _id: id, providerId: req.user.id });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;