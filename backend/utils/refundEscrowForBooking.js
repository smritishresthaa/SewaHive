const Payment = require("../models/Payment");
const ProviderWallet = require("../models/ProviderWallet");

async function refundEscrowForBooking(booking, reason = "booking_rejected") {
  // 🛑 Prevent double refund
  if (booking.paymentStatus === "refunded") {
    return 0;
  }

  const heldPayments = await Payment.find({
    bookingId: booking._id,
    status: "FUNDS_HELD",
  });

  if (!heldPayments.length) return 0;

  const totalHeldAmount = heldPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  // 1️⃣ Mark payments as refunded
  for (const payment of heldPayments) {
    payment.status = "REFUNDED";
    payment.refundedAt = new Date();
    payment.refundRequested = false;
    await payment.save();
  }

  // 2️⃣ Reverse provider pending balance (escrow rollback)
  if (totalHeldAmount > 0) {
    const wallet = await ProviderWallet.findOne({
      providerId: booking.providerId,
    });

    if (wallet && wallet.pendingBalance > 0) {
      const refundAmount = Math.min(wallet.pendingBalance, totalHeldAmount);

      wallet.pendingBalance -= refundAmount;
      wallet.totalRefunded += refundAmount;

      wallet.transactions.push({
        type: "REFUND",
        amount: refundAmount,
        description: `Refund due to ${reason}`,
        bookingId: booking._id,
        status: "COMPLETED",
        createdAt: new Date(),
      });

      await wallet.save();
    }
  }

  // 3️⃣ Update booking
  booking.paymentStatus = "refunded";

  // 🔥 VERY IMPORTANT: clear escrow tracking
  booking.pricing = booking.pricing || {};
  booking.pricing.escrowHeldAmount = 0;
  booking.pricing.additionalEscrowRequired = 0;

  await booking.save();

  return totalHeldAmount;
}

module.exports = { refundEscrowForBooking };