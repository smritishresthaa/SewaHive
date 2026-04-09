const Booking = require("../models/Booking");
const { createNotification } = require("../utils/createNotification");
const { shouldAutoExpireUnstartedBooking } = require("../utils/bookingStaleness");
const { refundEscrowForBooking } = require("../utils/refundEscrowForBooking");
const { recalculateProviderTrust } = require("../utils/trustScoring");

function toAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

async function markAsExpiredRequest(booking) {
  booking.status = "expired";
  booking.cancelledAt = new Date();
  booking.cancellation = {
    ...(booking.cancellation || {}),
    reason: "Auto-expired because provider did not respond before booking time window passed",
    cancelledAt: new Date(),
    cancelledBy: "system",
  };

  await booking.save();

  const refundedAmount = await refundEscrowForBooking(
    booking,
    "booking_request_expired"
  );

  await Promise.allSettled([
    createNotification({
      userId: booking.clientId,
      type: "booking_update",
      title: "Booking Request Expired",
      message:
        refundedAmount > 0
          ? `Your booking request expired because the provider did not respond in time. NPR ${toAmount(
              refundedAmount
            ).toLocaleString()} has been refunded.`
          : "Your booking request expired because the provider did not respond in time.",
      category: "booking",
      bookingId: booking._id,
      metadata: {
        refundAmount: toAmount(refundedAmount),
        expiryType: "request_expired",
      },
    }),

    createNotification({
      userId: booking.providerId,
      type: "booking_update",
      title: "Booking Request Expired",
      message:
        "This booking request expired because it was not accepted before the scheduled time window passed.",
      category: "booking",
      bookingId: booking._id,
      metadata: {
        expiryType: "request_expired",
      },
    }),

    refundedAmount > 0
      ? createNotification({
          userId: booking.clientId,
          type: "payment_refunded",
          title: "Refund Issued",
          message: `NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded because the booking request expired without provider acceptance.`,
          category: "payment",
          bookingId: booking._id,
          metadata: {
            refundedAmount: toAmount(refundedAmount),
            reason: "request_expired",
          },
        })
      : Promise.resolve(null),
  ]);
}

async function markAsNoShow(booking) {
  booking.status = "no-show";
  booking.cancelledAt = new Date();
  booking.cancellation = {
    ...(booking.cancellation || {}),
    reason: "Auto-marked as no-show due to stale unstarted booking window",
    cancelledAt: new Date(),
    cancelledBy: "system",
  };

  await booking.save();

  const refundedAmount = await refundEscrowForBooking(
    booking,
    "provider_no_show_auto_expired"
  );

  await Promise.allSettled([
    createNotification({
      userId: booking.clientId,
      type: "booking_no_show",
      title: "Booking Expired - Provider No Show",
      message:
        refundedAmount > 0
          ? `The provider did not start your booking in time. The booking is now marked as no-show and NPR ${toAmount(
              refundedAmount
            ).toLocaleString()} has been refunded.`
          : "The provider did not start your booking in time. The booking is now marked as no-show.",
      category: "booking",
      bookingId: booking._id,
      metadata: {
        refundedAmount: toAmount(refundedAmount),
        expiryType: "provider_no_show",
      },
    }),

    createNotification({
      userId: booking.providerId,
      type: "booking_no_show",
      title: "Booking Expired - No Show Recorded",
      message:
        refundedAmount > 0
          ? `This booking expired because you did not start it in time. Client refund issued: NPR ${toAmount(
              refundedAmount
            ).toLocaleString()}. Your trust score may decrease.`
          : "This booking expired because you did not start it in time. Your trust score may decrease.",
      category: "booking",
      bookingId: booking._id,
      metadata: {
        refundedAmount: toAmount(refundedAmount),
        expiryType: "provider_no_show",
      },
    }),

    refundedAmount > 0
      ? createNotification({
          userId: booking.clientId,
          type: "payment_refunded",
          title: "Refund Issued",
          message: `NPR ${toAmount(refundedAmount).toLocaleString()} has been refunded because the provider did not arrive/start on time.`,
          category: "payment",
          bookingId: booking._id,
          metadata: {
            refundedAmount: toAmount(refundedAmount),
            reason: "provider_no_show",
          },
        })
      : Promise.resolve(null),
  ]);

  if (booking.providerId) {
    await recalculateProviderTrust(booking.providerId);
  }
}

async function runStaleBookingExpiry() {
  const candidates = await Booking.find({
    status: {
      $in: ["requested", "accepted", "confirmed", "provider_en_route"],
    },
    $or: [
      { scheduledAt: { $exists: true, $ne: null } },
      { "schedule.date": { $exists: true, $ne: null } },
    ],
  }).select(
    "status type scheduledAt schedule cancellation cancelledAt clientId providerId paymentStatus pricing"
  );

  let expiredRequestCount = 0;
  let noShowCount = 0;

  for (const booking of candidates) {
    if (!shouldAutoExpireUnstartedBooking(booking)) continue;

    if (booking.status === "requested") {
      await markAsExpiredRequest(booking);
      expiredRequestCount += 1;
      continue;
    }

    if (["accepted", "confirmed", "provider_en_route"].includes(booking.status)) {
      await markAsNoShow(booking);
      noShowCount += 1;
    }
  }

  if (expiredRequestCount > 0 || noShowCount > 0) {
    console.log(
      `[staleBookings] Auto-expired ${expiredRequestCount} requested bookings and marked ${noShowCount} committed bookings as no-show`
    );
  }
}

module.exports = {
  runStaleBookingExpiry,
  markAsNoShow,
  markAsExpiredRequest,
};