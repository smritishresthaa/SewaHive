// backend/cron/reminders.js
const Booking = require('../models/Booking');
const sendEmail = require('../utils/sendEmail');
const { createNotification } = require('../utils/createNotification');

// Constants for reminder timing
const ONE_HOUR_AHEAD = 1;
const ONE_DAY_AHEAD = 24;
const ONE_HOUR_WINDOW_MINUTES = 5; // 55–65 minutes before booking
const ONE_DAY_WINDOW_MINUTES = 30; // 23.5–24.5 hours before booking

/**
 * Build time window around target time
 * @param {Date} now - Current time
 * @param {number} hoursAhead - How many hours ahead to target
 * @param {number} minutesWindow - Window size in minutes (±)
 */
function buildWindow(now, hoursAhead, minutesWindow = 15) {
  const target = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const start = new Date(target.getTime() - minutesWindow * 60 * 1000);
  const end = new Date(target.getTime() + minutesWindow * 60 * 1000);
  return { start, end };
}

/**
 * Format date for email display
 */
function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveBookingStartTime(booking) {
  if (booking?.scheduledAt) {
    const scheduled = new Date(booking.scheduledAt);
    if (!Number.isNaN(scheduled.getTime())) {
      return scheduled;
    }
  }

  const bookingDate = booking?.schedule?.date;
  const bookingSlot = booking?.schedule?.slot;

  if (!bookingDate || !bookingSlot) return null;

  const baseDate = new Date(bookingDate);
  if (Number.isNaN(baseDate.getTime())) return null;

  const [hoursRaw, minutesRaw] = String(bookingSlot).split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  baseDate.setHours(hours, minutes, 0, 0);
  return baseDate;
}

/**
 * PHASE 2B: Send booking reminder emails
 * Runs hourly, checks for bookings needing 1-hour or 24-hour reminders
 */
async function runReminders(send) {
  const now = new Date();

  const targets = await Booking.find({
    status: { $in: ['confirmed', 'accepted', 'provider_en_route', 'in-progress'] },
    $or: [
      { 'reminders.oneHourSent': { $ne: true } },
      { 'reminders.oneDaySent': { $ne: true } },
    ],
  })
    .populate('clientId', 'profile.name email')
    .populate('providerId', 'profile.name email')
    .populate('serviceId', 'title');

  for (const booking of targets) {
    try {
      const scheduledAt = resolveBookingStartTime(booking);

      if (!scheduledAt) {
        console.log(`[REMINDER] Skipped booking ${booking._id}: missing schedule time`);
        continue;
      }

      const minutesUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60);

      if (
        minutesUntil >= 55 &&
        minutesUntil <= 65 &&
        !booking.reminders?.oneHourSent
      ) {
        await send1HourReminder(booking);

        await Booking.findByIdAndUpdate(booking._id, {
          'reminders.oneHourSent': true,
          'reminders.oneHourSentAt': new Date(),
        });

        console.log(`✓ Sent 1-hour reminder for booking ${booking._id}`);
      }

      if (
        minutesUntil >= 1410 &&
        minutesUntil <= 1470 &&
        !booking.reminders?.oneDaySent
      ) {
        await send24HourReminder(booking);

        await Booking.findByIdAndUpdate(booking._id, {
          'reminders.oneDaySent': true,
          'reminders.oneDaySentAt': new Date(),
        });

        console.log(`✓ Sent 24-hour reminder for booking ${booking._id}`);
      }

      if (send) {
        await send(booking);
      }
    } catch (err) {
      console.error('[Reminder Error]', {
        bookingId: booking._id,
        scheduledAt: reminderStartTime,
        schedule: booking.schedule,
        error: err.message,
        stack: err.stack,
      });
    }
  }
}

/**
 * Send 24-hour reminder email to client and provider
 */
