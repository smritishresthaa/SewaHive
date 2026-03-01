// routes/bookings.js
const express = require("express");
const { authGuard, roleGuard, requireVerifiedProvider } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const { haversineDistance } = require("../utils/geo");
const { createNotification } = require("../utils/createNotification");
const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
const { getEmergencyRequestEligibility } = require("../middleware/emergencyEligibility");
const quoteAdjustmentUpload = require("../middleware/quoteAdjustmentUpload");
const { generateICS, generateICSFilename } = require("../utils/icsGenerator");
const {
  PRICING_TYPES,
  resolvePricingType,
  getStatusesForTab,
  isQuotePricing,
  isRangePricing,
} = require("../utils/bookingWorkflow");
const { getIO } = require("../utils/socket");

const router = express.Router();

function computeEstimatedExtraTimeCost(totalSeconds = 0, includedHours = 0, hourlyRate = 0) {
  const included = Math.max(0, Number(includedHours || 0));
  const rate = Math.max(0, Number(hourlyRate || 0));
  if (included <= 0 || rate <= 0) {
    return 0;
  }
  const workedHours = Math.max(0, Number(totalSeconds || 0) / 3600);
  const extraHours = Math.max(0, workedHours - included);
  return Number((extraHours * rate).toFixed(2));
}

function resolveAgreedAmount(booking) {
  return Number(
    booking?.pricing?.finalApprovedPrice ||
      booking?.pricing?.finalPrice ||
      booking?.totalAmount ||
      0
  );
}

function hasSufficientEscrowForBooking(booking) {
  const agreedAmount = resolveAgreedAmount(booking);
  const heldAmount = Number(booking?.pricing?.escrowHeldAmount || 0);
  return heldAmount >= agreedAmount && agreedAmount > 0;
}

function resolveBookingPricing(service, type = "normal") {
  const emergencyFee = type === "emergency" ? Number(service.emergencyPrice || 0) : 0;
  const mode = resolvePricingType(service.priceMode || "fixed");
  const includedHours = Number(service.includedHours || 0);
  const hourlyRate = Number(service.hourlyRate || 0);
  const isHourlyService = hourlyRate > 0 && includedHours <= 0;

  if (mode === PRICING_TYPES.QUOTE) {
    return {
      status: "quote_requested",
      quote: {
        status: "requested",
        createdAt: new Date(),
      },
      price: 0,
      emergencyFee,
      totalAmount: 0,
      pricing: {
        mode,
        priceLabel: "Estimated Price — Final after inspection",
        basePrice: 0,
        basePriceAtBooking: 0,
        includedHours,
        hourlyRate,
        extraTimeCost: 0,
        approvedExtraTimeCost: 0,
        approvedAdjustmentsTotal: 0,
        rangeMin: 0,
        rangeMax: 0,
        finalApprovedPrice: 0,
        finalPrice: 0,
        escrowHeldAmount: 0,
        additionalEscrowRequired: 0,
      },
    };
  }

  if (mode === PRICING_TYPES.RANGE) {
    const min = Number(service.priceRange?.min || service.basePrice || 0);
    const max = Number(service.priceRange?.max || min);
    const rangeIncludedHours = 0;
    return {
      status: "pending_payment",
      quote: { status: "none" },
      price: min,
      emergencyFee,
      totalAmount: min + emergencyFee,
      pricing: {
        mode,
        priceLabel: "Estimated Range",
        basePrice: min,
        basePriceAtBooking: min,
        includedHours: rangeIncludedHours,
        hourlyRate,
        extraTimeCost: 0,
        approvedExtraTimeCost: 0,
        approvedAdjustmentsTotal: 0,
        rangeMin: min,
        rangeMax: max,
        finalApprovedPrice: min + emergencyFee,
        finalPrice: min + emergencyFee,
        escrowHeldAmount: 0,
        additionalEscrowRequired: 0,
      },
    };
  }

  const fixed = Number(service.basePrice || 0);
  return {
    status: "pending_payment",
    quote: { status: "none" },
    price: fixed,
    emergencyFee,
    totalAmount: fixed + emergencyFee,
    pricing: {
      mode: PRICING_TYPES.FIXED,
      priceLabel: isHourlyService ? "Minimum Service Charge" : "Fixed Service Price",
      basePrice: fixed,
      basePriceAtBooking: fixed,
      includedHours,
      hourlyRate,
      extraTimeCost: 0,
      approvedExtraTimeCost: 0,
      approvedAdjustmentsTotal: 0,
      rangeMin: 0,
      rangeMax: 0,
      finalApprovedPrice: fixed + emergencyFee,
      finalPrice: fixed + emergencyFee,
      escrowHeldAmount: 0,
      additionalEscrowRequired: 0,
    },
  };
}

/**
 * Create a normal booking
 */
