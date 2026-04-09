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
const Payment = require("../models/Payment");
const kycUpload = require("../middleware/kycUpload");
const { isKycApproved } = require("../utils/kyc");
const {
  getEmergencyToggleEligibility,
} = require("../middleware/emergencyEligibility");

const router = express.Router();
const CategoryRequest = require("../models/CategoryRequest");
const ModerationQueue = require("../models/ModerationQueue");
const skillUpload = require("../middleware/skillUpload");
const sendEmail = require("../utils/sendEmail");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getRangeBounds(range, from, to) {
  const now = new Date();

  if (range === "today") {
    const start = startOfDay(now);
    const end = addDays(start, 1);
    return { start, end };
  }

  if (range === "week") {
    const current = startOfDay(now);
    const day = current.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = addDays(current, -diffToMonday);
    const end = addDays(start, 7);
    return { start, end };
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }

  if (range === "custom" && from && to) {
    const start = startOfDay(new Date(from));
    const end = addDays(startOfDay(new Date(to)), 1);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return null;
    }

    return { start, end };
  }

  return null;
}

function toAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function isWithinBounds(value, bounds) {
  if (!bounds) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date >= bounds.start && date < bounds.end;
}

function getResolution(payment) {
  return payment?.receipt?.disputeResolution || {};
}

function getRefundAmount(payment) {
  const resolution = getResolution(payment);

  if (Number.isFinite(Number(resolution.refundAmount))) {
    return toAmount(resolution.refundAmount);
  }

  if (payment?.status === "REFUNDED") {
    return toAmount(payment?.amount || 0);
  }

  return 0;
}

function getProviderPayout(payment) {
  const resolution = getResolution(payment);

  if (Number.isFinite(Number(payment?.providerEarnings))) {
    return toAmount(payment.providerEarnings);
  }

  if (Number.isFinite(Number(resolution.providerPayout))) {
    return toAmount(resolution.providerPayout);
  }

  if (payment?.status === "REFUNDED") {
    return 0;
  }

  if (
    ["RELEASED", "FUNDS_HELD", "DISPUTED", "PARTIALLY_REFUNDED"].includes(
      payment?.status
    )
  ) {
    return toAmount(Number(payment?.amount || 0) * 0.85);
  }

  return 0;
}

