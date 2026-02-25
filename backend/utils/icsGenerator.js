// utils/icsGenerator.js
// Generates .ics (iCalendar) files for booking appointments
// Compliant with RFC 5545 standard

// Constants
const DEFAULT_BOOKING_DURATION_HOURS = 2;
const REMINDER_BEFORE_MINUTES = 60; // 1 hour before

/**
 * Format date to iCalendar DATETIME format (YYYYMMDDTHHMMSSZ)
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string
 */
function formatICalDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters for iCalendar text fields
 * @param {string} text - Input text
 * @returns {string} - Escaped text
 */
function escapeICalText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate .ics calendar file content for a booking
 * @param {Object} booking - Booking document with populated fields
 * @returns {string} - iCalendar file content
 */
function generateICS(booking) {
  const now = new Date();
  const timestamp = formatICalDate(now);
  
  // Determine start and end times
  let startDate, endDate;
  
  if (booking.scheduledAt) {
    startDate = new Date(booking.scheduledAt);
    // Default duration from constant
    endDate = new Date(startDate.getTime() + DEFAULT_BOOKING_DURATION_HOURS * 60 * 60 * 1000);
  } else if (booking.schedule?.date) {
    startDate = new Date(booking.schedule.date);
    // If time slot exists, parse it
    if (booking.schedule.slot) {
      const [hours, minutes] = booking.schedule.slot.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    endDate = new Date(startDate.getTime() + DEFAULT_BOOKING_DURATION_HOURS * 60 * 60 * 1000);
  } else {
    // Fallback to booking creation time
    startDate = new Date(booking.createdAt);
    endDate = new Date(startDate.getTime() + DEFAULT_BOOKING_DURATION_HOURS * 60 * 60 * 1000);
  }
  
  // Extract details
  const serviceName = booking.serviceId?.title || 'Service';
  const providerName = booking.providerId?.profile?.name || 'Provider';
  const providerPhone = booking.providerId?.phone || '';
  const providerEmail = booking.providerId?.email || '';
  
  // Location
  let location = '';
  if (booking.addressText) {
    location = booking.addressText;
  } else if (booking.address) {
    const addr = booking.address;
    const parts = [
      addr.area,
      addr.city,
      addr.postalCode,
      addr.country
    ].filter(Boolean);
    location = parts.join(', ');
  }
  if (booking.landmark) {
    location += location ? ` (${booking.landmark})` : booking.landmark;
  }
  
  // Description
  const description = [
    `Service: ${serviceName}`,
    `Provider: ${providerName}`,
    providerPhone ? `Phone: ${providerPhone}` : '',
    providerEmail ? `Email: ${providerEmail}` : '',
    booking.notes ? `Notes: ${booking.notes}` : '',
    `Booking ID: ${booking._id}`,
    `Amount: NPR ${booking.totalAmount || booking.price || 0}`
  ].filter(Boolean).join('\\n');
  
  // Generate unique ID
  const uid = `booking-${booking._id}@sewahive.com`;
  
  // Build iCalendar content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SewaHive//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SewaHive Booking',
    'X-WR-TIMEZONE:Asia/Kathmandu',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(`${serviceName} - SewaHive`)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    `LOCATION:${escapeICalText(location)}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    `ORGANIZER;CN=${escapeICalText(providerName)}:mailto:${providerEmail || 'noreply@sewahive.com'}`,
    'BEGIN:VALARM',
    `TRIGGER:-PT${REMINDER_BEFORE_MINUTES}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Your SewaHive booking is in ${REMINDER_BEFORE_MINUTES / 60} hour${REMINDER_BEFORE_MINUTES === 60 ? '' : 's'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Generate filename for .ics file
 * @param {Object} booking - Booking document
 * @returns {string} - Filename
 */
function generateICSFilename(booking) {
  const serviceSlug = (booking.serviceId?.title || 'service')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const bookingDate = booking.scheduledAt || booking.schedule?.date || booking.createdAt;
  const dateStr = new Date(bookingDate).toISOString().split('T')[0];
  
  return `sewahive-${serviceSlug}-${dateStr}.ics`;
}

module.exports = {
  generateICS,
  generateICSFilename,
  formatICalDate,
  escapeICalText,
};