router.post("/create", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    // STRICT: Only clients can create bookings
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can create bookings" });
    }

    const { serviceId, location, schedule, addressText, landmark, notes } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "Service ID is required" });
    }

    // Validate schedule date is not in the past
    if (schedule && schedule.date) {
      const scheduledDate = new Date(schedule.date);
      const now = new Date();
      
      // Set to start of today for comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const bookingDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
      
      if (bookingDate < today) {
        return res.status(400).json({ 
          message: "Cannot book a service for a past date",
          reason: "Please select a date today or in the future"
        });
      }
    }

    const service = await Service.findById(serviceId).select(
      "providerId categoryId priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const providerId = String(service.providerId);

    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(400).json({ message: "Provider not found" });
    }

    const kycStatus = await resolveProviderKycStatus({
      user: provider,
      providerId,
    });

    if (!isKycApproved(kycStatus)) {
      return res.status(403).json({
        message: "Provider is not KYC approved",
        reason: "You can only book providers who are KYC approved.",
        kycStatus,
      });
    }

    // PHASE 2: Check Category Skill Proof Approval
    const isCategoryApproved = provider.providerDetails?.approvedCategories?.some(
      (id) => id.toString() === service.categoryId.toString()
    );

    if (!isCategoryApproved) {
      return res.status(403).json({
        message: "Provider not approved for this category",
        reason: "This provider has not yet been approved to offer services in this category.",
      });
    }

    // Calculate distance if provider location available
    let distanceKm = null;
    if (provider?.location?.coordinates && location?.coordinates) {
      distanceKm = haversineDistance(
        provider.location.coordinates,
        location.coordinates
      );
      distanceKm = Math.round(distanceKm * 100) / 100; // Round to 2 decimals
    }

    const pricingResolved = resolveBookingPricing(service, "normal");

    const payload = {
      clientId: req.user.id,
      providerId,
      serviceId,
      status: pricingResolved.status,
      type: "normal",
      requestedAt: new Date(),
      distanceKm,
      location,
      schedule,
      addressText: addressText || "",
      landmark: landmark || "",
      notes: notes || "",
      quote: pricingResolved.quote,
      price: pricingResolved.price,
      emergencyFee: pricingResolved.emergencyFee,
      totalAmount: pricingResolved.totalAmount,
      pricing: pricingResolved.pricing,
      paymentStatus: pricingResolved.status === "quote_requested" ? "pending" : "pending",
    };

    const booking = await Booking.create(payload);

    console.log(`[BOOKING CREATE] SUCCESS - Booking ${booking._id} created with status: ${booking.status}, clientId: ${booking.clientId}`);

    if (booking.status === "quote_requested") {
      await createNotification({
        userId: providerId,
        type: "quote_requested",
        title: "New Quote Request",
        message: `A client requested a quote before payment`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
      });
    }

    if (booking.status === "requested") {
      await createNotification({
        userId: providerId,
        type: "booking_request",
        title: "New Booking Request",
        message: `You have a new booking request from ${req.user.profile?.name || "a client"}`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        sendEmail: true, // Send email notification
      });
    }
    
    res.json({ booking, id: booking._id });
  } catch (e) {
    next(e);
  }
});

/**
 * Emergency request
 */
router.post("/emergency-request", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    // STRICT: Only clients can create emergency bookings
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can create emergency bookings" });
    }

    const { serviceId, location, addressText, landmark, notes } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: "Service ID is required" });
    }

    const service = await Service.findById(serviceId).select(
      "providerId categoryId priceMode basePrice emergencyPrice priceRange quoteDescription visitFee includedHours hourlyRate"
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const providerId = String(service.providerId);

    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(400).json({ message: "Provider not found" });
    }

    // PHASE 2: Check Category Skill Proof Approval
    const isCategoryApproved = provider.providerDetails?.approvedCategories?.some(
      (id) => id.toString() === service.categoryId.toString()
    );

    if (!isCategoryApproved) {
      return res.status(403).json({
        message: "Provider not approved for this category",
        reason: "This provider has not yet been approved to offer services in this category.",
      });
    }

    const eligibility = await getEmergencyRequestEligibility({
      providerId,
      serviceId,
      location,
    });

    if (!eligibility.ok) {
      if (eligibility.kycStatus && !isKycApproved(eligibility.kycStatus)) {
        return res.status(403).json({
          message: "Provider is not KYC approved",
          reason: "You can only request emergency services from KYC approved providers.",
          kycStatus: eligibility.kycStatus,
        });
      }

      return res.status(400).json({
        message: "Emergency booking not eligible",
        errors: eligibility.errors,
      });
    }

    const distanceKm = eligibility.distanceKm;

    const pricingResolved = resolveBookingPricing(service, "emergency");

    const payload = {
      clientId: req.user.id,
      type: "emergency",
      providerId,
      serviceId,
      status: pricingResolved.status,
      requestedAt: new Date(),
      distanceKm,
      location,
      addressText: addressText || "",
      landmark: landmark || "",
      notes: notes || "",
      quote: pricingResolved.quote,
      price: pricingResolved.price,
      emergencyFee: pricingResolved.emergencyFee,
      totalAmount: pricingResolved.totalAmount,
      pricing: pricingResolved.pricing,
      paymentStatus: pricingResolved.status === "quote_requested" ? "pending" : "pending",
    };

    const booking = await Booking.create(payload);
    
    if (booking.status === "quote_requested") {
      await createNotification({
        userId: providerId,
        type: "quote_requested",
        title: "Emergency Quote Request",
        message: `Client requested an emergency quote before payment`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
      });
    }

    if (booking.status === 'requested') {
      await createNotification({
        userId: providerId,
        type: "booking_request",
        title: "🚨 EMERGENCY Booking Request",
        message: `URGENT: Emergency service request from ${req.user.profile?.name || "a client"} - ${distanceKm}km away`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        metadata: { isEmergency: true, distance: distanceKm },
        sendEmail: true,
        sendSMS: true, // Send SMS for emergency bookings
      });
    }
    
    res.json({ booking, id: booking._id, message: "Emergency request sent!" });
  } catch (e) {
    next(e);
  }
});

/**
 * Provider accepts an emergency booking
 * PHASE 2A: Requires KYC verification (similar to normal booking acceptance)
 */
