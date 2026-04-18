const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const ProviderWallet = require("../models/ProviderWallet");
const { createNotification } = require("./createNotification");

const AUTO_CANCEL_STATUSES = [
  "pending_payment",
  "requested",
  "quote_requested",
  "quote_sent",
  "quote_pending_admin_review",
  "quote_accepted",
  "accepted",
  "confirmed",
];

const MANUAL_REVIEW_STATUSES = [
  "provider_en_route",
  "in-progress",
  "provider_completed",
  "awaiting_client_confirmation",
  "pending-completion",
  "disputed",
];

function getRelevantBookingDate(booking) {
  return (
    booking?.scheduledAt ||
    booking?.schedule?.date ||
    booking?.requestedAt ||
    booking?.createdAt ||
    null
  );
}

function isDateWithinSuspension(dateValue, startsAt, endsAt, permanent = false) {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) return false;

  const start = startsAt ? new Date(startsAt) : new Date();
  if (Number.isNaN(start.getTime())) return false;

  if (date < start) return false;
  if (permanent || !endsAt) return true;

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return true;
  return date <= end;
}

async function refundHeldPaymentsForBooking(booking, reason) {
  const heldPayments = await Payment.find({
    bookingId: booking._id,
    status: "FUNDS_HELD",
  });

  if (!heldPayments.length) {
    return { refundedAmount: 0, refundedPaymentIds: [] };
  }

  const wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
  let refundedAmount = 0;
  const refundedPaymentIds = [];

  for (const payment of heldPayments) {
    const amount = Number(payment.amount || 0);

    if (wallet && amount > 0) {
      const currentPending = Number(wallet.pendingBalance || 0);
      wallet.pendingBalance = Number(Math.max(0, currentPending - amount).toFixed(2));
      wallet.totalRefunded = Number((Number(wallet.totalRefunded || 0) + amount).toFixed(2));
      wallet.transactions.push({
        type: "REFUND",
        amount,
        description: reason,
        bookingId: booking._id,
        paymentId: payment._id,
        status: "COMPLETED",
      });
    }

    payment.status = "REFUNDED";
    payment.refundedAt = new Date();
    payment.refundRequested = false;
    payment.disputeReason = reason;
    await payment.save();

    refundedAmount += amount;
    refundedPaymentIds.push(String(payment._id));
  }

  if (wallet) {
    await wallet.save();
  }

  return {
    refundedAmount: Number(refundedAmount.toFixed(2)),
    refundedPaymentIds,
  };
}

