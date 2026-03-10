// routes/support.js
const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();
const SUPPORT_INBOX = process.env.SUPPORT_EMAIL_TO || 'support@sewahive.com';

function formatTicketRef(ticketId) {
  const suffix = String(ticketId || '').slice(-6).toUpperCase();
  return `SH-${suffix}`;
}

// POST /support/contact
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const ticket = await SupportTicket.create({ name, email, subject, message });
    const ticketRef = formatTicketRef(ticket._id);

    // Send internal + confirmation emails (non-fatal if mail fails)
    await Promise.allSettled([
      sendEmail(
        SUPPORT_INBOX,
        `[Support Ticket] ${subject}`,
        `<div style="font-family:sans-serif;max-width:700px;margin:0 auto">
          <h2 style="color:#0f172a">New Support Ticket</h2>
          <p><strong>Ticket ID:</strong> ${ticket._id}</p>
          <p><strong>Reference:</strong> ${ticketRef}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #d1d5db;padding-left:16px;color:#111827">${message}</blockquote>
          <p style="color:#6b7280;font-size:13px">Created: ${new Date(ticket.createdAt).toLocaleString()}</p>
        </div>`
      ),
      sendEmail(
        email,
        `We received your message: ${subject}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#059669">SewaHive Support</h2>
          <p>Hi ${name},</p>
          <p>Thank you for reaching out. We have received your message and will respond within 24 hours.</p>
          <p><strong>Reference:</strong> ${ticketRef}</p>
          <br/>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Your message:</strong></p>
          <blockquote style="border-left:3px solid #d1fae5;padding-left:16px;color:#374151">${message}</blockquote>
          <br/>
          <p style="color:#6b7280;font-size:13px">— The SewaHive Team</p>
        </div>`
      ),
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Support email send warning:', result.reason?.message || result.reason);
        }
      });
    });

    res.json({ success: true, message: 'Your message has been received.', ticketId: String(ticket._id), ticketRef });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