router.post("/provider-accept/:id", authGuard, roleGuard(["provider"]), requireVerifiedProvider, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (booking.type !== "emergency")
      return res.status(400).json({ message: "Not an emergency booking" });

    if (booking.status !== "requested")
      return res.status(400).json({ message: "Emergency already handled" });

    booking.status = hasSufficientEscrowForBooking(booking) ? "confirmed" : "accepted";
    booking.acceptedAt = new Date();
    booking.emergency.acceptedBy = req.user.id;

    booking.emergency.respondedProviders =
      booking.emergency.respondedProviders || [];
    booking.emergency.respondedProviders.push(req.user.id);

    await booking.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Provider rejects emergency request
 */
router.post("/provider-reject/:id", authGuard, roleGuard(["provider"]), requireVerifiedProvider, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    booking.emergency.respondedProviders =
      booking.emergency.respondedProviders || [];
    booking.emergency.respondedProviders.push(req.user.id);

    await booking.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Provider accepts normal booking
 * PHASE 2A: Now requires KYC verification to be approved
 */
router.post("/accept/:id", authGuard, roleGuard(["provider"]), requireVerifiedProvider, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (String(booking.providerId) !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    if (booking.status !== "requested")
      return res.status(400).json({ message: "Booking already handled" });

    booking.status = hasSufficientEscrowForBooking(booking) ? "confirmed" : "accepted";
    booking.acceptedAt = new Date();

    await booking.save();

    // Notify client that booking was accepted
    await createNotification({
      userId: booking.clientId,
      type: "booking_accepted",
      title: "Booking Accepted",
      message: `Your booking has been accepted by the provider`,
      category: "booking",
      bookingId: booking._id,
      fromUserId: req.user.id,
      sendEmail: true,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Provider rejects normal booking
 */
router.post("/reject/:id", authGuard, roleGuard(["provider"]), requireVerifiedProvider, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (String(booking.providerId) !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    if (booking.status !== "requested")
      return res.status(400).json({ message: "Booking already handled" });

    booking.status = "rejected";
    booking.cancelledAt = new Date();

    await booking.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * PROVIDER: Mark job as complete (awaits client confirmation)
 */
router.post("/complete/:id", authGuard, roleGuard(["provider"]), async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Not found" });

    if (String(booking.providerId) !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    if (booking.disputeId || booking.status === "disputed") {
      const Dispute = require("../models/Dispute");
      const dispute = booking.disputeId
        ? await Dispute.findById(booking.disputeId).select("status")
        : null;

      if (!dispute || !["resolved", "closed", "rejected"].includes(dispute.status)) {
        return res.status(400).json({ message: "Booking is in dispute and cannot be completed" });
      }
    }

    if (booking.status !== "in-progress")
      return res.status(400).json({ message: "Job must be in-progress to mark as complete" });

    if (booking.pricing?.adjustment?.status === "pending_client_approval") {
      return res.status(400).json({
        message: "Cannot complete: waiting for client approval for additional charges.",
      });
    }

    if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
      return res.status(400).json({
        message: "Additional escrow payment is required before completion",
      });
    }

    const agreedAmount = resolveAgreedAmount(booking);
    const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
    if (escrowHeldAmount < agreedAmount) {
      return res.status(400).json({
        message: "Escrow is insufficient for the agreed amount",
        additionalEscrowRequired: Number((agreedAmount - escrowHeldAmount).toFixed(2)),
      });
    }

    booking.status = "pending-completion";
    booking.providerCompletedAt = new Date();

    await booking.save();

    // Notify client to confirm completion
    await createNotification({
      userId: booking.clientId,
      type: "booking_completed",
      title: "Job Completed - Confirmation Needed",
      message: `Provider has marked your booking as complete. Please confirm if you're satisfied with the service.`,
      category: "booking",
      bookingId: booking._id,
      fromUserId: req.user.id,
      sendEmail: true,
    });

    res.json({ ok: true, message: "Awaiting client confirmation" });
  } catch (e) {
    next(e);
  }
});

/**
 * CLIENT: Confirm completion (final step)
 * - Releases payment from escrow to provider
 */
router.post("/confirm-completion/:id", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking)
      return res.status(404).json({ message: "Not found" });

    if (String(booking.clientId) !== req.user.id)
      return res.status(403).json({ message: "Not your booking" });

    let dispute = null;
    if (booking.disputeId) {
      const Dispute = require("../models/Dispute");
      dispute = await Dispute.findById(booking.disputeId).select("status");
    }

    if (dispute && !["resolved", "closed", "rejected"].includes(dispute.status)) {
      return res.status(400).json({ message: "Booking is in dispute and cannot be completed" });
    }

    const canCompleteDisputed =
      booking.status === "disputed" &&
      booking.providerCompletedAt &&
      dispute &&
      ["resolved", "closed", "rejected"].includes(dispute.status);

    if (booking.status !== "pending-completion" && !canCompleteDisputed)
      return res.status(400).json({ message: "Booking not ready for completion" });

    if (booking.pricing?.adjustment?.status === "pending_client_approval") {
      return res.status(400).json({ message: "Resolve adjusted quote before completion" });
    }

    if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
      return res.status(400).json({
        message: "Additional escrow payment is pending",
      });
    }

    const agreedAmount = resolveAgreedAmount(booking);
    const escrowHeldAmount = Number(booking.pricing?.escrowHeldAmount || 0);
    if (escrowHeldAmount < agreedAmount) {
      return res.status(400).json({
        message: "Escrow is insufficient for final agreed amount",
        additionalEscrowRequired: Number((agreedAmount - escrowHeldAmount).toFixed(2)),
      });
    }

    // Update booking status to completed
    booking.status = "completed";
    booking.completedAt = new Date();
    booking.clientConfirmedAt = new Date();
    booking.paymentStatus = "released";
    await booking.save();

    // CRITICAL ESCROW STEP: Release payment from FUNDS_HELD to provider
    const Payment = require("../models/Payment");
    const ProviderWallet = require("../models/ProviderWallet");
    
    const heldPayments = await Payment.find({ bookingId: booking._id, status: 'FUNDS_HELD' });
    const totalHeldAmount = heldPayments.reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0
    );

    for (const payment of heldPayments) {
      payment.status = 'RELEASED';
      payment.releasedAt = new Date();
      payment.clientConfirmedAt = new Date();
      await payment.save();
    }

    if (totalHeldAmount > 0) {
      const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
      if (wallet) {
        wallet.pendingBalance = Math.max(0, Number(wallet.pendingBalance || 0) - totalHeldAmount);
        wallet.availableBalance = Number(wallet.availableBalance || 0) + totalHeldAmount;
        wallet.totalEarned = Number(wallet.totalEarned || 0) + totalHeldAmount;
        await wallet.save();
      }
    }

    booking.pricing.escrowHeldAmount = Math.max(
      0,
      Number(booking.pricing?.escrowHeldAmount || 0) - totalHeldAmount
    );
    booking.pricing.additionalEscrowRequired = 0;
    await booking.save();

    // Notify provider that payment is released
    await createNotification({
      userId: booking.providerId,
      type: "payment_released",
      title: "Payment Released!",
      message: `Client confirmed completion. NPR ${totalHeldAmount || booking.totalAmount} has been released to your wallet.`,
      category: "payment",
      bookingId: booking._id,
      fromUserId: req.user.id,
      sendEmail: true,
    });

    res.json({ ok: true, message: "Payment released to provider!" });
  } catch (e) {
    next(e);
  }
});

/**
 * Get upcoming bookings
 */
router.get("/upcoming", authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`\n[BOOKINGS /upcoming] START - User ${userId} (role: ${userRole})`);
    
    const q =
      userRole === "provider"
        ? { providerId: userId }
        : { clientId: userId };

    const providerActiveStatuses = [
      "requested",
      "pending_payment",
      "quote_requested",
      "quote_sent",
      "quote_pending_admin_review",
      "quote_accepted",
      "accepted",
      "confirmed",
      "in-progress",
      "pending-completion",
      "provider_completed",
      "awaiting_client_confirmation",
      "disputed",
    ];

    const terminalStatuses = ["completed", "cancelled", "rejected", "no-show", "resolved_refunded"];

    const statusFilter =
      userRole === "provider"
        ? { $in: providerActiveStatuses }
        : { $nin: terminalStatuses };

    console.log(`[BOOKINGS /upcoming] Query filter:`, JSON.stringify(q));
    console.log(`[BOOKINGS /upcoming] Status filter:`, userRole === "provider" ? `Include: ${providerActiveStatuses.join(", ")}` : `Exclude: ${terminalStatuses.join(", ")}`);

    const bookings = await Booking.find({
      ...q,
      status: statusFilter,
    })
      .populate("serviceId", "title category")
      .populate("providerId", "profile phone providerDetails")
      .populate("clientId", "profile email phone")
      .sort({ createdAt: -1, schedule: 1 });

    console.log(`[BOOKINGS /upcoming] Found ${bookings.length} bookings`);
    
    if (bookings.length > 0) {
      const summary = bookings.slice(0, 5).map(b => ({
        id: b._id.toString().slice(-6),
        status: b.status,
        clientId: String(b.clientId?._id || b.clientId).slice(-6),
        providerId: String(b.providerId?._id || b.providerId).slice(-6),
        serviceTitle: b.serviceId?.title,
        createdAt: b.createdAt?.toISOString().split('T')[0],
        paymentStatus: b.paymentStatus,
      }));
      console.log(`[BOOKINGS /upcoming] Sample bookings:`, JSON.stringify(summary, null, 2));
    }

    console.log(`[BOOKINGS /upcoming] END\n`);

    res.json({ bookings });
  } catch (e) {
    console.error(`[BOOKINGS /upcoming] ERROR:`, e.message);
    next(e);
  }
});

