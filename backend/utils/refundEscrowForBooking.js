// const Payment = require("../models/Payment");
// const ProviderWallet = require("../models/ProviderWallet");

// async function refundEscrowForBooking(booking, reason = "booking_rejected") {
//   // 🛑 Prevent double refund
//   if (booking.paymentStatus === "refunded") {
//     return 0;
//   }

//   const heldPayments = await Payment.find({
//     bookingId: booking._id,
//     status: "FUNDS_HELD",
//   });

//   if (!heldPayments.length) return 0;

//   const totalHeldAmount = heldPayments.reduce(
//     (sum, p) => sum + Number(p.amount || 0),
//     0
//   );

//   // 1️⃣ Mark payments as refunded
//   for (const payment of heldPayments) {
//     payment.status = "REFUNDED";
//     payment.refundedAt = new Date();
//     payment.refundRequested = false;
//     await payment.save();
//   }

//   // 2️⃣ Reverse provider pending balance (escrow rollback)
//   if (totalHeldAmount > 0) {
//     const wallet = await ProviderWallet.findOne({
//       providerId: booking.providerId,
//     });

//     if (wallet && wallet.pendingBalance > 0) {
//       const refundAmount = Math.min(wallet.pendingBalance, totalHeldAmount);

//       wallet.pendingBalance -= refundAmount;
//       wallet.totalRefunded += refundAmount;

//       wallet.transactions.push({
//         type: "REFUND",
//         amount: refundAmount,
//         description: `Refund due to ${reason}`,
//         bookingId: booking._id,
//         status: "COMPLETED",
//         createdAt: new Date(),
//       });

//       await wallet.save();
//     }
//   }

//   // 3️⃣ Update booking
//   booking.paymentStatus = "refunded";

//   // 🔥 VERY IMPORTANT: clear escrow tracking
//   booking.pricing = booking.pricing || {};
//   booking.pricing.escrowHeldAmount = 0;
//   booking.pricing.additionalEscrowRequired = 0;

//   await booking.save();

//   return totalHeldAmount;
// }

// module.exports = { refundEscrowForBooking };

const Payment = require("../models/Payment");
const ProviderWallet = require("../models/ProviderWallet");

function toAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

async function refundEscrowForBooking(booking, reason = "booking_rejected") {
  if (!booking) return 0;

  const refundableStatuses = ["FUNDS_HELD", "DISPUTED"];
  const payments = await Payment.find({
    bookingId: booking._id,
    status: { $in: refundableStatuses },
  }).sort({ createdAt: 1 });

  if (!payments.length) {
    booking.paymentStatus = booking.paymentStatus || "pending";
    booking.pricing = booking.pricing || {};
    booking.pricing.escrowHeldAmount = 0;
    booking.pricing.additionalEscrowRequired = 0;
    await booking.save();
    return 0;
  }

  const totalRefundAmount = payments.reduce(
    (sum, payment) => sum + toAmount(payment.amount),
    0
  );

  for (const payment of payments) {
    payment.status = "REFUNDED";
    payment.refundedAt = new Date();
    payment.refundRequested = false;
    payment.providerEarnings = 0;
    payment.disputeReason = reason;
    payment.receipt = {
      ...(payment.receipt || {}),
      refund: {
        ...(payment.receipt?.refund || {}),
        reason,
        refundedAt: new Date(),
        amount: toAmount(payment.amount),
      },
    };
    await payment.save();
  }

  if (booking.providerId && totalRefundAmount > 0) {
    let wallet = await ProviderWallet.findOne({ providerId: booking.providerId });
    if (!wallet) {
      wallet = await ProviderWallet.create({
        providerId: booking.providerId,
        totalEarned: 0,
        pendingBalance: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        totalRefunded: 0,
        transactions: [],
      });
    }

    const deductiblePending = Math.min(
      toAmount(wallet.pendingBalance),
      totalRefundAmount
    );

    wallet.pendingBalance = toAmount(wallet.pendingBalance - deductiblePending);
    wallet.totalRefunded = toAmount(wallet.totalRefunded + totalRefundAmount);
    wallet.transactions.push({
      type: "REFUND",
      amount: totalRefundAmount,
      description: `Refund due to ${reason}`,
      bookingId: booking._id,
      paymentId: payments[0]?._id,
      status: "COMPLETED",
      createdAt: new Date(),
    });
    await wallet.save();
  }

  booking.paymentStatus = "refunded";
  booking.pricing = booking.pricing || {};
  booking.pricing.escrowHeldAmount = 0;
  booking.pricing.additionalEscrowRequired = 0;
  booking.pricing.paymentAuditTrail = booking.pricing.paymentAuditTrail || [];
  booking.pricing.paymentAuditTrail.push({
    event: "escrow_adjusted",
    amount: totalRefundAmount,
    finalPayment: 0,
    approvedAdjustmentsTotal: toAmount(
      booking.pricing?.approvedAdjustmentsTotal || 0
    ),
    approvedExtraTimeCost: toAmount(
      booking.pricing?.approvedExtraTimeCost || 0
    ),
    actorId: booking.providerId || booking.clientId,
    at: new Date(),
    note: `Escrow refunded. Reason: ${reason}`,
  });

  await booking.save();
  return totalRefundAmount;
}

module.exports = { refundEscrowForBooking };
