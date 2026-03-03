// routes/payment.js
const express = require("express");
const { authGuard, roleGuard } = require("../middleware/auth");
const { buildInitiationPayload, verifyPayment, decodeEsewaResponse, verifyCallbackSignature } = require("../utils/esewa");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const ProviderWallet = require("../models/ProviderWallet");
const Dispute = require("../models/Dispute");
const { createNotificationForUser, notifyAllAdmins } = require("../utils/createNotification");
const { isQuotePricing, resolvePostInitialEscrowStatus, normalizeStatusForTab } = require("../utils/bookingWorkflow");

const router = express.Router();

const toUpperStatus = (value) => {
  if (!value) return null;
  return String(value).trim().toUpperCase();
};

/**
 * POST /api/payments/esewa/initiate
 * Initiate eSewa payment
 */
router.post(
  "/esewa/initiate",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      if (String(booking.clientId) !== req.user.id)
        return res.status(403).json({ message: "Not your booking" });

      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Cancelled bookings cannot be paid" });
      }

      if (isQuotePricing(booking) && booking.quote?.status !== "accepted") {
        return res.status(400).json({
          message: "Quote must be accepted before payment",
        });
      }

      const additionalDue = Number(booking.pricing?.additionalEscrowRequired || 0);
      const isAdditionalEscrow = additionalDue > 0;

      const expectedAmount = isAdditionalEscrow
        ? additionalDue
        : Number(booking.totalAmount || 0);

      if (expectedAmount <= 0) {
        return res.status(400).json({ message: "No payable amount for this booking" });
      }

      if (!isAdditionalEscrow) {
        const existingPaid = await Payment.findOne({
          bookingId,
          status: { $in: ["FUNDS_HELD", "RELEASED"] },
          purpose: "initial_escrow",
        });

        if (existingPaid) {
          return res.status(400).json({ message: "Booking already paid" });
        }
      }

      /**
       * STEP 4 - INITIATE ESEWA PAYMENT
       * 1. Generate transaction UUID
       * 2. Create payment record with status = INITIATED
       * 3. Generate eSewa signature
       * 4. Return payment form data for frontend to auto-submit
       */
      const transaction_uuid = `SEWAHIVE-${bookingId}-${Date.now()}`;

      // Ensure URLs have proper http/https scheme
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const successUrl = `${backendUrl}/api/payment/esewa/success`;
      const failureUrl = `${backendUrl}/api/payment/esewa/failure`;

      console.log('🔗 eSewa Callback URLs:');
      console.log('   Success:', successUrl);
      console.log('   Failure:', failureUrl);

      // Build eSewa payment form payload with signature
      const payload = buildInitiationPayload({
        amount: expectedAmount,
        total_amount: expectedAmount,
        transaction_uuid,
        tax_amount: 0,
        product_code: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
        success_url: successUrl,
        failure_url: failureUrl,
        secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
      });

      // Create payment record with INITIATED status
      await Payment.create({
        bookingId,
        clientId: booking.clientId,
        providerId: booking.providerId,
        transaction_uuid,
        amount: expectedAmount,
        purpose: isAdditionalEscrow ? "additional_escrow" : "initial_escrow",
        gateway: 'eSewa',
        status: "INITIATED", // Payment initiated, not yet complete
      });

      // Update booking payment status
      booking.paymentStatus = "initiated";
      await booking.save();

      res.json({ 
        success: true,
        form: payload,
        transaction_uuid,
        amount: expectedAmount,
        purpose: isAdditionalEscrow ? "additional_escrow" : "initial_escrow",
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/payments/esewa/success
 * Handle eSewa success redirect
 * 
 * STEP 5 - AFTER PAYMENT SUCCESS:
 * 1. Verify payment via eSewa status API
 * 2. Update payment.status = FUNDS_HELD (escrow)
 * 3. Update booking.status = requested (from pending_payment)
 * 4. Update provider wallet with pending balance
 * 5. Send notifications to client and provider
 */
router.get("/esewa/success", async (req, res) => {
  try {
    console.log('\n🔵 ===== eSewa Success Callback Received =====');
    console.log('Query params:', req.query);
    
    const { data } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!data) {
      console.error('❌ No data in query params');
      return res.redirect(`${frontendUrl}/payment/failure?error=no_data`);
    }

    console.log('📦 Attempting to decode Base64 data...');
    console.log('   Raw data length:', data.length);
    
    // Decode Base64 response from eSewa
    const decodedData = decodeEsewaResponse(data);
    
    console.log('📦 Decoded eSewa Response:', decodedData ? JSON.stringify(decodedData, null, 2) : 'NULL');
    
    if (!decodedData) {
      console.error('❌ Failed to decode eSewa response or response is null');
      return res.redirect(`${frontendUrl}/payment/failure?error=invalid_data`);
    }

    if (!decodedData.transaction_uuid) {
      console.error('❌ No transaction_uuid in decoded data');
      return res.redirect(`${frontendUrl}/payment/failure?error=invalid_data`);
    }

    const { transaction_uuid, transaction_code, total_amount, status } = decodedData;
    console.log('📋 Extracted values:');
    console.log('   UUID:', transaction_uuid);
    console.log('   Status:', status);
    console.log('   Amount:', total_amount);
    console.log('   Ref Code:', transaction_code);

    // Find payment record
    console.log('🔎 Looking for payment record...');
    const payment = await Payment.findOne({ transaction_uuid });
    
    if (!payment) {
      console.error('❌ Payment not found for UUID:', transaction_uuid);
      return res.redirect(`${frontendUrl}/payment/failure?error=payment_not_found`);
    }

    console.log('✅ Found payment record:', payment._id);
    console.log('   Current status:', payment.status);
    console.log('   Current bookingId:', payment.bookingId);

    /**
     * ⭐ ESCROW FLOW - Trust eSewa Redirect
     */
    if (decodedData.status === 'COMPLETE') {
      console.log('✅ Payment COMPLETE - Marking as FUNDS_HELD (escrow)');
      
      payment.status = 'FUNDS_HELD';
      payment.referenceId = transaction_code || transaction_uuid;
      payment.verifiedAt = new Date();
      payment.receipt = decodedData;
      await payment.save();
      console.log('✅ Payment record saved');

      // Update booking pricing/payment state
      console.log('🔄 Updating booking...');
      const booking = await Booking.findById(payment.bookingId);

      if (booking) {
        const currentHeld = Number(booking.pricing?.escrowHeldAmount || 0);
        const updatedHeld = currentHeld + Number(payment.amount || 0);
        const finalPrice = Number(booking.totalAmount || 0);
        const additionalRequired = Math.max(0, finalPrice - updatedHeld);

        booking.paymentStatus = 'funds_held';
        booking.pricing.escrowHeldAmount = updatedHeld;
        booking.pricing.additionalEscrowRequired = additionalRequired;

        if (payment.purpose === 'initial_escrow' && booking.status === 'pending_payment') {
          booking.status = resolvePostInitialEscrowStatus(booking);
          if (booking.status === 'confirmed') {
            booking.confirmedAt = booking.confirmedAt || new Date();
          }
          if (booking.status === 'requested') {
            booking.requestedAt = booking.requestedAt || new Date();
          }
        }

        await booking.save();

        console.log('[PAYMENT SUCCESS] Booking linkage check:', {
          bookingId: String(booking._id),
          clientId: String(booking.clientId),
          providerId: String(booking.providerId),
          bookingStatus: booking.status,
          paymentStatus: booking.paymentStatus,
        });
      }

      console.log('✅ Booking updated:', booking ? booking.status : 'NOT FOUND');

      // Create or update provider wallet with pending balance (escrow)
      if (booking) {
        console.log('💰 Updating wallet...');
        let wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
        if (!wallet) {
          wallet = new ProviderWallet({ providerId: booking.providerId });
        }
        
        wallet.pendingBalance += payment.amount;
        await wallet.save();
        console.log('✅ Wallet updated - Pending balance:', wallet.pendingBalance);

        // Notify client
        console.log('📬 Sending notifications...');
        try {
          await createNotificationForUser({
            userId: String(booking.clientId),
            type: 'payment_held',
            title: 'Payment Secured',
            message: payment.purpose === 'additional_escrow'
              ? `Additional escrow payment of NPR ${payment.amount} secured.`
              : `Payment of NPR ${payment.amount} is securely held. Funds will be released after service completion and your confirmation.`,
            category: 'payment',
            bookingId: booking._id,
            metadata: { paymentId: payment._id }
          });
          console.log('✅ Client notification sent');
        } catch (notifError) {
          console.error('⚠️ Failed to send client notification:', notifError.message);
        }

        // Notify provider
        try {
          const providerNotification = payment.purpose === 'additional_escrow'
            ? {
                userId: String(booking.providerId),
                type: 'booking_confirmed',
                title: 'Additional Escrow Secured',
                message: `Client added NPR ${payment.amount} escrow. Completion can proceed once work is done.`,
                category: 'booking',
                bookingId: booking._id,
                metadata: {},
              }
            : {
                userId: String(booking.providerId),
                type: 'booking_request',
                title: 'New Booking Request',
                message: `Client payment of NPR ${payment.amount} is secured. Please review and accept the booking request.`,
                category: 'booking',
                bookingId: booking._id,
                metadata: {},
              };

          await createNotificationForUser(providerNotification);
          console.log('✅ Provider notification sent');
        } catch (notifError) {
          console.error('⚠️ Failed to send provider notification:', notifError.message);
        }
        
        console.log('✅ Notifications sent');
      }

      console.log('✅ PAYMENT SUCCESS - Redirecting to success page');
      console.log('🔗 Redirect URL:', `${frontendUrl}/payment/success?booking_id=${payment.bookingId}&transaction_uuid=${transaction_uuid}`);
      return res.redirect(`${frontendUrl}/payment/success?booking_id=${payment.bookingId}&transaction_uuid=${transaction_uuid}`);
    } else {
      console.error('❌ Payment status is not COMPLETE:', status);
      payment.status = 'FAILED';
      payment.receipt = decodedData;
      await payment.save();

      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'failed',
      });

      return res.redirect(`${frontendUrl}/payment/failure?error=payment_incomplete&transaction_uuid=${transaction_uuid}`);
    }
  } catch (error) {
    console.error('\n❌ ===== EXCEPTION IN SUCCESS HANDLER =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/failure?error=verification_failed`);
  }
});

