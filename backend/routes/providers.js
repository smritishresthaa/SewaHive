// routes/providers.js
const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const User = require("../models/User");
const ProviderVerification = require("../models/ProviderVerification");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const ProviderWallet = require("../models/ProviderWallet");
const kycUpload = require("../middleware/kycUpload");
const { isKycApproved } = require("../utils/kyc");
const {
  getEmergencyToggleEligibility,
} = require("../middleware/emergencyEligibility");

const router = express.Router();const CategoryRequest = require("../models/CategoryRequest");
const ModerationQueue = require("../models/ModerationQueue");
const skillUpload = require("../middleware/skillUpload");

/**
 * Helper: build KYC payload from uploaded files
 */
function buildDocumentsPayload(files, documentType) {
  const docs = [];

  const pushDoc = (file, type) => {
    if (!file) return;
    docs.push({
      type,
      url: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      status: "pending",
    });
  };

  if (documentType === "citizenship") {
    pushDoc(files?.citizenshipFront?.[0], "citizenship-front");
    pushDoc(files?.citizenshipBack?.[0], "citizenship-back");
  }

  if (documentType === "passport") {
    pushDoc(files?.passport?.[0], "passport");
  }

  if (documentType === "driving_license") {
    pushDoc(files?.drivingLicenseFront?.[0], "driving-license-front");
    pushDoc(files?.drivingLicenseBack?.[0], "driving-license-back");
  }

  pushDoc(files?.selfie?.[0], "selfie");

  return docs;
}

function buildAddressPayload(files) {
  const docs = [];
  const addressFile = files?.addressProof?.[0];
  if (addressFile) {
    docs.push({
      type: "address-proof",
      url: addressFile.path,
      mimeType: addressFile.mimetype,
      sizeBytes: addressFile.size,
      status: "pending",
    });
  }
  return docs;
}

/**
 * GET current provider verification
 */