async function send24HourReminder(booking) {
  const scheduledTime = formatDate(resolveBookingStartTime(booking) || booking.scheduledAt);
  const serviceName = booking.serviceId?.title || 'Service';
  const providerName = booking.providerId?.profile?.name || 'Provider';
  const clientName = booking.clientId?.profile?.name || 'Client';

  // Email to client
  if (booking.clientId?.email) {
    await sendEmail(
      booking.clientId.email,
      `Reminder: ${serviceName} appointment tomorrow`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Reminder - ${formatDate(resolveBookingStartTime(booking) || booking.scheduledAt)}</h2>
          <p>Hi ${clientName},</p>
          <p>This is a friendly reminder that your booking with <strong>${providerName}</strong> is scheduled for tomorrow:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0;"><strong>Provider:</strong> ${providerName}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>
            ${booking.addressText ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.addressText}</p>` : ''}
          </div>
          <p>Please ensure you're available at the scheduled time.</p>
          <p style="color: #6b7280; font-size: 14px;">— SewaHive Team</p>
        </div>
      `
    );
  }

  // Email to provider
  if (booking.providerId?.email) {
    await sendEmail(
      booking.providerId.email,
      `Reminder: ${serviceName} appointment tomorrow`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Booking Reminder - ${scheduledTime}</h2>
          <p>Hi ${providerName},</p>
          <p>This is a reminder that you have an upcoming appointment tomorrow:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>
            ${booking.addressText ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.addressText}</p>` : ''}
          </div>
          <p>Please be prepared and arrive on time.</p>
          <p style="color: #6b7280; font-size: 14px;">— SewaHive Team</p>
        </div>
      `
    );
  }
}

/**
 * Send 1-hour reminder email to client and provider
 */
async function send1HourReminder(booking) {
  const reminderStartTime = resolveBookingStartTime(booking) || booking.scheduledAt;
  const scheduledTime = formatDate(reminderStartTime);
  const serviceName = booking.serviceId?.title || 'Service';
  const providerName = booking.providerId?.profile?.name || 'Provider';
  const clientName = booking.clientId?.profile?.name || 'Client';

  if (booking.clientId?._id) {
    await createNotification({
      userId: booking.clientId._id,
      type: 'booking_reminder',
      category: 'booking',
      title: 'Booking reminder',
      message: `Your ${serviceName} booking starts in 1 hour.`,
      bookingId: booking._id,
      metadata: {
        reminderKind: 'one_hour',
        scheduledAt: reminderStartTime,
      },
      targetRoute: '/client/bookings/history',
      targetRouteParams: { bookingId: booking._id },
      sendEmail: false,
      sendSMS: false,
    });
  }

  if (booking.providerId?._id) {
    await createNotification({
      userId: booking.providerId._id,
      type: 'booking_reminder',
      category: 'booking',
      title: 'Booking reminder',
      message: `You have a ${serviceName} booking starting in 1 hour.`,
      bookingId: booking._id,
      metadata: {
        reminderKind: 'one_hour',
        scheduledAt: reminderStartTime,
      },
      targetRoute: '/provider/bookings',
      targetRouteParams: { bookingId: booking._id },
      sendEmail: false,
      sendSMS: false,
    });
  }

  if (booking.clientId?.email) {
    await sendEmail(
      booking.clientId.email,
      `Reminder: ${serviceName} appointment in 1 hour`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Booking Reminder - ${formatDate(resolveBookingStartTime(booking) || booking.scheduledAt)}</h2>
          <p>Hi ${clientName},</p>
          <p>Your booking with <strong>${providerName}</strong> is starting in approximately <strong>1 hour</strong>:</p>
          <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
            <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0;"><strong>Provider:</strong> ${providerName}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>
            ${booking.addressText ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.addressText}</p>` : ''}
          </div>
          <p>Please be ready and available at your location.</p>
          <p style="color: #6b7280; font-size: 14px;">— SewaHive Team</p>
        </div>
      `
    );
  }

  if (booking.providerId?.email) {
    await sendEmail(
      booking.providerId.email,
      `Reminder: ${serviceName} appointment in 1 hour`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Booking Reminder - ${formatDate(resolveBookingStartTime(booking) || booking.scheduledAt)}</h2>
          <p>Hi ${providerName},</p>
          <p>Your appointment is starting in approximately <strong>1 hour</strong>:</p>
          <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
            <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${scheduledTime}</p>
            ${booking.addressText ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.addressText}</p>` : ''}
          </div>
          <p>Please ensure you arrive on time with all necessary equipment.</p>
          <p style="color: #6b7280; font-size: 14px;">— SewaHive Team</p>
        </div>
      `
    );
  }
}

module.exports = { runReminders };