/**
 * GET /api/payment/transactions/client
 * Client payment history
 */
router.get(
  "/transactions/client",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const status = toUpperStatus(req.query.status);

      const filter = { clientId: req.user.id };
      if (status) {
        filter.status = status;
      }

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("bookingId", "serviceId status totalAmount paymentStatus")
          .populate("providerId", "profile.name email"),
        Payment.countDocuments(filter),
      ]);

      res.json({
        success: true,
        payments,
        page,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/payment/transactions/provider
 * Provider payment history
 */
router.get(
  "/transactions/provider",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const status = toUpperStatus(req.query.status);

      const filter = { providerId: req.user.id };
      if (status) {
        filter.status = status;
      }

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("bookingId", "serviceId status totalAmount paymentStatus")
          .populate("clientId", "profile.name email"),
        Payment.countDocuments(filter),
      ]);

      res.json({
        success: true,
        payments,
        page,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/payment/transactions/admin
 * Admin payment history — enhanced with commission/payout fields
 */
router.get(
  "/transactions/admin",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 300);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const status = toUpperStatus(req.query.status);

      const filter = {};
      if (status) {
        filter.status = status;
      }

      const [rawPayments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("bookingId", "serviceTitle serviceId status totalAmount paymentStatus")
          .populate("clientId", "profile.name email")
          .populate("providerId", "profile.name email"),
        Payment.countDocuments(filter),
      ]);

      // Attach derived commission / payout fields to each record
      const payments = rawPayments.map((p) => {
        const obj = p.toObject ? p.toObject() : { ...p };
        const amt = Number(obj.amount || 0);
        obj.platformCommission = obj.platformFee != null
          ? Number(obj.platformFee)
          : Number((amt * 0.15).toFixed(2));
        obj.providerPayout = obj.providerEarnings != null
          ? Number(obj.providerEarnings)
          : Number((amt * 0.85).toFixed(2));
        return obj;
      });

      res.json({
        success: true,
        payments,
        page,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payment/refund/:paymentId
 * Admin-only — refund a FUNDS_HELD payment
 */
router.post(
  "/refund/:paymentId",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { reason = "" } = req.body;
      const payment = await Payment.findById(req.params.paymentId);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.status !== "FUNDS_HELD") {
        return res.status(400).json({
          message: `Cannot refund a payment with status ${payment.status}. Only FUNDS_HELD payments can be refunded.`,
        });
      }

      // Reverse provider wallet pending balance
      const wallet = await ProviderWallet.findOne({ providerId: payment.providerId });
      if (wallet && typeof wallet.refundPending === "function") {
        await wallet.refundPending(payment.amount);
        await wallet.addTransaction({
          type: "REFUND",
          amount: payment.amount,
          description: reason || "Admin-initiated refund",
          bookingId: payment.bookingId,
          paymentId: payment._id,
          status: "COMPLETED",
        });
      }

      payment.status = "REFUNDED";
      payment.refundedAt = new Date();
      if (reason) payment.disputeReason = reason;
      await payment.save();

      // Notify client
      try {
        await createNotificationForUser({
          userId: String(payment.clientId),
          type: "payment_refunded",
          title: "Refund Processed",
          message: `Your payment of NPR ${payment.amount} has been refunded by admin.`,
          category: "payment",
          bookingId: payment.bookingId,
          metadata: { paymentId: payment._id },
        });
      } catch (_) { /* non-fatal */ }

      res.json({ success: true, payment });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payment/client/refund-request/:paymentId
 * Client-only — request a refund for a FUNDS_HELD payment
 */
router.post(
  "/client/refund-request/:paymentId",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.paymentId);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (String(payment.clientId) !== req.user.id) {
        return res.status(403).json({ message: "Not your payment" });
      }
      if (payment.status !== "FUNDS_HELD") {
        return res.status(400).json({
          message: `Refund can only be requested for FUNDS_HELD payments. Current status: ${payment.status}`,
        });
      }
      if (payment.refundRequested) {
        return res.status(400).json({ message: "Refund already requested for this payment" });
      }

      payment.refundRequested = true;
      await payment.save();

      // Notify admins
      try {
        await notifyAllAdmins({
          type: "refund_request",
          title: "Refund Request",
          message: `Client requested a refund of NPR ${payment.amount} for payment ${payment._id}.`,
          category: "payment",
          bookingId: payment.bookingId,
          metadata: { paymentId: payment._id },
        });
      } catch (_) { /* non-fatal */ }

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/payments/esewa/failure
 * Handle eSewa failure redirect
 */
router.get("/esewa/failure", async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { transaction_uuid } = req.query;

    if (transaction_uuid) {
      // Update payment status
      const payment = await Payment.findOne({ transaction_uuid });
      if (payment && payment.status !== 'COMPLETE') {
        payment.status = 'FAILED';
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'failed',
        });
      }
    }

    return res.redirect(`${frontendUrl}/payment/failure?transaction_uuid=${transaction_uuid || 'unknown'}`);
  } catch (error) {
    console.error('eSewa failure handler error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/failure?error=unknown`);
  }
});

/**
 * POST /api/payments/verify (Legacy/Manual verification)
 */
router.post("/verify", async (req, res, next) => {
  try {
    const { transaction_uuid } = req.body;

    const payment = await Payment.findOne({ transaction_uuid });
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    const result = await verifyPayment({
      transaction_uuid,
      total_amount: payment.amount,
      product_code: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
    });

    if (result.status === "COMPLETE") {
      payment.status = "FUNDS_HELD";
      payment.verifiedAt = new Date();
      payment.receipt = result;
      await payment.save();

      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentStatus = "funds_held";

        if (payment.purpose === "initial_escrow" && booking.status === "pending_payment") {
          booking.status = resolvePostInitialEscrowStatus(booking);
          if (booking.status === "confirmed") {
            booking.confirmedAt = booking.confirmedAt || new Date();
          }
          if (booking.status === "requested") {
            booking.requestedAt = booking.requestedAt || new Date();
          }
        }

        await booking.save();
      }

      return res.json({ success: true, payment });
    }

    payment.status = "FAILED";
    await payment.save();

    return res
      .status(400)
      .json({ message: "Payment failed", result });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/payments/escrow/confirm-completion
 * Client confirms service is complete → Release payment to provider
 */
router.post(
  "/escrow/confirm-completion",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (String(booking.clientId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      const normalizedStatus = normalizeStatusForTab(booking.status);
      const hasProviderCompletion = Boolean(booking.providerCompletedAt);
      if (normalizedStatus !== "completion_pending" && !hasProviderCompletion) {
        return res.status(400).json({
          message: "Booking is not awaiting confirmation",
          currentStatus: booking.status,
          normalizedStatus,
          providerCompletedAt: booking.providerCompletedAt || null,
        });
      }

      if (booking.pricing?.adjustment?.status === 'pending_client_approval') {
        return res.status(400).json({ message: 'Adjusted quote approval is pending' });
      }

      if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
        return res.status(400).json({
          message: 'Additional escrow payment is required before completion',
        });
      }

      if (booking.status === 'disputed' || booking.disputeId) {
        return res.status(400).json({ message: 'Booking is under dispute and cannot be completed' });
      }

      const heldPayments = await Payment.find({ bookingId, status: 'FUNDS_HELD' });
      if (!heldPayments.length) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const totalHeldAmount = heldPayments.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const finalPayment = Number(
        booking.pricing?.finalApprovedPrice ||
        booking.pricing?.finalPrice ||
        booking.totalAmount ||
        0
      );

      if (totalHeldAmount < finalPayment) {
        return res.status(400).json({
          message: 'Escrow held is less than agreed final amount',
          additionalEscrowRequired: Number((finalPayment - totalHeldAmount).toFixed(2)),
        });
      }

      // RELEASE ESCROW: Move funds from pending to available
      const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
      if (wallet) {
        await wallet.releaseEscrow(totalHeldAmount);
        
        // Add transaction record
        await wallet.addTransaction({
          type: 'DEPOSIT',
          amount: totalHeldAmount,
          description: `Payment released for booking "${booking._id}"`,
          bookingId: booking._id,
          paymentId: heldPayments[0]._id,
          status: 'COMPLETED',
        });
      }

      for (const payment of heldPayments) {
        payment.status = 'RELEASED';
        payment.escrowReleasedAt = new Date();
        payment.clientConfirmedAt = new Date();
        await payment.save();
      }

      // Update booking
      booking.status = 'completed';
      booking.paymentStatus = 'released';
      booking.clientConfirmedAt = new Date();
      booking.pricing.escrowHeldAmount = Math.max(
        0,
        Number(booking.pricing?.escrowHeldAmount || 0) - totalHeldAmount
      );
      booking.pricing.additionalEscrowRequired = 0;
      booking.pricing.finalApprovedPrice = finalPayment;
      booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
      booking.pricing.paymentAuditTrail.push({
        event: 'escrow_released',
        amount: totalHeldAmount,
        finalPayment,
        approvedAdjustmentsTotal: Number(booking.pricing?.approvedAdjustmentsTotal || 0),
        approvedExtraTimeCost: Number(booking.pricing?.approvedExtraTimeCost || 0),
        actorId: req.user.id,
        at: new Date(),
        note: 'Client confirmed completion and escrow was released',
      });
      await booking.save();

      // Notifications
      await createNotificationForUser({
        userId: booking.providerId,
        type: "payment_released",
        title: "Payment Released",
        message: `Payment of NPR ${totalHeldAmount} has been released to your wallet!`,
        category: "payment",
        bookingId: booking._id,
        metadata: { paymentId: heldPayments[0]._id },
      });

      await createNotificationForUser({
        userId: booking.clientId,
        type: "service_completed",
        title: "Service Confirmed",
        message: "Service completed and confirmed. Thank you!",
        category: "booking",
        bookingId: booking._id,
      });

      res.json({
        success: true,
        message: 'Service confirmed, payment released!',
        bookingId: booking._id,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payments/escrow/raise-dispute
 * Client raises dispute, payment stays locked
 */
router.post(
  "/escrow/raise-dispute",
  authGuard,
  roleGuard(["client"]),
  async (req, res, next) => {
    try {
      const { bookingId, reason, description, evidenceUrls = [] } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (String(booking.clientId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      if (
        booking.status !== 'provider_completed' &&
        booking.status !== 'awaiting_client_confirmation' &&
        booking.status !== 'pending-completion'
      ) {
        return res.status(400).json({ message: "Cannot raise dispute at this stage" });
      }

      const payment = await Payment.findOne({ bookingId });
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      const timerSnapshot = {
        totalSeconds: Number(booking.timeTracking?.totalSeconds || 0),
        totalHours: Number(((Number(booking.timeTracking?.totalSeconds || 0) / 3600).toFixed(2))),
        includedHours: Number(booking.pricing?.includedHours || 0),
        hourlyRate: Number(booking.pricing?.hourlyRate || 0),
        estimatedExtraCost: Number(booking.pricing?.extraTimeCost || 0),
        sessions: Array.isArray(booking.timeTracking?.timerSessions)
          ? booking.timeTracking.timerSessions
          : [],
        capturedAt: new Date(),
      };

      // Create dispute
      const dispute = new Dispute({
        bookingId,
        paymentId: payment._id,
        clientId: booking.clientId,
        providerId: booking.providerId,
        reason,
        description,
        openedBy: req.user.id,
        message: description,
        evidence: evidenceUrls,
        amount: payment.amount,
        timerSnapshot,
        status: 'client_provided',
        clientProvidedAt: new Date(),
      });

      await dispute.save();

      // Freeze all held escrow payments for this booking
      const heldPayments = await Payment.find({ bookingId, status: 'FUNDS_HELD' });
      for (const heldPayment of heldPayments) {
        heldPayment.status = 'DISPUTED';
        heldPayment.disputeId = dispute._id;
        heldPayment.disputeReason = reason;
        await heldPayment.save();
      }

      // Keep compatibility for older single-payment flow
      payment.status = 'DISPUTED';
      payment.disputeId = dispute._id;
      payment.disputeReason = reason;
      await payment.save();

      // Update booking
      booking.status = 'disputed';
      booking.pricing = booking.pricing || {};
      booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
      booking.pricing.paymentAuditTrail.push({
        event: 'escrow_frozen_on_dispute',
        amount: Number(booking.pricing?.escrowHeldAmount || 0),
        finalPayment: Number(booking.pricing?.finalApprovedPrice || booking.totalAmount || 0),
        approvedAdjustmentsTotal: Number(booking.pricing?.approvedAdjustmentsTotal || 0),
        approvedExtraTimeCost: Number(booking.pricing?.approvedExtraTimeCost || 0),
        actorId: req.user.id,
        at: new Date(),
        note: 'Dispute raised before completion confirmation; escrow frozen',
      });
      await booking.save();

      // Notify provider
      await createNotificationForUser({
        userId: booking.providerId,
        type: "dispute_raised",
        title: "Dispute Raised",
        message: "A dispute has been raised for this booking. Admin will review.",
        category: "dispute",
        bookingId: booking._id,
        disputeId: dispute._id,
      });

      // Notify admin
      await notifyAllAdmins({
        type: "new_dispute",
        title: "New Dispute",
        message: `New dispute raised for booking "${booking._id}"`,
        category: "dispute",
        bookingId: booking._id,
        disputeId: dispute._id,
      });

      res.json({
        success: true,
        message: 'Dispute raised, admin will review',
        disputeId: dispute._id,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payments/escrow/provider-mark-complete
 * Provider marks job as complete
 */
router.post(
  "/escrow/provider-mark-complete",
  authGuard,
  roleGuard(["provider"]),
  async (req, res, next) => {
    try {
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (String(booking.providerId) !== req.user.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      const normalizedStatus = normalizeStatusForTab(booking.status);
      if (normalizedStatus !== "in_progress") {
        return res.status(400).json({
          message: "Job must be in-progress to mark as complete",
          currentStatus: booking.status,
          normalizedStatus,
        });
      }

      if (booking.status === 'disputed' || booking.disputeId) {
        return res.status(400).json({ message: 'Booking is under dispute and cannot be completed' });
      }

      if (booking.pricing?.adjustment?.status === 'pending_client_approval') {
        return res.status(400).json({
          message: 'Cannot complete: waiting for client approval for additional charges.',
        });
      }

      if (Number(booking.pricing?.additionalEscrowRequired || 0) > 0) {
        return res.status(400).json({
          message: 'Additional escrow payment is required before completion',
        });
      }

      const agreedAmount = Number(
        booking.pricing?.finalApprovedPrice ||
        booking.pricing?.finalPrice ||
        booking.totalAmount ||
        0
      );
      const escrowHeld = Number(booking.pricing?.escrowHeldAmount || 0);
      if (escrowHeld < agreedAmount) {
        return res.status(400).json({
          message: 'Escrow is insufficient for agreed amount',
          additionalEscrowRequired: Number((agreedAmount - escrowHeld).toFixed(2)),
        });
      }

      // Update booking
      booking.status = 'pending-completion';
      booking.providerCompletedAt = new Date();
      await booking.save();

      // Notify client
      await createNotificationForUser({
        userId: booking.clientId,
        type: "provider_completed_service",
        title: "Service Completed",
        message: "Service is complete. Please review and confirm.",
        category: "booking",
        bookingId: booking._id,
      });

      res.json({
        success: true,
        message: 'Marked as complete, waiting for client confirmation',
        bookingId:booking._id,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/callback", async (req, res) => {
  res.json({ received: true });
});

/**
 * ========================
 * ADMIN DISPUTE ENDPOINTS
 * ========================
 */

/**
 * GET /api/payments/admin/disputes
 * List all disputes for admin review
 */
router.get(
  "/admin/disputes",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { status = 'open', page = 1, limit = 10 } = req.query;

      const query = status !== 'all' ? { status } : {};
      const skip = (page - 1) * limit;

      const disputes = await Dispute.find(query)
        .populate('clientId', 'profile email phone')
        .populate('providerId', 'profile email phone')
        .populate('bookingId', 'status totalAmount')
        .populate('paymentId', 'amount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Dispute.countDocuments(query);

      res.json({
        success: true,
        disputes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * GET /api/payments/admin/disputes/:disputeId
 * Get dispute details
 */
router.get(
  "/admin/disputes/:disputeId",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const dispute = await Dispute.findById(req.params.disputeId)
        .populate('clientId', 'profile email phone')
        .populate('providerId', 'profile email phone')
        .populate('bookingId')
        .populate('paymentId');

      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      res.json({ success: true, dispute });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payments/admin/disputes/:disputeId/resolve
 * Admin resolves dispute with decision
 */
router.post(
  "/admin/disputes/:disputeId/resolve",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { decisionType, refundAmount = 0, notes = '' } = req.body;
      // decisionType: 'RELEASE_FULL' | 'REFUND_FULL' | 'REFUND_PARTIAL'

      const dispute = await Dispute.findById(req.params.disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const payment = await Payment.findById(dispute.paymentId);
      const booking = await Booking.findById(dispute.bookingId);

      if (!payment || !booking) {
        return res.status(404).json({ message: "Related payment/booking not found" });
      }

      // Apply admin decision
      if (decisionType === 'RELEASE_FULL') {
        // Release full payment to provider
        const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
        if (wallet) {
          await wallet.releaseEscrow(payment.amount);
          await wallet.addTransaction({
            type: 'DEPOSIT',
            amount: payment.amount,
            description: `Dispute resolved - full payment released`,
            bookingId: booking._id,
            paymentId: payment._id,
            status: 'COMPLETED',
          });
        }

        payment.status = 'RELEASED';
        dispute.adminDecision.type = 'RELEASE_FULL';
        booking.status = 'completed';
        booking.paymentStatus = 'released';

        // Notify both parties
        await createNotificationForUser({
          userId: booking.providerId,
          type: "dispute_resolved_for_provider",
          title: "Dispute Resolved",
          message: "Dispute resolved. Full payment released to your wallet!",
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });

        await createNotificationForUser({
          userId: booking.clientId,
          type: "dispute_resolved_for_client",
          title: "Dispute Resolved",
          message: "Dispute reviewed and resolved. Provider will receive payment.",
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });
      } else if (decisionType === 'REFUND_FULL') {
        // Refund full amount to client (will be simulated as wallet deduction)
        const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
        if (wallet) {
          await wallet.refundPending(payment.amount);
          await wallet.addTransaction({
            type: 'REFUND',
            amount: payment.amount,
            description: `Dispute resolved - full refund to client`,
            bookingId: booking._id,
            paymentId: payment._id,
            status: 'COMPLETED',
          });
        }

        payment.status = 'REFUNDED';
        dispute.adminDecision.type = 'REFUND_FULL';
        dispute.adminDecision.refundAmount = payment.amount;
        booking.status = 'completed';
        booking.paymentStatus = 'refunded';

        await createNotificationForUser({
          userId: booking.clientId,
          type: "dispute_resolved_refund",
          title: "Dispute Resolved",
          message: `Dispute resolved. Full refund of NPR ${payment.amount} will be processed.`,
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });

        await createNotificationForUser({
          userId: booking.providerId,
          type: "dispute_resolved_no_payment",
          title: "Dispute Resolved",
          message: "Dispute resolved. Client will receive full refund.",
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });
      } else if (decisionType === 'REFUND_PARTIAL') {
        // Partial refund to client, partial to provider
        const refundToClient = refundAmount;
        const releaseToProvider = payment.amount - refundAmount;

        const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
        if (wallet) {
          if (releaseToProvider > 0) {
            // Release partial to provider
            await wallet.releaseEscrow(releaseToProvider);
            await wallet.addTransaction({
              type: 'DEPOSIT',
              amount: releaseToProvider,
              description: `Dispute resolved - partial payment released`,
              bookingId: booking._id,
              paymentId: payment._id,
              status: 'COMPLETED',
            });
          }

          if (refundToClient > 0) {
            // Refund partial to client
            await wallet.refundPending(refundToClient);
            await wallet.addTransaction({
              type: 'REFUND',
              amount: refundToClient,
              description: `Dispute resolved - partial refund to client`,
              bookingId: booking._id,
              paymentId: payment._id,
              status: 'COMPLETED',
            });
          }
        }

        payment.status = 'PARTIALLY_REFUNDED';
        dispute.adminDecision.type = 'REFUND_PARTIAL';
        dispute.adminDecision.refundAmount = refundToClient;
        booking.status = 'completed';
        booking.paymentStatus = 'partially_refunded';

        await createNotificationForUser({
          userId: booking.clientId,
          type: "dispute_resolved_partial_refund",
          title: "Dispute Resolved",
          message: `Dispute resolved. Partial refund of NPR ${refundToClient} will be processed.`,
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });

        await createNotificationForUser({
          userId: booking.providerId,
          type: "dispute_resolved_partial_payment",
          title: "Dispute Resolved",
          message: `Dispute resolved. Partial payment of NPR ${releaseToProvider} released.`,
          category: "dispute",
          bookingId: booking._id,
          disputeId: dispute._id,
        });
      }

      // Save updates
      payment.disputeId = dispute._id;
      await payment.save();

      dispute.status = 'resolved';
      dispute.adminDecision.decidedBy = req.user.id;
      dispute.adminDecision.decidedAt = new Date();
      dispute.adminDecision.notes = notes;
      dispute.resolvedAt = new Date();
      dispute.resolvedBy = req.user.id;
      await dispute.save();

      await booking.save();

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        dispute,
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/payments/admin/disputes/:disputeId/provide-response
 * Admin adds internal response/notes
 */
router.post(
  "/admin/disputes/:disputeId/response",
  authGuard,
  roleGuard(["admin"]),
  async (req, res, next) => {
    try {
      const { adminNotes } = req.body;

      const dispute = await Dispute.findByIdAndUpdate(
        req.params.disputeId,
        { adminNotes, status: 'open' },
        { new: true }
      );

      res.json({ success: true, dispute });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
