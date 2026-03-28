// routes/disputes.js
const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const disputeUpload = require("../middleware/disputeUpload");
const { createNotification, notifyAllAdmins } = require("../utils/createNotification");

const router = express.Router();

function buildResolutionNotification({ resolutionType, reason, role, bookingId, refundAmount }) {
  const bookingCode = String(bookingId || "").slice(-6).toUpperCase();
  const trimmedReason = String(reason || "").trim();
  const reasonText = trimmedReason ? ` Reason: ${trimmedReason}` : "";

  switch (resolutionType) {
    case "refund_full":
      return {
        title:
          role === "provider"
            ? `Dispute resolved - Payment refunded`
            : `Dispute resolved - Full refund approved`,
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. The client has been fully refunded. You will not receive payment for this booking.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. A full refund has been approved.${reasonText}`,
      };

    case "refund_partial":
      return {
        title:
          role === "provider"
            ? `Dispute resolved - Partial refund issued`
            : `Dispute resolved - Partial refund approved`,
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. A partial refund of NPR ${Number(
                refundAmount || 0
              ).toLocaleString()} has been issued to the client. You will receive reduced payment for this booking.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. A partial refund of NPR ${Number(
                refundAmount || 0
              ).toLocaleString()} has been approved.${reasonText}`,
      };

    case "booking_valid":
      return {
        title: `Dispute resolved`,
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} was resolved in your favor. Payment will be released according to the booking outcome.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. The booking was deemed valid, and payment will proceed according to the booking outcome.${reasonText}`,
      };

    case "reservice":
      return {
        title: `Dispute resolved - Reservice required`,
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. You are required to complete the service again before payment can proceed.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. The provider is required to complete the service again.${reasonText}`,
      };

    case "warning":
      return {
        title: `Dispute resolved`,
        message:
          role === "provider"
            ? `The dispute for Booking #${bookingCode} has been resolved. A warning has been issued.${reasonText}`
            : `Your dispute for Booking #${bookingCode} has been resolved. A warning has been issued.${reasonText}`,
      };

    default:
      return {
        title: `Dispute resolved`,
        message: `Your dispute for Booking #${bookingCode} has been resolved.${reasonText}`,
      };
  }
}

/**
 * POST /disputes/open
 * Client or Provider opens a dispute for a booking
 */
