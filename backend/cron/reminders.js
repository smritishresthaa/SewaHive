// backend/cron/reminders.js
const Booking = require('../models/Booking');
const { sendEmail } = require('../utils/sendEmail');

// Constants for reminder timing
const ONE_HOUR_AHEAD = 1;
const ONE_DAY_AHEAD = 24;
const ONE_HOUR_WINDOW_MINUTES = 15; // ±15 minutes
const ONE_DAY_WINDOW_MINUTES = 30;  // ±30 minutes

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

/**
 * PHASE 2B: Send booking reminder emails
 * Runs hourly, checks for bookings needing 1-hour or 24-hour reminders
 */
async function runReminders(send) {
  const now = new Date();

  // Build windows for 1 hour and 24 hours ahead
  const oneHourWindow = buildWindow(now, ONE_HOUR_AHEAD, ONE_HOUR_WINDOW_MINUTES);
  const oneDayWindow = buildWindow(now, ONE_DAY_AHEAD, ONE_DAY_WINDOW_MINUTES);

  // Find bookings in confirmed/accepted status with upcoming schedule
  const windowStart = oneHourWindow.start < oneDayWindow.start ? oneHourWindow.start : oneDayWindow.start;
  const windowEnd = oneHourWindow.end > oneDayWindow.end ? oneHourWindow.end : oneDayWindow.end;

  const targets = await Booking.find({
    status: { $in: ['confirmed', 'accepted', 'in-progress'] },
    scheduledAt: {
      $gte: windowStart,
      $lte: windowEnd,
    },
  })
    .populate('clientId', 'profile.name email')
    .populate('providerId', 'profile.name email')
    .populate('serviceId', 'title');

  for (const booking of targets) {
    try {
      const scheduledAt = new Date(booking.scheduledAt);
      const hoursUntil = (scheduledAt - now) / (1000 * 60 * 60);

      // 24-hour reminder
      if (hoursUntil >= 23 && hoursUntil <= 25 && !booking.reminders?.oneDaySent) {
        await send24HourReminder(booking);
        await Booking.findByIdAndUpdate(booking._id, {
          'reminders.oneDaySent': true,
        });
        console.log(`✓ Sent 24-hour reminder for booking ${booking._id}`);
      }

      // 1-hour reminder
      if (hoursUntil >= 0.75 && hoursUntil <= 1.25 && !booking.reminders?.oneHourSent) {
        await send1HourReminder(booking);
        await Booking.findByIdAndUpdate(booking._id, {
          'reminders.oneHourSent': true,
        });
        console.log(`✓ Sent 1-hour reminder for booking ${booking._id}`);
      }

      // Legacy callback support (for backward compatibility)
      if (send) {
        await send(booking);
      }
    } catch (err) {
      console.error('[Reminder Error]', {
        bookingId: booking._id,
        scheduledAt: booking.scheduledAt,
        error: err.message,
        stack: err.stack
      });
    }
  }
}

/**
 * Send 24-hour reminder email to client and provider
 */
async function send24HourReminder(booking) {
  const scheduledTime = formatDate(booking.scheduledAt);
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
          <h2 style="color: #2563eb;">📅 Booking Reminder - Tomorrow!</h2>
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
          <h2 style="color: #2563eb;">📅 Booking Reminder - Tomorrow!</h2>
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
  const scheduledTime = formatDate(booking.scheduledAt);
  const serviceName = booking.serviceId?.title || 'Service';
  const providerName = booking.providerId?.profile?.name || 'Provider';
  const clientName = booking.clientId?.profile?.name || 'Client';

  // Email to client
  if (booking.clientId?.email) {
    await sendEmail(
      booking.clientId.email,
      `Reminder: ${serviceName} appointment in 1 hour`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⏰ Booking Reminder - 1 Hour!</h2>
          <p>Hi ${clientName},</p>
          <p>Your booking with <strong>${providerName}</strong> is starting in approximately <strong>1 hour</strong>:</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
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

  // Email to provider
  if (booking.providerId?.email) {
    await sendEmail(
      booking.providerId.email,
      `Reminder: ${serviceName} appointment in 1 hour`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⏰ Booking Reminder - 1 Hour!</h2>
          <p>Hi ${providerName},</p>
          <p>Your appointment is starting in approximately <strong>1 hour</strong>:</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
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
