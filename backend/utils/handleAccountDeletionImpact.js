const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const ProviderWallet = require("../models/ProviderWallet");
const Service = require("../models/Service");
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

const BLOCKING_REVIEW_STATUSES = [
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

function isUpcomingOrActive(dateValue) {
  if (!dateValue) return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  return date >= new Date();
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

async function disableProviderServices(user, adminUserId) {
  if (String(user?.role || "").toLowerCase() !== "provider") {
    return { disabledServicesCount: 0 };
  }

  const result = await Service.updateMany(
    { providerId: user._id, $or: [{ isActive: true }, { adminDisabled: { $ne: true } }] },
    {
      $set: {
        isActive: false,
        adminDisabled: true,
        adminDisabledReason: "Provider account deleted by admin",
        adminDisabledAt: new Date(),
        adminDisabledBy: adminUserId,
      },
    }
  );

  return {
    disabledServicesCount:
      Number(result.modifiedCount || result.nModified || result.matchedCount || 0) || 0,
  };
}

async function cancelBookingForDeletedAccount({ booking, deletedUser, adminUserId, now }) {
  const deletedRole = String(deletedUser?.role || "").toLowerCase();
  const otherPartyId = deletedRole === "provider" ? booking.clientId : booking.providerId;
  const accountLabel = deletedRole === "provider" ? "provider" : "client";

  const cancellationReason =
    deletedRole === "provider"
      ? "Booking cancelled because the provider account was deleted by admin."
      : "Booking cancelled because the client account was deleted by admin.";

  const refundReason =
    deletedRole === "provider"
      ? "Refund processed because the provider account was deleted by admin before service delivery."
      : "Refund processed because the client account was deleted by admin before service delivery.";

  const refundResult = await refundHeldPaymentsForBooking(booking, refundReason);

  booking.status = "cancelled";
  booking.cancelledAt = now;
  booking.cancellation = {
    cancelledBy: adminUserId,
    adminActionBy: adminUserId,
    source: "admin",
    affectedParty: accountLabel,
    reason: cancellationReason,
    note: `Auto-cancelled because the ${accountLabel} account was deleted by admin.`,
    cancelledAt: now,
    refundAmount: refundResult.refundedAmount,
    refundStatus: refundResult.refundedAmount > 0 ? "processed" : "not_required",
  };

  if (refundResult.refundedAmount > 0) {
    booking.paymentStatus = "refunded";
  }

  if (booking.pricing) {
    booking.pricing.escrowHeldAmount = Math.max(
      0,
      Number(booking.pricing?.escrowHeldAmount || 0) - refundResult.refundedAmount
    );
    booking.pricing.additionalEscrowRequired = 0;
  }

  await booking.save();

  await createNotification({
    userId: otherPartyId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message:
      refundResult.refundedAmount > 0
        ? `${cancellationReason} Any held escrow for this booking has been marked for refund.`
        : cancellationReason,
    category: "booking",
    bookingId: booking._id,
    fromUserId: adminUserId,
    metadata: {
      autoCancelledByAdmin: true,
      deletedRole,
      deletedUserId: String(deletedUser._id),
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
        deletedRole,
        refundAmount: refundResult.refundedAmount,
      },
      sendEmail: true,
    });
  }

  return {
    bookingId: String(booking._id),
    status: booking.status,
    scheduledAt: getRelevantBookingDate(booking),
    refundAmount: refundResult.refundedAmount,
    paymentStatus: booking.paymentStatus,
  };
}

async function handleAccountDeletionImpact({ user, adminUserId }) {
  if (!user?._id) {
    return {
      autoCancelled: [],
      blockingBookings: [],
      disabledServicesCount: 0,
      summary: {
        scanned: 0,
        autoCancelledCount: 0,
        blockingReviewCount: 0,
        disabledServicesCount: 0,
        totalRefundAmount: 0,
      },
    };
  }

  const now = new Date();
  const role = String(user.role || "").toLowerCase();
  const relationKey = role === "provider" ? "providerId" : "clientId";

  const candidateStatuses = [...AUTO_CANCEL_STATUSES, ...BLOCKING_REVIEW_STATUSES];
  const candidates = ["provider", "client"].includes(role)
    ? await Booking.find({
        [relationKey]: user._id,
        status: { $in: candidateStatuses },
      })
    : [];

  const autoCancelled = [];
  const blockingBookings = [];

  for (const booking of candidates) {
    if (!isUpcomingOrActive(getRelevantBookingDate(booking))) {
      continue;
    }

    if (AUTO_CANCEL_STATUSES.includes(booking.status)) {
      const result = await cancelBookingForDeletedAccount({
        booking,
        deletedUser: user,
        adminUserId,
        now,
      });
      autoCancelled.push(result);
      continue;
    }

    if (BLOCKING_REVIEW_STATUSES.includes(booking.status)) {
      blockingBookings.push({
        bookingId: String(booking._id),
        status: booking.status,
        scheduledAt: getRelevantBookingDate(booking),
      });
    }
  }

  const { disabledServicesCount } = await disableProviderServices(user, adminUserId);

  return {
    autoCancelled,
    blockingBookings,
    disabledServicesCount,
    summary: {
      scanned: candidates.length,
      autoCancelledCount: autoCancelled.length,
      blockingReviewCount: blockingBookings.length,
      disabledServicesCount,
      totalRefundAmount: Number(
        autoCancelled.reduce((sum, entry) => sum + Number(entry.refundAmount || 0), 0).toFixed(2)
      ),
    },
  };
}

module.exports = {
  handleAccountDeletionImpact,
};