router.get(
  "/verification",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const verification = await ProviderVerification.findOne({ providerId: req.user.id }).sort({ createdAt: -1 });
      res.json({ verification });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET active categories for providers
 */
router.get(
  "/categories",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const categories = await Category.find({ status: "active" })
        .sort({ name: 1 })
        .select("name description icon image iconKey sortOrder recommendedPriceRange suggestedPriceMode status");

      res.json({ categories });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET active subcategories for providers
 */
router.get(
  "/subcategories",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { categoryId } = req.query;
      const filter = { status: "active" };
      if (categoryId) filter.categoryId = categoryId;

      const subcategories = await Subcategory.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .select("name description status sortOrder categoryId suggestedPriceMode");

      res.json({ subcategories });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET provider's category requests
 */
router.get(
  "/category-requests",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const requests = await CategoryRequest.find({ providerId: req.user.id })
        .populate('categoryId', 'name status')
        .populate('reviewedBy', 'profile.name email')
        .sort({ createdAt: -1 });

      res.json({ requests });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST create category request
 */
router.post(
  "/category-requests",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { name, description, justification } = req.body;

      if (!name || !description || !justification) {
        return res.status(400).json({ 
          message: "Category name, description, and justification are required" 
        });
      }

      // Check if category already exists
      const existingCategory = await Category.findOne({ 
        name: { $regex: `^${name.trim()}$`, $options: 'i' } 
      });

      if (existingCategory) {
        return res.status(400).json({ 
          message: `Category "${existingCategory.name}" already exists. Please select it from the list.` 
        });
      }

      // Check if provider already has a pending request for this category
      const existingRequest = await CategoryRequest.findOne({
        providerId: req.user.id,
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        status: 'pending'
      });

      if (existingRequest) {
        return res.status(400).json({ 
          message: "You already have a pending request for this category" 
        });
      }

      const request = await CategoryRequest.create({
        providerId: req.user.id,
        name: name.trim(),
        description: description.trim(),
        justification: justification.trim(),
      });

      res.json({ 
        success: true, 
        message: "Category request submitted successfully. Admin will review it soon.",
        request 
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST upload/update category skill proof (Phase 1)
 */
router.post(
  "/skills/:categoryId",
  authGuard,
  roleGuard(["provider"]),
  skillUpload.fields([
    { name: "portfolioBefore", maxCount: 5 },
    { name: "portfolioAfter", maxCount: 5 },
    { name: "certificateImage", maxCount: 5 },
  ]),
  async (req, res, next) => {
    try {
      const { categoryId } = req.params;
      // Handle multipart/form-data text fields
      let { experienceDescription, tools } = req.body;

      // Parse 'tools' if it comes as a comma-separated string (common in FormData)
      if (typeof tools === "string") {
        tools = tools.split(",").map((t) => t.trim()).filter((t) => t);
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Check if category exists
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });

      // Process uploaded files
      const portfolioItems = [];
      
      // Handle BEFORE photos
      if (req.files && req.files.portfolioBefore) {
        req.files.portfolioBefore.forEach((file) => {
          portfolioItems.push({
            url: file.path,
            description: "Before Service",
            type: "before",
            uploadedAt: new Date(),
          });
        });
      }

      // Handle AFTER photos
      if (req.files && req.files.portfolioAfter) {
        req.files.portfolioAfter.forEach((file) => {
          portfolioItems.push({
            url: file.path,
            description: "After Service",
            type: "after", // Using 'work' or specific 'after' if schema updated
            uploadedAt: new Date(),
          });
        });
      }

      const certificateItems = [];
      if (req.files && req.files.certificateImage) {
        req.files.certificateImage.forEach((file) => {
          certificateItems.push({
            name: "Certificate", // Default name
            url: file.path,
            issuer: "Self Upload", // Default
            year: new Date().getFullYear(),
            uploadedAt: new Date(),
          });
        });
      }

      // Find existing skill proof for this category
      const existingProofIndex = user.providerDetails.skillProofs.findIndex(
        (p) => p.categoryId.toString() === categoryId
      );

      const newProofData = {
        categoryId,
        status: "pending_review",
        experienceDescription: experienceDescription || "",
        tools: tools || [],
        submittedAt: new Date(),
      };

      if (existingProofIndex >= 0) {
        // Update existing proof
        // We REPLACE the existing portfolio/certificates with the new ones if new ones are provided.
        // This prevents duplication on re-submission.
        // If no new files are uploaded, we keep the old ones.

        const existingProof = user.providerDetails.skillProofs[existingProofIndex];
        
      // 0. Base portfolio: start with existing ones
      let updatedPortfolio = existingProof.portfolio || [];

      // 1. If 'before' photos were uploaded, remove old 'before' photos
      if (req.files && req.files.portfolioBefore) {
        updatedPortfolio = updatedPortfolio.filter(p => p.type !== 'before');
      }

      // 2. If 'after' photos were uploaded, remove old 'after' photos
      if (req.files && req.files.portfolioAfter) {
        updatedPortfolio = updatedPortfolio.filter(p => p.type !== 'after');
      }

      // 3. Add the new items
      updatedPortfolio = [...updatedPortfolio, ...portfolioItems];

      // Certificates: Replace if new ones uploaded
      let updatedCertificates = existingProof.certificates || [];
      if (certificateItems.length > 0) {
        updatedCertificates = certificateItems;
      }

      user.providerDetails.skillProofs[existingProofIndex] = {
        ...existingProof.toObject(),
        ...newProofData,
        portfolio: updatedPortfolio,
        certificates: updatedCertificates,
        status: "pending_review",
      };
      } else {
        // Add new proof
        user.providerDetails.skillProofs.push({
          ...newProofData,
          portfolio: portfolioItems,
          certificates: certificateItems,
        });
      }

      await user.save();

      res.json({
        success: true,
        message: "Skill proof submitted successfully. Pending admin review.",
        skillProofs: user.providerDetails.skillProofs,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET provider skill credibility (Phase 1)
 */
router.get(
  "/:id/skills",
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id)
        .select("providerDetails.skillProofs providerDetails.approvedCategories role")
        .populate("providerDetails.approvedCategories", "name icon")
        .populate("providerDetails.skillProofs.categoryId", "name icon");
        
      if (!user || user.role !== "provider") {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json({ 
        approvedCategories: user.providerDetails.approvedCategories,
        skillProofs: user.providerDetails.skillProofs 
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET provider trust metrics and badges (Phase 3)
 */
router.get(
  "/:id/trust",
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).select("providerDetails.metrics providerDetails.badges providerDetails.trustScore kycStatus role");
      if (!user || user.role !== "provider") {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json({ trust: {
        metrics: user.providerDetails.metrics,
        badges: user.providerDetails.badges,
        trustScore: user.providerDetails.trustScore,
        kycStatus: user.kycStatus
      }});
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST flag provider content (Phase 2)
 */
router.post(
  "/:id/flag",
  authGuard,
  async (req, res, next) => {
    try {
      const { contentType, contentId, reason } = req.body;
      
      if (!['portfolio', 'certificate'].includes(contentType)) {
        return res.status(400).json({ message: "Invalid content type" });
      }

      const provider = await User.findById(req.params.id);
      if (!provider || provider.role !== "provider") {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Verify content exists
      let contentExists = false;
      if (contentType === 'portfolio') {
        contentExists = provider.providerDetails.portfolio.some(p => p._id.toString() === contentId);
      } else if (contentType === 'certificate') {
        contentExists = provider.providerDetails.certificates.some(c => c._id.toString() === contentId);
      }

      if (!contentExists) {
        return res.status(404).json({ message: "Content not found" });
      }

      const flag = await ModerationQueue.create({
        providerId: req.params.id,
        contentType,
        contentId,
        reason,
        flaggedBy: req.user.id
      });

      res.json({ message: "Content flagged successfully", flag });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Upload provider KYC documents (citizenship or passport)
 * PHASE 2A: Now blocks resubmission while status is pending/under_review
 */
router.post(
  "/verification",
  authGuard,
  roleGuard(["provider"]),
  kycUpload.fields([
    { name: "citizenshipFront", maxCount: 1 },
    { name: "citizenshipBack", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "drivingLicenseFront", maxCount: 1 },
    { name: "drivingLicenseBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      // PHASE 2A: Check if provider already has pending/under_review submission
      const existingVerification = await ProviderVerification.findOne({ 
        providerId: req.user.id 
      }).sort({ createdAt: -1 });

      if (existingVerification) {
        const blockStatuses = ["submitted", "under_review"];
        if (blockStatuses.includes(existingVerification.status)) {
          return res.status(400).json({ 
            message: "KYC submission already pending review",
            reason: "You cannot submit KYC documents while your previous submission is being reviewed.",
            currentStatus: existingVerification.status,
            submittedAt: existingVerification.createdAt
          });
        }
      }

      const documentType = ["passport", "driving_license"].includes(req.body.documentType)
        ? req.body.documentType
        : "citizenship";

      const documents = buildDocumentsPayload(req.files, documentType);
      const addressDocuments = buildAddressPayload(req.files);

      const missingDocs = [];
      if (documentType === "citizenship") {
        if (!req.files?.citizenshipFront?.length) missingDocs.push("Citizenship front side");
        if (!req.files?.citizenshipBack?.length) missingDocs.push("Citizenship back side");
      }
      if (documentType === "passport") {
        if (!req.files?.passport?.length) missingDocs.push("Passport photo page");
      }
      if (documentType === "driving_license") {
        if (!req.files?.drivingLicenseFront?.length) missingDocs.push("Driving license front side");
        if (!req.files?.drivingLicenseBack?.length) missingDocs.push("Driving license back side");
      }
      if (!req.files?.selfie?.length) missingDocs.push("Selfie holding your ID");

      if (missingDocs.length > 0) {
        return res.status(400).json({ message: "Please attach all required files", missing: missingDocs });
      }

      const declaredName = (req.body.declaredName || "").trim();
      const declaredDob = req.body.declaredDob ? new Date(req.body.declaredDob) : null;
      const profileName = (req.user.profile?.name || "").trim();
      const profileDob = req.user.profile?.dob ? new Date(req.user.profile.dob) : null;

      const normalizeName = (value) =>
        String(value || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const nameMatch = declaredName && profileName
        ? normalizeName(declaredName) === normalizeName(profileName)
        : null;

      const dobMatch = declaredDob && profileDob
        ? declaredDob.toDateString() === profileDob.toDateString()
        : null;

      const gpsLat = req.body.gpsLat ? Number(req.body.gpsLat) : null;
      const gpsLng = req.body.gpsLng ? Number(req.body.gpsLng) : null;

      const record = await ProviderVerification.findOneAndUpdate(
        { providerId: req.user.id },
        {
          $set: {
            documents,
            documentType,
            status: "submitted",
            addressProofType: req.body.addressProofType || null,
            addressDocuments,
            declaredName,
            declaredDob,
            profileMatch: {
              nameMatch,
              dobMatch,
              notes: [
                nameMatch === false ? "Name mismatch" : null,
                dobMatch === false ? "DOB mismatch" : null,
              ]
                .filter(Boolean)
                .join(", ") || null,
            },
            gpsVerification:
              gpsLat !== null && gpsLng !== null
                ? { lat: gpsLat, lng: gpsLng, capturedAt: new Date() }
                : undefined,
            adminComment: null,
            reviewedAt: null,
            reviewedBy: null,
          },
          $push: {
            auditLogs: {
              action: "submitted",
              note: "Provider submitted verification documents",
              by: req.user.id,
            },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      await User.findByIdAndUpdate(req.user.id, {
        kycStatus: "pending_review",
      });

      // Notify all admins about new verification request
      const { notifyAllAdmins } = require('../utils/createNotification');
      await notifyAllAdmins({
        type: 'verification_submitted',
        title: 'New Provider Verification Request',
        message: `A provider has submitted ${documentType} documents for verification.`,
        category: 'admin',
        fromUserId: req.user.id,
        targetRoute: '/verification',
        metadata: { verificationId: record._id, documentType },
      });

      res.json({ verification: record });
    } catch (e) {
      next(e);
    }
  }
);

// Legacy path kept for compatibility
router.post(
  "/upload-documents",
  authGuard,
  roleGuard(["provider"]),
  kycUpload.fields([
    { name: "citizenshipFront", maxCount: 1 },
    { name: "citizenshipBack", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "drivingLicenseFront", maxCount: 1 },
    { name: "drivingLicenseBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const documentType = ["passport", "driving_license"].includes(req.body.documentType)
        ? req.body.documentType
        : "citizenship";
      const documents = buildDocumentsPayload(req.files, documentType);
      const record = await ProviderVerification.findOneAndUpdate(
        { providerId: req.user.id },
        { documents, documentType, status: "submitted" },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      await User.findByIdAndUpdate(req.user.id, {
        kycStatus: "pending_review",
      });
      res.json({ verification: record });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Reupload a specific verification document (correction flow)
 */
router.patch(
  "/verification/:verificationId/documents/:documentId",
  authGuard,
  roleGuard(["provider"]),
  kycUpload.single("document"),
  async (req, res, next) => {
    try {
      const verification = await ProviderVerification.findById(req.params.verificationId);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
      }

      if (String(verification.providerId) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No document uploaded" });
      }

      const updateDoc = (doc) => {
        doc.url = req.file.path;
        doc.mimeType = req.file.mimetype;
        doc.sizeBytes = req.file.size;
        doc.status = "pending";
        doc.adminComment = null;
        doc.rejectionReason = null;
      };

      const doc = verification.documents.id(req.params.documentId);
      const addressDoc = verification.addressDocuments?.id(req.params.documentId);

      if (doc) {
        updateDoc(doc);
      } else if (addressDoc) {
        updateDoc(addressDoc);
      } else {
        return res.status(404).json({ message: "Document not found" });
      }

      verification.status = "submitted";
      verification.auditLogs = verification.auditLogs || [];
      verification.auditLogs.push({
        action: "resubmitted_document",
        note: "Provider reuploaded a document",
        by: req.user.id,
      });

      await User.findByIdAndUpdate(req.user.id, {
        kycStatus: "pending_review",
      });

      await verification.save();

      res.json({ verification });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update provider service area
 */
router.post(
  "/update-service-area",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { serviceArea } = req.body;

      await User.findByIdAndUpdate(req.user.id, {
        "providerDetails.serviceArea": serviceArea,
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Toggle emergency availability
 */
router.post(
  "/toggle-emergency",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { value } = req.body;
      const provider = await User.findById(req.user.id);

      // If turning ON, validate requirements
      if (value) {
        const eligibility = await getEmergencyToggleEligibility(provider);

        if (!eligibility.ok) {
          const statusCode = isKycApproved(eligibility.kycStatus) ? 400 : 403;
          return res.status(statusCode).json({
            message: "Cannot enable emergency mode",
            errors: eligibility.errors,
            kycStatus: eligibility.kycStatus,
          });
        }
      }

      const updated = await User.findByIdAndUpdate(
        req.user.id,
        {
          "providerDetails.emergencyAvailable": !!value,
        },
        { new: true }
      ).select("providerDetails.emergencyAvailable");

      res.json({ ok: true, emergencyAvailable: updated?.providerDetails?.emergencyAvailable });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update provider coverage area
 */
router.patch(
  "/coverage",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { lat, lng, radiusKm, clear } = req.body;

      if (clear) {
        const provider = await User.findById(req.user.id).select(
          "providerDetails.emergencyAvailable"
        );

        const update = {
          "providerDetails.coverage": null,
        };

        let emergencyDisabled = false;
        if (provider?.providerDetails?.emergencyAvailable) {
          update["providerDetails.emergencyAvailable"] = false;
          emergencyDisabled = true;
        }

        const updated = await User.findByIdAndUpdate(req.user.id, update, {
          new: true,
        }).select("providerDetails.emergencyAvailable providerDetails.coverage");

        return res.json({
          ok: true,
          emergencyDisabled,
          emergencyAvailable: updated?.providerDetails?.emergencyAvailable,
        });
      }

      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const radius = radiusKm || 5; // Default 5km
      const provider = await User.findById(req.user.id).select(
        "providerDetails.emergencyAvailable"
      );

      const update = {
        "providerDetails.coverage": {
          lat: Number(lat),
          lng: Number(lng),
          radiusKm: Number(radius),
        },
      };

      const updated = await User.findByIdAndUpdate(req.user.id, update, {
        new: true,
      }).select("providerDetails.emergencyAvailable providerDetails.coverage");

      res.json({
        ok: true,
        emergencyAvailable: updated?.providerDetails?.emergencyAvailable,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Update notification preferences
 */
router.patch(
  "/notifications",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { enabled } = req.body;
      const provider = await User.findById(req.user.id).select(
        "providerDetails.emergencyAvailable"
      );

      const update = {
        "providerDetails.notificationsEnabled": !!enabled,
      };

      let emergencyDisabled = false;
      if (!enabled && provider?.providerDetails?.emergencyAvailable) {
        update["providerDetails.emergencyAvailable"] = false;
        emergencyDisabled = true;
      }

      const updated = await User.findByIdAndUpdate(req.user.id, update, {
        new: true,
      }).select("providerDetails.emergencyAvailable providerDetails.notificationsEnabled");

      res.json({
        ok: true,
        emergencyDisabled,
        emergencyAvailable: updated?.providerDetails?.emergencyAvailable,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Get provider dashboard stats
 */
router.get(
  "/stats",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const provider = await User.findById(req.user.id);
      const wallet = await ProviderWallet.findOne({ providerId: req.user.id });
      
      const completedBookings = await Booking.countDocuments({
        providerId: req.user.id,
        status: "completed",
      });

      const pendingBookings = await Booking.countDocuments({
        providerId: req.user.id,
        status: { $in: ["requested", "accepted"] },
      });

      const serviceCount = await Service.countDocuments({
        providerId: req.user.id,
      });

      const stats = {
        totalEarnings: wallet?.totalEarned || provider?.providerDetails?.analytics?.totalEarnings || 0,
        completedBookings,
        pendingBookings,
        rating: provider?.providerDetails?.rating?.average || 0,
        ratingCount: provider?.providerDetails?.rating?.count || 0,
        serviceCount,
      };

      res.json({ stats });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Get provider wallet summary
 */
router.get(
  "/wallet",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const Payment = require("../models/Payment");
      const mongoose = require("mongoose");
      const providerObjectId = new mongoose.Types.ObjectId(req.user.id);
      const wallet = await ProviderWallet.findOne({ providerId: req.user.id });
      const transactions = Array.isArray(wallet?.transactions)
        ? [...wallet.transactions].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          })
        : [];

      // Compute totalEarned from RELEASED payments if wallet doesn't track it
      let totalEarned = Number(wallet?.totalEarned || 0);
      if (!totalEarned) {
        const agg = await Payment.aggregate([
          { $match: { providerId: providerObjectId, status: "RELEASED" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        totalEarned = agg[0]?.total || 0;
      }

      // pendingPayouts = FUNDS_HELD payments for this provider
      const pendingAgg = await Payment.aggregate([
        { $match: { providerId: providerObjectId, status: "FUNDS_HELD" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const pendingPayouts = pendingAgg[0]?.total || 0;

      const totalCommissionPaid = Number((totalEarned * 0.15).toFixed(2));

      res.json({
        wallet: {
          balance: Number(wallet?.availableBalance || 0),
          totalEarned,
          totalCommissionPaid,
          pendingPayouts,
          pendingBalance: Number(wallet?.pendingBalance || 0),
          availableBalance: Number(wallet?.availableBalance || 0),
          totalWithdrawn: Number(wallet?.totalWithdrawn || 0),
          totalRefunded: Number(wallet?.totalRefunded || 0),
          transactions: transactions.slice(0, 50),
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /providers/public/:providerId
 * Fetch a provider's public profile (client-visible)
 * 
 * Returns provider info + portfolio + badges + services offered
 */
router.get("/public/:providerId", async (req, res, next) => {
  try {
    const provider = await User.findById(req.params.providerId)
      // We must select 'role' to verify it, even if we don't send it to the client (we can strip it)
      .select(
        "profile providerDetails role location email phone kycStatus"
      )
      .populate("providerDetails.approvedCategories", "name icon")
      .lean();
    
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }
    
    // Get services offered (public list)
    const services = await Service.find({
      providerId: provider._id,
      isActive: true,
    })
    .select("title description categoryId subcategoryId basePrice images ratingAvg ratingCount")
    .populate("categoryId", "name icon")
    .populate("subcategoryId", "name")
    .lean();
    
    // Get reviews for this provider
    const Review = require("../models/Review");
    const reviews = await Review.find({ providerId: provider._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("clientId", "profile.name profile.avatarUrl")
      .lean();
    
    const profileData = {
      _id: provider._id,
      name: provider.profile?.name,
      avatar: provider.profile?.avatarUrl,
      bio: provider.providerDetails?.publicProfile?.bio || provider.profile?.bio || "",
      specializations: provider.providerDetails?.publicProfile?.specializations || [],
      yearsOfExperience: provider.providerDetails?.publicProfile?.yearsOfExperience || provider.providerDetails?.experienceYears || 0,
      
      // Verified badge
      isVerified: provider.kycStatus === "approved",
      
      // Trust signals
      badges: provider.providerDetails?.badges || [],
      rating: {
        average: provider.providerDetails?.rating?.average || 0,
        count: provider.providerDetails?.rating?.count || 0,
      },
      completionRate: provider.providerDetails?.metrics?.completionRate || 0,
      responseTimeMinutes: provider.providerDetails?.metrics?.responseSpeed || 0,
      repeatClients: provider.providerDetails?.metrics?.repeatClients || 0,
      completedJobs: provider.providerDetails?.completedBookings || 0,
      trustScore: provider.providerDetails?.trustScore || 0,
      
      // Categories approved for
      approvedCategories: provider.providerDetails?.approvedCategories || [],
      
      // Portfolio (from approved skill proofs)
      portfolio: provider.providerDetails?.skillProofs
        ?.filter(sp => sp.status === "approved")
        ?.flatMap(sp => sp.portfolio) || [],
      
      // Services offered
      services: services.map(s => ({
        _id: s._id,
        title: s.title,
        description: s.description,
        category: s.categoryId?.name,
        price: s.basePrice,
        image: s.images?.[0],
        rating: { average: s.ratingAvg, count: s.ratingCount },
      })),
      
      // Recent reviews
      recentReviews: reviews.map(r => ({
        _id: r._id,
        clientName: r.clientId?.profile?.name,
        clientAvatar: r.clientId?.profile?.avatarUrl,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };
    
    res.json(profileData);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