/**
 * Past bookings
 */
router.get("/past", authGuard, async (req, res, next) => {
  try {
    const q =
      req.user.role === "provider"
        ? { providerId: req.user.id }
        : { clientId: req.user.id };

    const bookings = await Booking.find({
      ...q,
      status: { $in: ["completed", "cancelled", "rejected", "no-show", "resolved_refunded"] },
    })
      .populate("serviceId", "title category")
      .populate("providerId", "profile phone providerDetails")
      .populate("clientId", "profile email phone")
      .sort({ completedAt: -1 });

    res.json({ bookings });
  } catch (e) {
    next(e);
  }
});

/**
 * Get provider bookings with filters
 */
router.get(
  "/provider-bookings",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { limit = 10, status } = req.query;

      // STRICT: Only providers can access their bookings
      if (req.user.role !== "provider") {
        return res.status(403).json({ message: "Only providers can access provider bookings" });
      }

      const query = { providerId: req.user.id };
      if (status) {
        if (status === "all") {
          delete query.status;
        } else {
          const mappedStatuses = getStatusesForTab(status);
          if (mappedStatuses.length > 0) {
            query.status = { $in: mappedStatuses };
          } else if (status === "pending-completion") {
            query.status = { $in: getStatusesForTab("completion_pending") };
          } else {
            query.status = status;
          }
        }
      }

      const bookings = await Booking.find(query)
        .populate("clientId", "profile email")
        .populate("serviceId", "title category")
        .sort({ createdAt: -1 })
        .limit(Number(limit));

      res.json({ bookings });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/bookings/:id
 * Fetch a single booking by ID
 */
router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("clientId", "profile email phone")
      .populate("providerId", "profile email phone kycStatus providerDetails")
      .populate(
        "serviceId",
        "title description category basePrice emergencyPrice priceMode priceRange quoteDescription visitFee includedHours hourlyRate"
      );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user has access to this booking
    const userId = req.user.id;
    const isClient = String(booking.clientId._id) === userId;
    const isProvider = String(booking.providerId._id) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ booking });
  } catch (e) {
    next(e);
  }
});

/**
 * CLIENT: Confirm booking (accepted -> confirmed)
 */
