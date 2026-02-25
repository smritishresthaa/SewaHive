// routes/services.js
const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const Service = require("../models/Service");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const ProviderVerification = require("../models/ProviderVerification");

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

/**
 * List services (with optional location & category filter)
 */
router.get("/list", async (req, res, next) => {
  try {
    const { categoryId, lng, lat, radius = 5000 } = req.query;

    const query = { isActive: true, adminDisabled: { $ne: true } };
    if (categoryId) query.categoryId = categoryId;

    let services = await Service.find(query)
      .populate('categoryId', 'name icon iconKey status')
      .populate('subcategoryId', 'name status')
      .populate('providerId', 'kycStatus profile.name profile.avatarUrl providerDetails.badges providerDetails.rating providerDetails.metrics providerDetails.approvedCategories')
      .limit(100);

    // Filter by: (1) category active, (2) provider KYC approved, (3) provider approved for this specific category
    services = services.filter((service) => {
      // Check category is active
      if (service.categoryId?.status !== 'active') return false;
      
      // TEMPORARILY DISABLED FOR TESTING UI
      // Check provider is KYC verified
      // if (service.providerId?.kycStatus !== 'approved') return false;
      
      // Check provider is approved for this specific category (skill proof approved)
      // const approvedCategoryIds = service.providerId.providerDetails?.approvedCategories || [];
      // return approvedCategoryIds.some(id => id.toString() === service.categoryId._id.toString());
      return true;
    });

    // Location filter
    if (lng && lat) {
      const approvedProviderIds = new Set(services.map(s => String(s.providerId._id)));
      if (approvedProviderIds.size === 0) {
        return res.json({ services: [] });
      }

      const providers = await User.find({
        role: "provider",
        _id: { $in: Array.from(approvedProviderIds) },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)],
            },
            $maxDistance: Number(radius),
          },
        },
      }).select("_id providerDetails.trustScore");

      const providerMap = new Map(providers.map((p) => [String(p._id), p.providerDetails?.trustScore || 0]));

      services = services.filter((s) =>
        providerMap.has(String(s.providerId._id))
      );

      // Sort by trust score (descending)
      services.sort((a, b) => {
        const scoreA = providerMap.get(String(a.providerId._id)) || 0;
        const scoreB = providerMap.get(String(b.providerId._id)) || 0;
        return scoreB - scoreA;
      });
    } else {
      // If no location filter, still sort by trust score
      const approvedProviderIds = new Set(services.map(s => String(s.providerId._id)));
      const providers = await User.find({
        role: "provider",
        _id: { $in: Array.from(approvedProviderIds) }
      }).select("_id providerDetails.trustScore");

      const providerMap = new Map(providers.map((p) => [String(p._id), p.providerDetails?.trustScore || 0]));

      services.sort((a, b) => {
        const scoreA = providerMap.get(String(a.providerId._id)) || 0;
        const scoreB = providerMap.get(String(b.providerId._id)) || 0;
        return scoreB - scoreA;
      });
    }

    res.json({ services });
  } catch (e) {
    next(e);
  }
});

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
      res.json({ services });
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
    const service = await Service.findById(req.params.id)
      .populate("providerId", "profile providerDetails kycStatus")
      .populate("categoryId", "name status icon iconKey description recommendedPriceRange")
      .populate("subcategoryId", "name status");
    if (!service)
      return res.status(404).json({ message: "Service not found" });

    // Fetch latest provider verification record
    let kycStatus = service.providerId?.kycStatus;
    const verification = await ProviderVerification.findOne({
      providerId: service.providerId?._id,
    }).sort({ createdAt: -1 });

    if (verification?.status) {
      kycStatus = verification.status;
    }

    // Attach KYC status to response for frontend
    const serviceJson = service.toJSON();
    serviceJson.providerKycStatus = kycStatus;

    res.json({ service: serviceJson });
  } catch (e) {
    next(e);
  }
});

/**
 * Create service
 * PHASE 2A: Allows draft creation, but blocks publishing without KYC approval
 */
router.post(
  "/create",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      // STRICT VALIDATION: categoryId is required
      if (!req.body.categoryId) {
        return res.status(400).json({ 
          message: "Category is required. Please select a category or request a new one." 
        });
      }

      // Validate category exists and is active
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
          return res.status(400).json({ message: "Subcategory does not belong to selected category" });
        }
      }

      // PHASE 2A: Check KYC verification if trying to publish/activate
      const requestedActive = req.body.isActive !== false; // Default is true
      if (requestedActive) {
        const isVerified = await isProviderVerified(req.user.id);
        if (!isVerified) {
          const verification = await ProviderVerification.findOne({ 
            providerId: req.user.id 
          }).sort({ createdAt: -1 });
          
          return res.status(403).json({ 
            message: "KYC verification required to publish services",
            reason: "You can create draft services, but must complete KYC verification before publishing them.",
            kycStatus: verification?.status || "not_submitted",
            suggestion: "Create as draft (isActive: false) or complete KYC verification first."
          });
        }

        // PHASE 1: Check Category Skill Proof Approval
        const user = await User.findById(req.user.id).select("providerDetails.approvedCategories");
        const isCategoryApproved = user.providerDetails.approvedCategories.some(
          (id) => id.toString() === req.body.categoryId
        );

        if (!isCategoryApproved) {
          return res.status(403).json({
            message: "Category skill proof required",
            reason: "You must submit and get approval for your skill proof in this category before publishing services.",
            suggestion: "Go to your Trust Center to upload your portfolio and tools for this category."
          });
        }
      }

      // Create service with only allowed fields
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
        isActive: requestedActive, // Will be true only if KYC verified (checked above)
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

      // Validate category if being updated
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
          return res.status(400).json({ message: "Subcategory does not belong to selected category" });
        }
      }

      // PHASE 2A: Block activation if trying to set isActive=true without KYC
      if (req.body.isActive === true && !service.isActive) {
        const isVerified = await isProviderVerified(req.user.id);
        if (!isVerified) {
          const verification = await ProviderVerification.findOne({ 
            providerId: req.user.id 
          }).sort({ createdAt: -1 });
          
          return res.status(403).json({ 
            message: "KYC verification required to activate service",
            reason: "You must complete KYC verification before publishing services.",
            kycStatus: verification?.status || "not_submitted"
          });
        }

        // PHASE 1: Check Category Skill Proof Approval
        const targetCategoryId = req.body.categoryId || service.categoryId;
        const user = await User.findById(req.user.id).select("providerDetails.approvedCategories");
        const isCategoryApproved = user.providerDetails.approvedCategories.some(
          (id) => id.toString() === targetCategoryId.toString()
        );

        if (!isCategoryApproved) {
          return res.status(403).json({
            message: "Category skill proof required",
            reason: "You must submit and get approval for your skill proof in this category before publishing services.",
            suggestion: "Go to your Trust Center to upload your portfolio and tools for this category."
          });
        }
      }

      // If category changes and no subcategory provided, clear subcategory
      if (req.body.categoryId && String(req.body.categoryId) !== String(service.categoryId)) {
        if (req.body.subcategoryId === undefined) {
          service.subcategoryId = null;
        }
      }

      // Update only allowed fields
      const allowedUpdates = [
        'categoryId', 'subcategoryId', 'title', 'description', 'images',
        'priceMode', 'basePrice', 'emergencyPrice', 'includedHours', 'hourlyRate', 'fixedRate',
        'priceRange', 'quoteDescription', 'visitFee', 'availability',
        'coverage', 'maxDistance', 'isActive'
      ];

      allowedUpdates.forEach(field => {
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