async function processSingleBookingCancellation({ booking, suspendedUser, adminUserId, now, permanent, endsAt }) {
  const suspendedRole = String(suspendedUser?.role || "").toLowerCase();
  const suspendedDisplayName = suspendedUser?.profile?.name || suspendedUser?.email || "The account holder";
  const otherPartyId =
    suspendedRole === "provider" ? booking.clientId : booking.providerId;

  const autoCancelReason =
    suspendedRole === "provider"
      ? "Booking cancelled because the provider account was suspended by admin."
      : "Booking cancelled because the client account was suspended by admin.";

  const refundReason =
    suspendedRole === "provider"
      ? "Refund processed because the provider account was suspended before the scheduled service."
      : "Refund processed because the client account was suspended before the scheduled service.";

  const refundResult = await refundHeldPaymentsForBooking(booking, refundReason);

  booking.status = "cancelled";
  booking.cancelledAt = now;
  booking.cancellation = {
    cancelledBy: adminUserId,
    adminActionBy: adminUserId,
    source: "admin",
    affectedParty: suspendedRole === "provider" ? "provider" : "client",
    reason: autoCancelReason,
    note: permanent
      ? `Auto-cancelled after admin permanently suspended ${suspendedDisplayName}.`
      : `Auto-cancelled because ${suspendedDisplayName} is suspended until ${endsAt ? new Date(endsAt).toLocaleString() : "further notice"}.`,
    cancelledAt: now,
    refundAmount: refundResult.refundedAmount,
    refundStatus: refundResult.refundedAmount > 0 ? "processed" : "not_required",
  };

  booking.paymentStatus = refundResult.refundedAmount > 0 ? "refunded" : booking.paymentStatus;

  if (booking.pricing) {
    booking.pricing.escrowHeldAmount = Math.max(
      0,
      Number(booking.pricing?.escrowHeldAmount || 0) - refundResult.refundedAmount
    );
    booking.pricing.additionalEscrowRequired = 0;
  }

  await booking.save();

  const otherPartyMessage =
    suspendedRole === "provider"
      ? "Your upcoming booking was cancelled because the provider account has been suspended by admin."
      : "Your upcoming booking was cancelled because the client account has been suspended by admin.";

  const suspendedPartyMessage =
    suspendedRole === "provider"
      ? "An upcoming booking was cancelled because your provider account is suspended."
      : "An upcoming booking was cancelled because your client account is suspended.";

  await createNotification({
    userId: otherPartyId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message:
      refundResult.refundedAmount > 0
        ? `${otherPartyMessage} Any held escrow for this booking has been marked for refund.`
        : otherPartyMessage,
    category: "booking",
    bookingId: booking._id,
    fromUserId: adminUserId,
    metadata: {
      autoCancelledByAdmin: true,
      suspendedRole,
      suspendedUserId: String(suspendedUser._id),
      refundAmount: refundResult.refundedAmount,
    },
    sendEmail: true,
  });

  await createNotification({
    userId: suspendedUser._id,
    type: "booking_cancelled",
    title: "Booking Cancelled During Suspension",
    message:
      refundResult.refundedAmount > 0
        ? `${suspendedPartyMessage} Held escrow for the booking has been marked for refund to the client.`
        : suspendedPartyMessage,
    category: "booking",
    bookingId: booking._id,
    fromUserId: adminUserId,
    metadata: {
      autoCancelledByAdmin: true,
      suspendedRole,
      refundAmount: refundResult.refundedAmount,
    },
    sendEmail: true,
  });

  if (refundResult.refundedAmount > 0) {
    await createNotification({
      userId: booking.clientId,
      type: "payment_refunded",
      title: "Escrow Refund Marked",
      message: `Your held payment of NPR ${refundResult.refundedAmount} for the affected booking has been marked for refund.`,
      category: "payment",
      bookingId: booking._id,
      fromUserId: adminUserId,
      metadata: {
        autoCancelledByAdmin: true,
        suspendedRole,
        refundAmount: refundResult.refundedAmount,
      },
      sendEmail: true,
    });
  }

  return {
    bookingId: String(booking._id),
    status: booking.status,
    scheduledAt: booking.scheduledAt || booking?.schedule?.date || booking.requestedAt || booking.createdAt,
    refundAmount: refundResult.refundedAmount,
    paymentStatus: booking.paymentStatus,
  };
}

async function handleSuspensionBookingImpact({ suspendedUser, adminUserId, startsAt, endsAt = null, permanent = false }) {
  if (!suspendedUser?._id) {
    return {
      autoCancelled: [],
      manualReview: [],
      summary: {
        scanned: 0,
        autoCancelledCount: 0,
        manualReviewCount: 0,
        totalRefundAmount: 0,
      },
    };
  }

  const role = String(suspendedUser.role || "").toLowerCase();
  const relationKey = role === "provider" ? "providerId" : "clientId";

  const candidateStatuses = [...AUTO_CANCEL_STATUSES, ...MANUAL_REVIEW_STATUSES];
  const candidates = await Booking.find({
    [relationKey]: suspendedUser._id,
    status: { $in: candidateStatuses },
  });

  const now = new Date();
  const autoCancelled = [];
  const manualReview = [];

  for (const booking of candidates) {
    const relevantDate = getRelevantBookingDate(booking);
    const overlapsSuspension = isDateWithinSuspension(relevantDate, startsAt, endsAt, permanent);
    if (!overlapsSuspension) continue;

    if (AUTO_CANCEL_STATUSES.includes(booking.status)) {
      const result = await processSingleBookingCancellation({
        booking,
        suspendedUser,
        adminUserId,
        now,
        permanent,
        endsAt,
      });
      autoCancelled.push(result);
    } else {
      manualReview.push({
        bookingId: String(booking._id),
        status: booking.status,
        scheduledAt: booking.scheduledAt || booking?.schedule?.date || booking.requestedAt || booking.createdAt,
      });
    }
  }

  return {
    autoCancelled,
    manualReview,
    summary: {
      scanned: candidates.length,
      autoCancelledCount: autoCancelled.length,
      manualReviewCount: manualReview.length,
      totalRefundAmount: Number(
        autoCancelled.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0).toFixed(2)
      ),
    },
  };
}

module.exports = {
  handleSuspensionBookingImpact,
};
