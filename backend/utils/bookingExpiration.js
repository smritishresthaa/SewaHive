const Booking = require("../models/Booking");
const { createNotification } = require("../utils/createNotification");
const { refundEscrowForBooking } = require("./refundEscrowForBooking");

const PRE_SERVICE_EXPIRABLE_STATUSES = [
  "pending_payment",
  "requested",
  "quote_requested",
  "quote_sent",
  "quote_pending_admin_review",
  "quote_accepted",
  "accepted",
  "confirmed",
];

const NON_EXPIRABLE_STATUSES = [
  "expired",
  "completed",
  "cancelled",
  "rejected",
  "no-show",
  "resolved_refunded",
  "provider_en_route",
  "in-progress",
  "provider_completed",
  "awaiting_client_confirmation",
  "pending-completion",
  "disputed",
];

function combineScheduleDateAndSlot(dateValue, slotValue) {
  if (!dateValue) return null;

  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;

  if (!slotValue || typeof slotValue !== "string") {
    return base;
  }

  const [hoursRaw, minutesRaw] = String(slotValue).split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return base;
  }

  const combined = new Date(base);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

function resolveScheduledDateTime(booking) {
  if (!booking) return null;

  if (booking.scheduledAt) {
    const scheduled = new Date(booking.scheduledAt);
    if (!Number.isNaN(scheduled.getTime())) return scheduled;
  }

  if (booking.schedule?.date) {
    const combined = combineScheduleDateAndSlot(
      booking.schedule.date,
      booking.schedule.slot
    );

    if (combined && !Number.isNaN(combined.getTime())) {
      return combined;
    }
  }

  return null;
}

function isBookingExpiredCandidate(booking, now = new Date()) {
  if (!booking) return false;

  const status = String(booking.status || "").toLowerCase();

  if (status === "expired") return false;
  if (NON_EXPIRABLE_STATUSES.includes(status)) return false;
  if (!PRE_SERVICE_EXPIRABLE_STATUSES.includes(status)) return false;

  const scheduled = resolveScheduledDateTime(booking);
  if (!scheduled) return false;

  return now.getTime() >= scheduled.getTime();
}

async function expireBookingIfNeeded(booking, now = new Date()) {
  if (!booking) {
    return { changed: false, booking };
  }

  if (String(booking.status || "").toLowerCase() === "expired") {
    return { changed: false, booking };
  }

  if (!isBookingExpiredCandidate(booking, now)) {
    return { changed: false, booking };
  }

  booking.status = "expired";
  booking.expiredAt = now;
  booking.updatedAt = now;

  booking.cancellation = booking.cancellation || {};
  booking.cancellation.source = "system";
  booking.cancellation.affectedParty = "both";
  booking.cancellation.reason =
    booking.cancellation.reason ||
    "Booking expired because the scheduled service time passed without completion.";
  booking.cancellation.note =
    booking.cancellation.note ||
    "Automatically marked as expired by the system.";
  booking.cancellation.cancelledAt = booking.cancellation.cancelledAt || now;
  booking.cancellation.refundStatus =
    booking.cancellation.refundStatus || "none";

  let refundedAmount = 0;

  try {
    refundedAmount = await refundEscrowForBooking(
      booking,
      "Booking expired automatically"
    );

    booking.cancellation.refundStatus =
      refundedAmount > 0 ? "refunded" : "not_required";
  } catch (err) {
    booking.cancellation.refundStatus = "failed";
    console.error("[EXPIRY REFUND ERROR]", err.message);
  }

  await booking.save();

  const expiryMessage =
    refundedAmount > 0
      ? `Booking expired. NPR ${refundedAmount} has been refunded automatically.`
      : "Booking expired because the scheduled time passed without completion.";

  try {
    await createNotification({
      userId: booking.clientId,
      type: "booking_expired",
      title: "Booking Expired",
      message: expiryMessage,
      category: "booking",
      bookingId: booking._id,
      sendEmail: false,
    });

    await createNotification({
      userId: booking.providerId,
      type: "booking_expired",
      title: "Booking Expired",
      message: expiryMessage,
      category: "booking",
      bookingId: booking._id,
      sendEmail: false,
    });
  } catch (error) {
    console.error("[BOOKING EXPIRATION] Notification error:", error.message);
  }

  return { changed: true, booking };
}

async function expireBookingsInCollection(bookings = [], now = new Date()) {
  const normalized = [];

  for (const booking of bookings) {
    const result = await expireBookingIfNeeded(booking, now);
    normalized.push(result.booking);
  }

  return normalized;
}

async function expireEligibleBookingsForQuery(query = {}, now = new Date()) {
  const candidates = await Booking.find({
    ...query,
    status: { $in: PRE_SERVICE_EXPIRABLE_STATUSES },
  });

  await expireBookingsInCollection(candidates, now);
}

module.exports = {
  PRE_SERVICE_EXPIRABLE_STATUSES,
  NON_EXPIRABLE_STATUSES,
  combineScheduleDateAndSlot,
  resolveScheduledDateTime,
  isBookingExpiredCandidate,
  expireBookingIfNeeded,
  expireBookingsInCollection,
  expireEligibleBookingsForQuery,
};