function getCommissionAmount(payment) {
  const gross = toAmount(payment?.amount || 0);
  const refund = getRefundAmount(payment);
  const providerPayout = getProviderPayout(payment);
  return toAmount(Math.max(0, gross - refund - providerPayout));
}

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
      const verification = await ProviderVerification.findOne({
        providerId: req.user.id,
      }).sort({ createdAt: -1 });
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
        .sort({ sortOrder: 1, name: 1 })
        .select(
          "name description icon image iconKey sortOrder recommendedPriceRange suggestedPriceMode status emergencyServiceAllowed kycVerificationRequired"
        );

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
        .populate("categoryId", "name status")
        .populate("subcategoryId", "name status categoryId")
        .populate("parentCategoryId", "name status")
        .populate("reviewedBy", "profile.name email")
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
      const {
        name,
        description,
        justification,
        requestType: rawRequestType,
        parentCategoryId,
      } = req.body;

      const requestType =
        rawRequestType === "subcategory" ? "subcategory" : "category";

      if (!name || !justification) {
        return res.status(400).json({
          message: "Name and justification are required",
        });
      }

      if (requestType === "subcategory") {
        if (!parentCategoryId) {
          return res.status(400).json({
            message: "Parent category is required for subcategory requests",
          });
        }

        const parentCategory = await Category.findById(parentCategoryId);
        if (!parentCategory || parentCategory.status === "deleted") {
          return res.status(404).json({
            message: "Parent category not found",
          });
        }

        const existingSubcategory = await Subcategory.findOne({
          categoryId: parentCategoryId,
          name: { $regex: `^${name.trim()}$`, $options: "i" },
        });

        if (existingSubcategory) {
          return res.status(400).json({
            message: `"${existingSubcategory.name}" already exists under ${parentCategory.name}.`,
          });
        }

        const existingRequest = await CategoryRequest.findOne({
          providerId: req.user.id,
          requestType: "subcategory",
          parentCategoryId,
          name: { $regex: `^${name.trim()}$`, $options: "i" },
          status: "pending",
        });

        if (existingRequest) {
          return res.status(400).json({
            message: "You already have a pending request for this subcategory",
          });
        }

        const request = await CategoryRequest.create({
          providerId: req.user.id,
          requestType: "subcategory",
          parentCategoryId,
          name: name.trim(),
          description: (description || "").trim(),
          justification: justification.trim(),
        });

        return res.json({
          success: true,
          message:
            "Subcategory request submitted successfully. Admin will review it soon.",
          request,
        });
      }

      const existingCategory = await Category.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existingCategory) {
        return res.status(400).json({
          message: `Category "${existingCategory.name}" already exists. Please select it from the list.`,
        });
      }

      const existingRequest = await CategoryRequest.findOne({
        providerId: req.user.id,
        requestType: "category",
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        status: "pending",
      });

      if (existingRequest) {
        return res.status(400).json({
          message: "You already have a pending request for this category",
        });
      }

      const request = await CategoryRequest.create({
        providerId: req.user.id,
        requestType: "category",
        name: name.trim(),
        description: (description || "").trim(),
        justification: justification.trim(),
      });

      res.json({
        success: true,
        message:
          "Category request submitted successfully. Admin will review it soon.",
        request,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * PUT provider skill credibility profile
 */
router.put(
  "/profile/skills",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { experienceYears, experienceDescription, tools } = req.body || {};
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const normalizedTools = Array.isArray(tools)
        ? tools.map((item) => String(item).trim()).filter(Boolean)
        : typeof tools === "string"
        ? tools.split(",").map((item) => item.trim()).filter(Boolean)
        : [];

      user.providerDetails = user.providerDetails || {};
      user.providerDetails.experienceYears = Math.max(0, Number(experienceYears || 0));
      user.providerDetails.experienceDescription = String(experienceDescription || "").trim();
      user.providerDetails.tools = normalizedTools;
      user.onboarding = {
        ...(user.onboarding || {}),
        skillProfileCompleted: Boolean(
          user.providerDetails.experienceYears > 0 ||
          user.providerDetails.experienceDescription ||
          normalizedTools.length > 0 ||
          (user.providerDetails.skillProofs || []).length > 0
        ),
      };

      await user.save();

      if (user.email) {
        try {
          await sendEmail(
            user.email,
            "SewaHive skill verification submitted",
            `<p>Your skill proof for <strong>${category.name}</strong> has been submitted successfully and is now pending admin review.</p>`
          );
        } catch (mailError) {
          console.error("Skill submission email failed:", mailError);
        }
      }

      res.json({
        success: true,
        message: "Skill credibility updated successfully",
        user,
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
      let { experienceDescription, tools } = req.body;

      if (typeof tools === "string") {
        tools = tools
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t);
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });

      const portfolioItems = [];

      if (req.files && req.files.portfolioBefore) {
        const uniqueBefore = Array.from(
          new Set(req.files.portfolioBefore.map((f) => f.path))
        );
        uniqueBefore.forEach((filePath) => {
          portfolioItems.push({
            url: filePath,
            description: "Before Service",
            type: "before",
            uploadedAt: new Date(),
          });
        });
      }

      if (req.files && req.files.portfolioAfter) {
        const uniqueAfter = Array.from(
          new Set(req.files.portfolioAfter.map((f) => f.path))
        );
        uniqueAfter.forEach((filePath) => {
          portfolioItems.push({
            url: filePath,
            description: "After Service",
            type: "after",
            uploadedAt: new Date(),
          });
        });
      }

      const certificateItems = [];
      if (req.files && req.files.certificateImage) {
        req.files.certificateImage.forEach((file) => {
          certificateItems.push({
            name: "Certificate",
            url: file.path,
            issuer: "Self Upload",
            year: new Date().getFullYear(),
            uploadedAt: new Date(),
          });
        });
      }

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
        const existingProof = user.providerDetails.skillProofs[existingProofIndex];

        let updatedPortfolio = existingProof.portfolio || [];

        if (req.files && req.files.portfolioBefore) {
          updatedPortfolio = updatedPortfolio.filter((p) => p.type !== "before");
        }

        if (req.files && req.files.portfolioAfter) {
          updatedPortfolio = updatedPortfolio.filter((p) => p.type !== "after");
        }

        updatedPortfolio = [...updatedPortfolio, ...portfolioItems];

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
router.get("/:id/skills", async (req, res, next) => {
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
      skillProofs: user.providerDetails.skillProofs,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET provider trust metrics and badges (Phase 3)
 */
router.get("/:id/trust", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "providerDetails.metrics providerDetails.badges providerDetails.trustScore kycStatus role"
    );
    if (!user || user.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }
    res.json({
      trust: {
        metrics: user.providerDetails.metrics,
        badges: user.providerDetails.badges,
        trustScore: user.providerDetails.trustScore,
        kycStatus: user.kycStatus,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST flag provider content (Phase 2)
 */
router.post("/:id/flag", authGuard, async (req, res, next) => {
  try {
    const { contentType, contentId, reason } = req.body;

    if (!["portfolio", "certificate"].includes(contentType)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    let contentExists = false;
    if (contentType === "portfolio") {
      contentExists = provider.providerDetails.portfolio.some(
        (p) => p._id.toString() === contentId
      );
    } else if (contentType === "certificate") {
      contentExists = provider.providerDetails.certificates.some(
        (c) => c._id.toString() === contentId
      );
    }

    if (!contentExists) {
      return res.status(404).json({ message: "Content not found" });
    }

    const flag = await ModerationQueue.create({
      providerId: req.params.id,
      contentType,
      contentId,
      reason,
      flaggedBy: req.user.id,
    });

    res.json({ message: "Content flagged successfully", flag });
  } catch (e) {
    next(e);
  }
});

/**
 * Upload provider KYC documents
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
      const existingVerification = await ProviderVerification.findOne({
        providerId: req.user.id,
      }).sort({ createdAt: -1 });

      if (existingVerification) {
        const blockStatuses = ["submitted", "under_review"];
        if (blockStatuses.includes(existingVerification.status)) {
          return res.status(400).json({
            message: "KYC submission already pending review",
            reason:
              "You cannot submit KYC documents while your previous submission is being reviewed.",
            currentStatus: existingVerification.status,
            submittedAt: existingVerification.createdAt,
          });
        }
      }

      const documentType = ["passport", "driving_license"].includes(
        req.body.documentType
      )
        ? req.body.documentType
        : "citizenship";

      const documents = buildDocumentsPayload(req.files, documentType);
      const addressDocuments = buildAddressPayload(req.files);

      const missingDocs = [];
      if (documentType === "citizenship") {
        if (!req.files?.citizenshipFront?.length)
          missingDocs.push("Citizenship front side");
        if (!req.files?.citizenshipBack?.length)
          missingDocs.push("Citizenship back side");
      }
      if (documentType === "passport") {
        if (!req.files?.passport?.length) missingDocs.push("Passport photo page");
      }
      if (documentType === "driving_license") {
        if (!req.files?.drivingLicenseFront?.length)
          missingDocs.push("Driving license front side");
        if (!req.files?.drivingLicenseBack?.length)
          missingDocs.push("Driving license back side");
      }
      if (!req.files?.selfie?.length) missingDocs.push("Selfie holding your ID");

      if (missingDocs.length > 0) {
        return res
          .status(400)
          .json({ message: "Please attach all required files", missing: missingDocs });
      }

      const declaredName = (req.body.declaredName || "").trim();
      const declaredDob = req.body.declaredDob ? new Date(req.body.declaredDob) : null;
      const profileName = (req.user.profile?.name || "").trim();
      const profileDob = req.user.profile?.dob ? new Date(req.user.profile.dob) : null;

      const normalizeName = (value) =>
        String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

      const nameMatch =
        declaredName && profileName
          ? normalizeName(declaredName) === normalizeName(profileName)
          : null;

      const dobMatch =
        declaredDob && profileDob
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
              notes:
                [
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

      const { notifyAllAdmins } = require("../utils/createNotification");
      await notifyAllAdmins({
        type: "verification_submitted",
        title: "New Provider Verification Request",
        message: `A provider has submitted ${documentType} documents for verification.`,
        category: "admin",
        fromUserId: req.user.id,
        targetRoute: "/verification",
        metadata: { verificationId: record._id, documentType },
      });

      if (req.user.email) {
        try {
          await sendEmail(
            req.user.email,
            "SewaHive ID verification submitted",
            `<p>Your ID verification request has been submitted successfully. We will email you again when the review is completed.</p>`
          );
        } catch (mailError) {
          console.error("Verification submission email failed:", mailError);
        }
      }

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
      const documentType = ["passport", "driving_license"].includes(
        req.body.documentType
      )
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
      const verification = await ProviderVerification.findById(
        req.params.verificationId
      );
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
        }).select(
          "providerDetails.emergencyAvailable providerDetails.coverage"
        );

        return res.json({
          ok: true,
          emergencyDisabled,
          emergencyAvailable: updated?.providerDetails?.emergencyAvailable,
        });
      }

      if (
        lat === undefined ||
        lat === null ||
        lng === undefined ||
        lng === null
      ) {
        return res
          .status(400)
          .json({ message: "Latitude and longitude required" });
      }

      const radius = radiusKm || 5;
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
      }).select(
        "providerDetails.emergencyAvailable providerDetails.notificationsEnabled"
      );

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
        totalEarnings:
          wallet?.totalEarned ||
          provider?.providerDetails?.analytics?.totalEarnings ||
          0,
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
 * Dynamic for selected range, but based on real payout/refund values.
 */
router.get(
  "/wallet",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { range = "month", from, to } = req.query;
      const bounds = getRangeBounds(range, from, to);

      let wallet = await ProviderWallet.findOne({ providerId: req.user.id }).lean();

      if (!wallet) {
        wallet = {
          providerId: req.user.id,
          totalEarned: 0,
          pendingBalance: 0,
          availableBalance: 0,
          totalWithdrawn: 0,
          totalRefunded: 0,
          transactions: [],
        };
      }

      const payments = await Payment.find({
        providerId: req.user.id,
        status: {
          $in: [
            "FUNDS_HELD",
            "DISPUTED",
            "RELEASED",
            "PARTIALLY_REFUNDED",
            "REFUNDED",
          ],
        },
      })
        .sort({ createdAt: -1 })
        .lean();

      const filteredPayments = payments.filter((payment) =>
        isWithinBounds(
          payment.releasedAt ||
            payment.escrowReleasedAt ||
            payment.refundedAt ||
            payment.createdAt,
          bounds
        )
      );

      let totalGrossVolume = 0;
      let totalEarned = 0;
      let totalCommissionPaid = 0;
      let refundedInRange = 0;
      let pendingPayouts = 0;

      filteredPayments.forEach((payment) => {
        const gross = toAmount(payment.amount);
        const payout = getProviderPayout(payment);
        const refund = getRefundAmount(payment);
        const commission = getCommissionAmount(payment);

        if (
          ["RELEASED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)
        ) {
          totalGrossVolume += gross;
          totalEarned += payout;
          totalCommissionPaid += commission;
          refundedInRange += refund;
        }

        if (["FUNDS_HELD", "DISPUTED"].includes(payment.status)) {
          pendingPayouts += payout;
        }
      });

      const transactions = Array.isArray(wallet.transactions)
        ? [...wallet.transactions]
            .filter((tx) => isWithinBounds(tx.createdAt, bounds))
            .sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              return timeB - timeA;
            })
            .slice(0, 50)
        : [];

      res.json({
        wallet: {
          // range-based summary used by dashboard cards/charts
          balance: toAmount(wallet.availableBalance || 0),
          totalGrossVolume: toAmount(totalGrossVolume),
          totalEarned: toAmount(totalEarned),
          totalCommissionPaid: toAmount(totalCommissionPaid),
          netPayout: toAmount(totalEarned),
          pendingPayouts: toAmount(pendingPayouts),
          refundedInRange: toAmount(refundedInRange),

          // actual live wallet state
          pendingBalance: toAmount(wallet.pendingBalance || 0),
          availableBalance: toAmount(wallet.availableBalance || 0),
          totalWithdrawn: toAmount(wallet.totalWithdrawn || 0),
          totalRefunded: toAmount(wallet.totalRefunded || 0),

          transactions,
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
 */
router.get("/public/:providerId", async (req, res, next) => {
  try {
    const provider = await User.findById(req.params.providerId)
      .select("profile providerDetails role location email phone kycStatus")
      .populate("providerDetails.approvedCategories", "name icon")
      .lean();

    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    const services = await Service.find({
      providerId: provider._id,
      isActive: true,
    })
      .select(
        "title description categoryId subcategoryId basePrice images ratingAvg ratingCount"
      )
      .populate("categoryId", "name icon")
      .populate("subcategoryId", "name")
      .lean();

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
      bio:
        provider.providerDetails?.publicProfile?.bio ||
        provider.profile?.bio ||
        "",
      specializations:
        provider.providerDetails?.publicProfile?.specializations || [],
      yearsOfExperience:
        provider.providerDetails?.publicProfile?.yearsOfExperience ||
        provider.providerDetails?.experienceYears ||
        0,

      isVerified: provider.kycStatus === "approved",

      badges: provider.providerDetails?.badges || [],
      rating: {
        average: provider.providerDetails?.rating?.average || 0,
        count: provider.providerDetails?.rating?.count || 0,
      },
      completionRate: provider.providerDetails?.metrics?.completionRate || 0,
      responseTimeMinutes:
        provider.providerDetails?.metrics?.responseSpeed || 0,
      repeatClients: provider.providerDetails?.metrics?.repeatClients || 0,
      completedJobs: provider.providerDetails?.completedBookings || 0,
      trustScore: provider.providerDetails?.trustScore || 0,

      approvedCategories: provider.providerDetails?.approvedCategories || [],

      portfolio:
        provider.providerDetails?.skillProofs
          ?.filter((sp) => sp.status === "approved")
          ?.flatMap((sp) => sp.portfolio) || [],

      services: services.map((s) => ({
        _id: s._id,
        title: s.title,
        description: s.description,
        category: s.categoryId?.name,
        price: s.basePrice,
        image: s.images?.[0],
        rating: { average: s.ratingAvg, count: s.ratingCount },
      })),

      recentReviews: reviews.map((r) => ({
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