router.post(
  "/open",
  authGuard,
  disputeUpload.array("evidence", 5),
  async (req, res, next) => {
    try {
      const { bookingId, category, description } = req.body;
      const userId = req.user.id;

      if (!bookingId || !category || !description) {
        return res.status(400).json({
          message: "bookingId, category, and description are required",
        });
      }

      const booking = await Booking.findById(bookingId).populate("clientId providerId");
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (
        userId !== String(booking.clientId?._id) &&
        userId !== String(booking.providerId?._id)
      ) {
        return res.status(403).json({ message: "Only booking parties can open disputes" });
      }

      const allowedStatuses = new Set([
        "in-progress",
        "pending-completion",
        "provider_completed",
        "awaiting_client_confirmation",
      ]);

      if (!allowedStatuses.has(booking.status)) {
        return res.status(400).json({
          message: "Disputes can only be raised during an active or pending completion booking",
        });
      }

      const raisedByRole =
        userId === String(booking.clientId?._id) ? "client" : "provider";

      const evidenceFiles = (req.files || []).map((file) => ({
        url: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      const dispute = new Dispute({
        bookingId,
        raisedBy: userId,
        raisedByRole,
        category,
        description,
        evidenceFiles,
        timerSnapshot: {
          totalSeconds: Number(booking.timeTracking?.totalSeconds || 0),
          totalHours: Number(
            (Number(booking.timeTracking?.totalSeconds || 0) / 3600).toFixed(2)
          ),
          includedHours: Number(booking.pricing?.includedHours || 0),
          hourlyRate: Number(booking.pricing?.hourlyRate || 0),
          estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
          sessions: Array.isArray(booking.timeTracking?.timerSessions)
            ? booking.timeTracking.timerSessions
            : [],
          capturedAt: new Date(),
        },
        status: "opened",
        openedAt: new Date(),
      });

      await dispute.save();
      await dispute.populate("raisedBy", "profile.name email");

      if (!booking.disputeId) {
        booking.disputeId = dispute._id;
      }

      const heldPayments = await Payment.find({ bookingId, status: "FUNDS_HELD" });
      for (const payment of heldPayments) {
        payment.status = "DISPUTED";
        payment.disputeId = dispute._id;
        payment.disputeReason = category;
        await payment.save();
      }

      booking.status = "disputed";
      booking.pricing = booking.pricing || {};
      booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
      booking.pricing.paymentAuditTrail.push({
        event: "escrow_frozen_on_dispute",
        amount: Number(booking.pricing?.escrowHeldAmount || 0),
        finalPayment: Number(
          booking.pricing?.finalApprovedPrice || booking.totalAmount || 0
        ),
        approvedAdjustmentsTotal: Number(
          booking.pricing?.approvedAdjustmentsTotal || 0
        ),
        approvedExtraTimeCost: Number(
          booking.pricing?.approvedExtraTimeCost || 0
        ),
        actorId: userId,
        at: new Date(),
        note: "Dispute opened; escrow frozen pending admin resolution",
      });
      await booking.save();

      const otherPartyId =
        raisedByRole === "client"
          ? booking.providerId?._id
          : booking.clientId?._id;

      if (otherPartyId) {
        const targetRoute =
          raisedByRole === "client"
            ? "/provider/bookings/:bookingId"
            : "/client/bookings/:bookingId";

        await createNotification({
          userId: otherPartyId,
          type: "dispute_opened",
          title: `Dispute opened - Booking #${bookingId.toString().slice(-6)}`,
          message: "A dispute was opened for this booking. We will review it fairly.",
          category: "dispute",
          bookingId,
          disputeId: dispute._id,
          targetRoute,
          targetRouteParams: { bookingId },
        });
      }

      await notifyAllAdmins({
        type: "dispute_opened",
        title: "New dispute raised",
        message: `A ${raisedByRole} opened a dispute for booking #${bookingId
          .toString()
          .slice(-6)}.`,
        category: "dispute",
        bookingId,
        disputeId: dispute._id,
        fromUserId: userId,
        targetRoute: "/disputes/:id",
        targetRouteParams: { id: dispute._id },
      });

      res.status(201).json({
        message: "Dispute submitted successfully",
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /disputes (Admin Only)
 * List all disputes with filters
 */
router.get("/", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { status, category, dateFrom, dateTo } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const disputes = await Dispute.find(filter)
      .populate("bookingId", "clientId providerId status totalAmount")
      .populate("raisedBy", "profile.name email")
      .populate("assignedTo", "profile.name")
      .sort({ createdAt: -1 })
      .limit(500);

    const stats = {
      totalDisputes: await Dispute.countDocuments(filter),
      openCount: await Dispute.countDocuments({ ...filter, status: "opened" }),
      underReviewCount: await Dispute.countDocuments({
        ...filter,
        status: "under_review",
      }),
      resolvedCount: await Dispute.countDocuments({
        ...filter,
        status: "resolved",
      }),
    };

    res.json({ disputes, stats });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/booking/:bookingId
 * Fetch latest dispute for a booking (Client/Provider/Admin)
 */
router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId).select("clientId providerId");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isClient = String(booking.clientId) === userId;
    const isProvider = String(booking.providerId) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const dispute = await Dispute.findOne({ bookingId })
      .sort({ createdAt: -1 })
      .populate("raisedBy", "profile.name email");

    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/list
 * Client/Provider view their disputes
 */
router.get("/list", authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const filter = {
      $or: [
        { raisedBy: userId },
        {
          bookingId: {
            $in: await Booking.find({
              $or: [{ clientId: userId }, { providerId: userId }],
            }).select("_id"),
          },
        },
      ],
    };

    if (status) {
      filter.status = status;
    }

    const disputes = await Dispute.find(filter)
      .populate("bookingId", "serviceId clientId providerId status")
      .populate("raisedBy", "profile.name email")
      .sort({ createdAt: -1 });

    res.json({ disputes });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /disputes/:id
 * Get dispute detail
 */
router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const dispute = await Dispute.findById(id)
      .populate("bookingId")
      .populate("raisedBy", "profile.name email")
      .populate("assignedTo", "profile.name email");

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    const userRole = req.user.role;
    if (
      userRole !== "admin" &&
      userId !== String(dispute.raisedBy?._id) &&
      userId !== String(dispute.bookingId?.clientId) &&
      userId !== String(dispute.bookingId?.providerId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /disputes/:id/request-info
 * Admin requests clarification from one party
 */
router.patch("/:id/request-info", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fields = [], reason, fromRole } = req.body;

    const dispute = await Dispute.findById(id).populate("bookingId");
    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    const targetRole =
      fromRole && ["client", "provider"].includes(fromRole)
        ? fromRole
        : dispute.raisedByRole || "client";

    const requestedInfo = (Array.isArray(fields) ? fields : [])
      .filter(Boolean)
      .map((field) => ({
        field,
        requestedAt: new Date(),
      }));

    dispute.requestedInfo = requestedInfo;
    dispute.status = "under_review";
    await dispute.save();

    const targetPartyId =
      targetRole === "client"
        ? dispute.bookingId?.clientId
        : dispute.bookingId?.providerId;

    if (targetPartyId) {
      const targetRoute =
        targetRole === "provider"
          ? "/provider/bookings/:bookingId"
          : "/client/bookings/:bookingId";

      await createNotification({
        userId: targetPartyId,
        type: "dispute_info_requested",
        title: "Dispute update",
        message: "Admin requested additional info to review your dispute.",
        category: "dispute",
        disputeId: id,
        bookingId: dispute.bookingId?._id || dispute.bookingId,
        targetRoute,
        targetRouteParams: { bookingId: dispute.bookingId?._id || dispute.bookingId },
      });
    }

    res.json({
      message: "Information request sent",
      dispute,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /disputes/:id/respond-info
 * Client or provider submits requested info and optional evidence
 */
router.patch(
  "/:id/respond-info",
  authGuard,
  disputeUpload.array("evidence", 5),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const dispute = await Dispute.findById(id).populate("bookingId");
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const booking = dispute.bookingId;
      const isClient = String(booking?.clientId) === String(userId);
      const isProvider = String(booking?.providerId) === String(userId);

      if (!isClient && !isProvider) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!Array.isArray(dispute.requestedInfo) || dispute.requestedInfo.length === 0) {
        return res.status(400).json({
          message: "No information has been requested for this dispute",
        });
      }

      let responses = [];
      if (typeof req.body.responses === "string") {
        try {
          responses = JSON.parse(req.body.responses);
        } catch (_) {
          return res.status(400).json({ message: "Invalid responses payload" });
        }
      } else if (Array.isArray(req.body.responses)) {
        responses = req.body.responses;
      }

      if (!Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ message: "Please provide at least one response" });
      }

      let hasAnyResponse = false;

      dispute.requestedInfo.forEach((item, index) => {
        const value = typeof responses[index] === "string" ? responses[index].trim() : "";
        if (value) {
          item.response = value;
          item.respondedAt = new Date();
          hasAnyResponse = true;
        }
      });

      if (!hasAnyResponse && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
          message: "Please add a response or upload evidence before submitting",
        });
      }

      const newEvidenceFiles = (req.files || []).map((file) => ({
        url: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      dispute.evidenceFiles = [...(dispute.evidenceFiles || []), ...newEvidenceFiles];
      dispute.status = isClient ? "client_provided" : "provider_responded";
      await dispute.save();

      await notifyAllAdmins({
        type: "dispute_info_requested",
        title: "Dispute response received",
        message: `${
          isClient ? "Client" : "Provider"
        } submitted additional information for dispute #${String(dispute._id).slice(-8).toUpperCase()}.`,
        category: "dispute",
        bookingId: booking?._id,
        disputeId: dispute._id,
        fromUserId: userId,
        targetRoute: "/disputes/:id",
        targetRouteParams: { id: dispute._id },
      });

      res.json({
        message: "Requested information submitted successfully",
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /disputes/:id/resolve
 * Admin resolves dispute with decision
 */
router.post("/:id/resolve", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionType, refundAmount, reason } = req.body;

    const validTypes = [
      "refund_full",
      "refund_partial",
      "reservice",
      "booking_valid",
      "warning",
    ];
    if (!validTypes.includes(resolutionType)) {
      return res.status(400).json({ message: "Invalid resolution type" });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      id,
      {
        status: "resolved",
        resolutionDetails: {
          resolutionType,
          refundAmount: refundAmount || 0,
          reason,
          resolvedBy: req.user.id,
          resolvedAt: new Date(),
        },
        resolvedAt: new Date(),
      },
      { new: true }
    ).populate("bookingId");

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    const booking = dispute.bookingId;
    const resolutionMessage = `Your dispute has been resolved. Outcome: ${resolutionType.replace(
      /_/g,
      " "
    )}. ${reason || ""}`;

    if (booking?.clientId) {
      await createNotification({
        userId: booking.clientId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: resolutionMessage,
        category: "dispute",
        disputeId: id,
        bookingId: booking._id,
        targetRoute: "/client/bookings/:bookingId",
        targetRouteParams: { bookingId: booking._id },
      });
    }

    if (booking?.providerId) {
      await createNotification({
        userId: booking.providerId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: resolutionMessage,
        category: "dispute",
        disputeId: id,
        bookingId: booking._id,
        targetRoute: "/provider/bookings/:bookingId",
        targetRouteParams: { bookingId: booking._id },
      });
    }

    if (booking?._id) {
      if (resolutionType === "booking_valid") {
        booking.status = "awaiting_client_confirmation";
      } else if (["refund_full", "refund_partial"].includes(resolutionType)) {
        booking.status = "resolved_refunded";
      } else if (resolutionType === "reservice") {
        booking.status = "confirmed";
      }

      await booking.save();
    }

    res.json({
      message: "Dispute resolved",
      dispute,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;