router.patch(
  "/:id/confirm",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (String(booking.clientId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      if (booking.status !== "accepted") {
        return res.status(400).json({ 
          message: `Cannot confirm booking with status: ${booking.status}` 
        });
      }

      if (!hasSufficientEscrowForBooking(booking)) {
        return res.status(400).json({
          message: "Payment has not been fully secured yet",
        });
      }

      if (booking.type !== "normal") {
        return res.status(400).json({ 
          message: "Emergency bookings skip confirmation" 
        });
      }

      booking.status = "confirmed";
      booking.confirmedAt = new Date();
      if (scheduledAt) booking.scheduledAt = new Date(scheduledAt);

      await booking.save();

      // Notify provider that client confirmed
      await createNotification({
        userId: booking.providerId,
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Client has confirmed the booking`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        sendEmail: true,
      });

      res.json({ ok: true, booking });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * PROVIDER: Mark "On The Way" (confirmed/accepted -> provider_en_route)
 */
router.patch(
  "/:id/en-route",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (String(booking.providerId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      if (!["confirmed", "accepted"].includes(booking.status)) {
        // If already en route, just return success (idempotent)
        if (booking.status === "provider_en_route") {
          return res.json({ message: "Already en route", booking });
        }
        return res.status(400).json({
          message: `Cannot mark en route from status: ${booking.status}`,
        });
      }

      booking.status = "provider_en_route";
      booking.enRouteAt = new Date();

      await booking.save();

      // Notify client
      await createNotification({
        userId: booking.clientId,
        type: "provider_en_route",
        title: "Provider On The Way!",
        message: `Your provider is on the way to your location`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        sendEmail: false,
      });

      // Real-time push: notify client detail page via socket
      const io = getIO();
      if (io) {
        const room = `tracking:${booking._id}`;
        io.to(room).emit("booking_status_changed", {
          bookingId: String(booking._id),
          status: "provider_en_route",
        });
      }

      res.json({ ok: true, booking });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * PROVIDER: Start job (confirmed/accepted/provider_en_route -> in-progress)
 */
router.patch(
  "/:id/start",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (String(booking.providerId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      if (!["confirmed", "accepted", "provider_en_route"].includes(booking.status)) {
        return res.status(400).json({ 
          message: `Cannot start booking with status: ${booking.status}` 
        });
      }

      booking.status = "in-progress";
      booking.startedAt = new Date();
      // Clear live location when job starts (no longer traveling)
      booking.providerLiveLocation = { lat: null, lng: null, heading: null, speed: null, updatedAt: null };

      await booking.save();

      // Real-time push: notify client detail page via socket
      const io = getIO();
      if (io) {
        const room = `tracking:${booking._id}`;
        io.to(room).emit("booking_status_changed", {
          bookingId: String(booking._id),
          status: "in-progress",
        });
      }

      // Notify client that job has started
      await createNotification({
        userId: booking.clientId,
        type: "booking_started",
        title: "Job Started",
        message: `Provider has started working on your booking`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        sendEmail: true,
      });

      res.json({ ok: true, booking });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * CLIENT: Cancel booking
 */
router.patch(
  "/:id/cancel",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (String(booking.clientId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      // Can only cancel before work starts, including quote lifecycle states
      const cancellableStatuses = [
        "pending_payment",
        "requested",
        "accepted",
        "confirmed",
        "quote_requested",
        "quote_sent",
        "quote_pending_admin_review",
        "quote_accepted",
        "pending_quote_approval",
      ];
      if (!cancellableStatuses.includes(booking.status)) {
        return res.status(400).json({ 
          message: `Cannot cancel booking with status: ${booking.status}` 
        });
      }

      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      booking.cancellation = {
        cancelledBy: req.user.id,
        reason: reason || "Cancelled by client",
        cancelledAt: new Date(),
      };

      await booking.save();
      // Notify provider about cancellation
      await createNotification({
        userId: booking.providerId,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Client has cancelled the booking. Reason: ${reason || "Not specified"}`,
        category: "booking",
        bookingId: booking._id,
        fromUserId: req.user.id,
        sendEmail: true,
      });
      res.json({ ok: true, booking });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * START TIMER - Provider starts tracking work time
 */
router.post("/:id/timer/start", authGuard, roleGuard(["provider"]), async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.providerId) !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }

    if (booking.status !== "in-progress") {
      return res.status(400).json({ message: "Job must be in-progress to start timer" });
    }

    booking.timeTracking.isTimerRunning = true;
    booking.timeTracking.timerStartedAt = new Date();
    
    await booking.save();

    res.json({ 
      ok: true, 
      timeTracking: booking.timeTracking,
      message: "Timer started"
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PAUSE TIMER - Provider pauses work timer
 */
router.post("/:id/timer/pause", authGuard, roleGuard(["provider"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { totalMinutes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.providerId) !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }

    if (!booking.timeTracking.isTimerRunning) {
      return res.status(400).json({ message: "Timer is not running" });
    }

    const sessionDurationSeconds = Math.max(1, Math.round(
      (new Date() - booking.timeTracking.timerStartedAt) / 1000
    )); // seconds

    // Add to sessions history
    booking.timeTracking.timerSessions.push({
      startedAt: booking.timeTracking.timerStartedAt,
      pausedAt: new Date(),
      durationSeconds: sessionDurationSeconds,
    });

    booking.timeTracking.totalSeconds += sessionDurationSeconds;
    booking.timeTracking.isTimerRunning = false;
    booking.timeTracking.timerStartedAt = null;

    booking.pricing = booking.pricing || {};
    booking.pricing.extraTimeCost = computeEstimatedExtraTimeCost(
      booking.timeTracking.totalSeconds,
      booking.pricing?.includedHours,
      booking.pricing?.hourlyRate
    );

    await booking.save();

    res.json({ 
      ok: true, 
      timeTracking: booking.timeTracking,
      estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
      message: "Timer paused"
    });
  } catch (e) {
    next(e);
  }
});

/**
 * RESET TIMER - Clear timer data
 */
router.post("/:id/timer/reset", authGuard, roleGuard(["provider"]), async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.providerId) !== req.user.id) {
      return res.status(403).json({ message: "Not your booking" });
    }

    booking.timeTracking = {
      totalSeconds: 0,
      isTimerRunning: false,
      timerStartedAt: null,
      timerSessions: [],
    };
    booking.pricing = booking.pricing || {};
    booking.pricing.extraTimeCost = 0;

    await booking.save();

    res.json({ 
      ok: true, 
      timeTracking: booking.timeTracking,
      message: "Timer reset"
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DOWNLOAD CALENDAR (.ics) - Phase 2B
 * Generate and download iCalendar file for a booking
 */
router.get("/:id/calendar", authGuard, async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("serviceId", "title")
      .populate("providerId", "profile.name email phone")
      .populate("clientId", "profile.name email phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Authorization: only client, provider, or admin
    const userId = req.user.id;
    const isClient = String(booking.clientId._id) === userId;
    const isProvider = String(booking.providerId._id) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only generate calendar for confirmed bookings
    const validStatuses = ["confirmed", "accepted", "in-progress", "pending-completion", "completed"];
    if (!validStatuses.includes(booking.status)) {
      return res.status(400).json({ 
        message: "Calendar not available for this booking status",
        status: booking.status
      });
    }

    const icsContent = generateICS(booking);
    const filename = generateICSFilename(booking);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(icsContent);
  } catch (e) {
    next(e);
  }
});

// ========================
// PHASE 2C: QUOTE WORKFLOW
// ========================

/**
 * Get pending quotes for admin review
 * GET /bookings/quotes/pending
 * PHASE 3: Dedicated endpoint for admin efficiency
 */
router.get("/quotes/pending", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const pendingQuotes = await Booking.find({
      "quote.status": "pending_admin_review"
    })
      .populate("clientId", "profile.name email")
      .populate("providerId", "profile.name email")
      .populate("serviceId", "title")
      .sort({ "quote.sentAt": -1 })
      .limit(50); // Limit to 50 most recent

    res.json({ 
      quotes: pendingQuotes,
      count: pendingQuotes.length
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Client requests a quote for a booking
 * POST /bookings/:id/request-quote
 * PHASE 3: Added quote status validation
 */
router.post("/:id/request-quote", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify ownership
    if (String(booking.clientId) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const pricingType = resolvePricingType(booking);
    if (pricingType !== PRICING_TYPES.QUOTE) {
      return res.status(400).json({
        message: "Quote requests are only supported for quote-based services",
      });
    }

    if (!["requested", "pending_payment", "quote_rejected"].includes(booking.status)) {
      return res.status(400).json({ 
        message: "Cannot request quote for this booking status",
        currentStatus: booking.status
      });
    }

    if (booking.quote && ["sent", "pending_admin_review", "approved", "accepted"].includes(booking.quote.status)) {
      return res.status(400).json({ 
        message: "A quote is already pending or approved for this booking",
        quoteStatus: booking.quote.status,
        suggestion: "Wait for current quote response before requesting another quote."
      });
    }

    // Update booking with quote request
    booking.status = "quote_requested";
    booking.quote = {
      status: "requested",
      quoteMessage: message || "",
      createdAt: new Date(),
    };

    await booking.save();

    // Notify provider
    await createNotification({
      userId: booking.providerId,
      type: "quote_requested",
      title: "New Quote Request",
      message: `Client has requested a quote for your service`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    res.json({ 
      message: "Quote request sent successfully",
      booking 
    });
  } catch (e) {
    console.error('[Quote Request Error]', {
      bookingId: req.params.id,
      userId: req.user?.id,
      error: e.message,
      stack: e.stack
    });
    next(e);
  }
});

/**
 * Provider sends a quote for a booking
 * POST /bookings/:id/send-quote
 * PHASE 3: Added KYC verification and improved validation
 */
router.post("/:id/send-quote", authGuard, roleGuard(["provider"]), requireVerifiedProvider, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quotedPrice, quoteMessage } = req.body;

    if (!quotedPrice || quotedPrice <= 0) {
      return res.status(400).json({ message: "Valid quoted price is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify ownership
    if (String(booking.providerId) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const pricingType = resolvePricingType(booking);
    if (pricingType !== PRICING_TYPES.QUOTE) {
      return res.status(400).json({ message: "Quotes are not available for fixed-price bookings" });
    }

    if (booking.status !== "quote_requested") {
      return res.status(400).json({ 
        message: "No quote has been requested for this booking",
        currentStatus: booking.status
      });
    }

    // Validate booking is not cancelled or completed
    const invalidStatuses = ['cancelled', 'completed', 'no-show'];
    if (invalidStatuses.includes(booking.status)) {
      return res.status(400).json({ 
        message: "Cannot submit quote for cancelled or completed bookings",
        currentStatus: booking.status
      });
    }

    const rangeMax = Number(booking.pricing?.rangeMax || 0);
    const isAboveRangeMax = false;

    booking.status = isAboveRangeMax ? "quote_pending_admin_review" : "quote_sent";
    booking.quote.status = isAboveRangeMax ? "pending_admin_review" : "sent";
    booking.quote.quotedPrice = quotedPrice;
    booking.quote.quoteMessage = quoteMessage || "";
    booking.quote.sentAt = new Date();
    booking.pricing.finalPrice = Number(quotedPrice);
    booking.pricing.maxRangeExceeded = !!isAboveRangeMax;
    booking.pricing.requiresAdminReview = !!isAboveRangeMax;
    booking.pricing.adminReviewReason = isAboveRangeMax
      ? `Quoted price NPR ${quotedPrice} exceeds declared maximum NPR ${rangeMax}`
      : "";

    await booking.save();

    if (isAboveRangeMax) {
      const admins = await User.find({ role: "admin" }).select("_id");
      for (const admin of admins) {
        await createNotification({
          userId: admin._id,
          type: "quote_pending_review",
          title: "Range Quote Above Max",
          message: `Quote NPR ${quotedPrice} is above configured max NPR ${rangeMax}. Review recommended.`,
          category: "booking",
          bookingId: booking._id,
        });
      }
    }

    if (isAboveRangeMax) {
      await createNotification({
        userId: booking.clientId,
        type: "quote_pending_review",
        title: "Quote Under Review",
        message: `Provider submitted NPR ${quotedPrice}, which is above published range. Admin review is in progress.`,
        category: "booking",
        metadata: { bookingId: booking._id },
      });
    } else {
      await createNotification({
        userId: booking.clientId,
        type: "quote_sent",
        title: "Quote Received",
        message: `Provider has sent a quote. Review and accept to proceed with payment.`,
        category: "booking",
        metadata: { bookingId: booking._id },
      });
    }

    res.json({ 
      message: isAboveRangeMax
        ? "Quote submitted and flagged for admin review"
        : "Quote sent to client",
      booking 
    });
  } catch (e) {
    console.error('[Quote Submission Error]', {
      bookingId: req.params.id,
      providerId: req.user?.id,
      quotedPrice: req.body.quotedPrice,
      error: e.message,
      stack: e.stack
    });
    next(e);
  }
});

/**
 * Admin approves a quote
 * POST /bookings/:id/approve-quote
 */
router.post("/:id/approve-quote", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedPrice, adminComment } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Can only approve if quote is pending review
    if (booking.quote?.status !== "pending_admin_review") {
      return res.status(400).json({ 
        message: "Quote is not pending review",
        currentStatus: booking.quote?.status
      });
    }

    // Use approved price or fall back to quoted price
    const finalPrice = approvedPrice || booking.quote.quotedPrice;

    // Update booking with admin approval
    booking.status = "quote_accepted";
    booking.quote.status = "approved";
    booking.quote.approvedPrice = finalPrice;
    booking.quote.adminComment = adminComment || "";
    booking.quote.approvedAt = new Date();
    booking.price = finalPrice;
    booking.totalAmount = finalPrice; // Simplified - can add fees if needed

    await booking.save();

    // Notify client to accept and pay
    await createNotification({
      userId: booking.clientId,
      type: "quote_approved",
      title: "Quote Approved",
      message: `Your quote has been approved at NPR ${finalPrice}. Please proceed with payment.`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    // Notify provider
    await createNotification({
      userId: booking.providerId,
      type: "quote_approved",
      title: "Quote Approved",
      message: `Admin has approved your quote at NPR ${finalPrice}`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    res.json({ 
      message: "Quote approved successfully",
      booking 
    });
  } catch (e) {
    console.error('[Quote Approval Error]', {
      bookingId: req.params.id,
      adminId: req.user?.id,
      error: e.message,
      stack: e.stack
    });
    next(e);
  }
});

/**
 * Admin rejects a quote
 * POST /bookings/:id/reject-quote
 */
router.post("/:id/reject-quote", authGuard, roleGuard(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Can only reject if quote is pending review
    if (booking.quote?.status !== "pending_admin_review") {
      return res.status(400).json({ 
        message: "Quote is not pending review",
        currentStatus: booking.quote?.status
      });
    }

    // Update booking with rejection
    booking.status = "quote_rejected";
    booking.quote.status = "rejected";
    booking.quote.rejectionReason = rejectionReason;
    booking.quote.rejectedAt = new Date();

    await booking.save();

    // Notify provider
    await createNotification({
      userId: booking.providerId,
      type: "quote_rejected",
      title: "Quote Rejected",
      message: `Admin rejected your quote. Reason: ${rejectionReason}`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    // Notify client
    await createNotification({
      userId: booking.clientId,
      type: "quote_rejected",
      title: "Quote Rejected",
      message: `The quote for this booking was rejected. You may request a new quote.`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    res.json({ 
      message: "Quote rejected",
      booking 
    });
  } catch (e) {
    console.error('[Quote Rejection Error]', {
      bookingId: req.params.id,
      adminId: req.user?.id,
      error: e.message,
      stack: e.stack
    });
    next(e);
  }
});

/**
 * Client accepts approved quote and proceeds to payment
 * POST /bookings/:id/accept-quote
 */
router.post("/:id/accept-quote", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify ownership
    if (String(booking.clientId) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!isQuotePricing(booking)) {
      return res.status(400).json({ message: "Quote acceptance is only available for quote-based bookings" });
    }

    if (!["sent", "approved"].includes(booking.quote?.status)) {
      return res.status(400).json({ 
        message: "Quote is not ready for acceptance",
        currentStatus: booking.quote?.status
      });
    }

    const finalPrice = Number(booking.quote.approvedPrice || booking.quote.quotedPrice || 0);
    if (finalPrice <= 0) {
      return res.status(400).json({ message: "Invalid quote price" });
    }

    const held = Number(booking.pricing?.escrowHeldAmount || 0);
    const additional = Math.max(0, finalPrice - held);

    booking.status = "pending_payment";
    booking.quote.status = "accepted";
    booking.quote.approvedPrice = finalPrice;
    booking.price = Math.max(0, finalPrice - Number(booking.emergencyFee || 0));
    booking.totalAmount = finalPrice;
    booking.pricing.basePrice = Number(booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || booking.price || 0);
    booking.pricing.approvedAdjustmentsTotal = Math.max(
      0,
      finalPrice - Number(booking.pricing.basePrice || 0)
    );
    booking.pricing.approvedExtraTimeCost = Number(booking.pricing?.approvedExtraTimeCost || 0);
    booking.pricing.finalApprovedPrice = finalPrice;
    booking.pricing.finalPrice = finalPrice;
    booking.pricing.additionalEscrowRequired = additional;

    await booking.save();

    // Notify provider
    await createNotification({
      userId: booking.providerId,
      type: "quote_accepted",
      title: "Quote Accepted",
      message: `Client has accepted the quote and will proceed with payment`,
      category: "booking",
      metadata: { bookingId: booking._id },
    });

    res.json({ 
      message: "Quote accepted. Please proceed with payment.",
      booking,
      paymentAmount: additional > 0 ? additional : booking.quote.approvedPrice
    });
  } catch (e) {
    console.error('[Quote Acceptance Error]', {
      bookingId: req.params.id,
      clientId: req.user?.id,
      error: e.message,
      stack: e.stack
    });
    next(e);
  }
});

/**
 * Provider proposes adjusted quote during accepted/in-progress states
 */
router.post(
  "/:id/propose-adjusted-quote",
  authGuard,
  roleGuard(["provider"]),
  quoteAdjustmentUpload.array("attachments", 5),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { proposedPrice, reason } = req.body;

      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (String(booking.providerId) !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!isRangePricing(booking)) {
        return res.status(400).json({
          message: "Additional charge requests are only available for range pricing",
        });
      }

      if (booking.status !== "in-progress") {
        return res.status(400).json({
          message: "Adjusted quote can only be proposed while booking is in-progress",
        });
      }

      const nextPrice = Number(proposedPrice);
      if (!nextPrice || nextPrice <= 0) {
        return res.status(400).json({ message: "Valid proposedPrice is required" });
      }

      if (!String(reason || "").trim()) {
        return res.status(400).json({ message: "Reason is required for adjusted quote" });
      }

      const attachments = (req.files || []).map((file) => ({
        url: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      const max = Number(booking.pricing?.rangeMax || 0);
      const isRange = booking.pricing?.mode === "range";
      const aboveMax = isRange && max > 0 && nextPrice > max;
      const basePrice = Number(booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0);
      const extraTimeCost = Number(booking.pricing?.extraTimeCost || 0);

      booking.pricing.adjustment = {
        status: "pending_client_approval",
        proposedPrice: nextPrice,
        basePrice,
        extraTimeCost,
        adjustedQuoteReason: reason.trim(),
        reason: reason.trim(),
        attachments,
        proposedBy: req.user.id,
        proposedAt: new Date(),
      };

      booking.pricing.adjustmentHistory = booking.pricing.adjustmentHistory || [];
      booking.pricing.adjustmentHistory.push({
        proposedPrice: nextPrice,
        basePrice,
        extraTimeCost,
        adjustedQuoteReason: reason.trim(),
        reason: reason.trim(),
        attachments,
        proposedBy: req.user.id,
        proposedAt: new Date(),
        status: "pending_client_approval",
      });

      booking.pricing.maxRangeExceeded = !!aboveMax;
      booking.pricing.requiresAdminReview = !!aboveMax;
      booking.pricing.adminReviewReason = aboveMax
        ? `Adjusted quote NPR ${nextPrice} exceeds range max NPR ${max}`
        : "";

      await booking.save();

      await createNotification({
        userId: booking.clientId,
        type: "adjusted_quote_proposed",
        title: "Adjusted Quote Proposed",
        message: aboveMax
          ? `Provider proposed NPR ${nextPrice} (above range max NPR ${max}). Your approval is required.`
          : `Provider proposed a new price of NPR ${nextPrice}. Your approval is required.`,
        category: "booking",
        bookingId: booking._id,
      });

      if (aboveMax) {
        const admins = await User.find({ role: "admin" }).select("_id");
        for (const admin of admins) {
          await createNotification({
            userId: admin._id,
            type: "quote_pending_review",
            title: "Adjusted Quote Above Max",
            message: `Booking ${booking._id.toString().slice(-6)} adjusted quote exceeded range max.`,
            category: "admin",
            bookingId: booking._id,
          });
        }
      }

      res.json({
        message: aboveMax
          ? "Adjusted quote sent to client and flagged for admin review"
          : "Adjusted quote sent to client",
        booking,
        breakdown: {
          basePrice,
          extraTimeCost,
          proposedTotal: nextPrice,
        },
        warning: aboveMax
          ? "Proposed price exceeds configured range max. Admin review recommended."
          : null,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Client accepts/rejects adjusted quote
 */
router.post("/:id/respond-adjusted-quote", authGuard, roleGuard(["client"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be accept or reject" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.clientId) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (booking.pricing?.adjustment?.status !== "pending_client_approval") {
      return res.status(400).json({ message: "No pending adjusted quote" });
    }

    const adjustment = booking.pricing.adjustment;

    if (action === "accept") {
      const approvedTotal = Number(adjustment.proposedPrice || 0);
      const held = Number(booking.pricing?.escrowHeldAmount || 0);
      const additional = Math.max(0, approvedTotal - held);
      const basePrice = Number(booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || 0);
      const approvedExtraTimeCost = Number(adjustment.extraTimeCost || booking.pricing?.extraTimeCost || 0);
      const approvedAdjustmentsTotal = Math.max(0, approvedTotal - basePrice);

      booking.totalAmount = approvedTotal;
      booking.price = Math.max(0, approvedTotal - Number(booking.emergencyFee || 0));
      booking.pricing.basePrice = basePrice;
      booking.pricing.approvedExtraTimeCost = approvedExtraTimeCost;
      booking.pricing.approvedAdjustmentsTotal = approvedAdjustmentsTotal;
      booking.pricing.finalApprovedPrice = approvedTotal;
      booking.pricing.finalPrice = approvedTotal;
      booking.pricing.additionalEscrowRequired = additional;
      booking.pricing.adjustment.status = "accepted";
      booking.pricing.adjustment.clientDecisionAt = new Date();

      const lastHistory = booking.pricing.adjustmentHistory?.[booking.pricing.adjustmentHistory.length - 1];
      if (lastHistory && lastHistory.status === "pending_client_approval") {
        lastHistory.status = "accepted";
        lastHistory.decidedAt = new Date();
      }

      await booking.save();

      await createNotification({
        userId: booking.providerId,
        type: "adjusted_quote_accepted",
        title: "Adjusted Quote Accepted",
        message:
          additional > 0
            ? `Client accepted the adjusted quote. Additional NPR ${additional} escrow payment is pending.`
            : `Client accepted the adjusted quote.`,
        category: "booking",
        bookingId: booking._id,
      });

      return res.json({
        message:
          additional > 0
            ? "Adjusted quote accepted. Please complete additional escrow payment before completion."
            : "Adjusted quote accepted",
        booking,
        amountDue: additional,
        breakdown: {
          basePrice,
          approvedExtraTimeCost,
          approvedAdjustmentsTotal,
          finalApprovedPrice: approvedTotal,
        },
      });
    }

    booking.pricing.adjustment.status = "rejected";
    booking.pricing.adjustment.clientDecisionAt = new Date();
    const lastHistory = booking.pricing.adjustmentHistory?.[booking.pricing.adjustmentHistory.length - 1];
    if (lastHistory && lastHistory.status === "pending_client_approval") {
      lastHistory.status = "rejected";
      lastHistory.decidedAt = new Date();
    }
    await booking.save();

    await createNotification({
      userId: booking.providerId,
      type: "adjusted_quote_rejected",
      title: "Adjusted Quote Rejected",
      message: "Client rejected the adjusted quote.",
      category: "booking",
      bookingId: booking._id,
    });

    res.json({ message: "Adjusted quote rejected", booking });
  } catch (e) {
    next(e);
  }
});

/**
 * DIAGNOSTIC ENDPOINT: Check current user and their bookings
 * Delete this endpoint after debugging
 */
router.get("/debug/my-bookings-check", authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get all bookings where this user is the client OR provider
    const clientBookings = await Booking.find({ clientId: userId });
    const providerBookings = await Booking.find({ providerId: userId });

    // Get upcoming bookings using the same query as /upcoming endpoint
    const q = userRole === "provider" ? { providerId: userId } : { clientId: userId };
    const upcomingBookings = await Booking.find({
      ...q,
      status: {
        $in: [
          "requested",
          "pending_payment",
          "quote_requested",
          "quote_sent",
          "quote_pending_admin_review",
          "quote_accepted",
          "accepted",
          "confirmed",
          "in-progress",
          "pending-completion",
          "provider_completed",
          "awaiting_client_confirmation",
          "disputed",
        ],
      },
    });

    res.json({
      debug: {
        authenticatedUserId: userId,
        authenticatedUserRole: userRole,
        totalClientBookings: clientBookings.length,
        totalProviderBookings: providerBookings.length,
        upcomingBookingsMatchingQuery: upcomingBookings.length,
      },
      clientBookings: clientBookings.map((b) => ({
        _id: b._id,
        clientId: b.clientId,
        providerId: b.providerId,
        status: b.status,
        schedule: b.schedule,
      })),
      providerBookings: providerBookings.map((b) => ({
        _id: b._id,
        clientId: b.clientId,
        providerId: b.providerId,
        status: b.status,
        schedule: b.schedule,
      })),
      upcomingBookings: upcomingBookings.map((b) => ({
        _id: b._id,
        clientId: b.clientId,
        providerId: b.providerId,
        status: b.status,
        schedule: b.schedule,
      })),
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
