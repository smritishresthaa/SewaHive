function parseDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseSlotTime(slot) {
  if (typeof slot !== "string") return null;
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

function resolveScheduledStartAt(booking) {
  if (booking?.scheduledAt) {
    const scheduledAt = new Date(booking.scheduledAt);
    if (!Number.isNaN(scheduledAt.getTime())) return scheduledAt;
  }

  const dateOnly = parseDateOnly(booking?.schedule?.date);
  if (!dateOnly) return null;

  const slotTime = parseSlotTime(booking?.schedule?.slot);
  if (slotTime) {
    dateOnly.setHours(slotTime.hours, slotTime.minutes, 0, 0);
    return dateOnly;
  }

  dateOnly.setHours(23, 59, 59, 999);
  return dateOnly;
}

const DEFAULT_STALE_GRACE_HOURS = Number(process.env.BOOKING_STALE_GRACE_HOURS || 24);

function isActionBlockedByStaleness(booking, now = new Date()) {
  if (!booking || booking.type !== "normal") return false;

  const scheduledStart = resolveScheduledStartAt(booking);
  if (!scheduledStart) return false;

  const staleCutoff = new Date(
    scheduledStart.getTime() + DEFAULT_STALE_GRACE_HOURS * 60 * 60 * 1000
  );

  return now > staleCutoff;
}

function shouldAutoExpireUnstartedBooking(booking, now = new Date()) {
  if (!booking || booking.type !== "normal") return false;

  const activeStatuses = ["accepted", "confirmed", "provider_en_route"];
  if (!activeStatuses.includes(booking.status)) return false;

  return isActionBlockedByStaleness(booking, now);
}

module.exports = {
  DEFAULT_STALE_GRACE_HOURS,
  resolveScheduledStartAt,
  isActionBlockedByStaleness,
  shouldAutoExpireUnstartedBooking,
};
