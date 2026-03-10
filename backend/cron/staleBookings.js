const Booking = require("../models/Booking");
const { createNotification } = require("../utils/createNotification");
const { shouldAutoExpireUnstartedBooking } = require("../utils/bookingStaleness");

async function markAsNoShow(booking) {
  booking.status = "no-show";
  booking.cancelledAt = new Date();
  booking.cancellation = {
    ...(booking.cancellation || {}),
    reason: "Auto-marked as no-show due to stale unstarted booking window",
    cancelledAt: new Date(),
  };

  await booking.save();

  await Promise.allSettled([
    createNotification({
      userId: booking.clientId,
      type: "booking_no_show",
      title: "Booking Marked as No-Show",
      message: "This booking has expired because it was not started in time.",
      category: "booking",
      bookingId: booking._id,
    }),
    createNotification({
      userId: booking.providerId,
      type: "booking_no_show",
      title: "Booking Marked as No-Show",
      message: "This booking has expired because the start window passed.",
      category: "booking",
      bookingId: booking._id,
    }),
  ]);
}

async function runStaleBookingExpiry() {
  const candidates = await Booking.find({
    type: "normal",
    status: { $in: ["accepted", "confirmed", "provider_en_route"] },
    $or: [{ scheduledAt: { $exists: true, $ne: null } }, { "schedule.date": { $exists: true, $ne: null } }],
  }).select("status type scheduledAt schedule cancellation cancelledAt clientId providerId");

  let expiredCount = 0;
  for (const booking of candidates) {
    if (!shouldAutoExpireUnstartedBooking(booking)) continue;
    await markAsNoShow(booking);
    expiredCount += 1;
  }

  if (expiredCount > 0) {
    console.log(`[staleBookings] Auto-expired ${expiredCount} stale bookings as no-show`);
  }
}

module.exports = { runStaleBookingExpiry };
