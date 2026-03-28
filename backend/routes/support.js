const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();
const SUPPORT_INBOX = process.env.SUPPORT_EMAIL_TO;

function formatTicketRef(ticketId) {
  const suffix = String(ticketId || '').slice(-6).toUpperCase();
  return `SH-${suffix}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// POST /support/contact
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedSubject = String(subject || '').trim();
    const trimmedMessage = String(message || '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const ticket = await SupportTicket.create({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    const ticketRef = formatTicketRef(ticket._id);

    ticket.ticketRef = ticketRef;
    await ticket.save();

    const safeName = escapeHtml(trimmedName);
    const safeEmail = escapeHtml(trimmedEmail);
    const safeSubject = escapeHtml(trimmedSubject);
    const safeMessage = escapeHtml(trimmedMessage);
    const createdAt = new Date(ticket.createdAt).toLocaleString();

    const internalEmailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 20px;color:#0f172a;">New Support Ticket</h2>

        <p style="margin:8px 0;"><strong>Ticket ID:</strong> ${ticket._id}</p>
        <p style="margin:8px 0;"><strong>Reference:</strong> ${ticketRef}</p>
        <p style="margin:8px 0;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin:8px 0;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin:8px 0;"><strong>Subject:</strong> ${safeSubject}</p>

        <div style="margin-top:20px;">
          <p style="margin:0 0 8px;"><strong>Message:</strong></p>
          <blockquote style="margin:0;border-left:4px solid #d1d5db;padding:12px 16px;background:#f9fafb;color:#111827;white-space:pre-wrap;">
            ${safeMessage}
          </blockquote>
        </div>

        <p style="margin-top:20px;color:#6b7280;font-size:13px;">
          Created: ${createdAt}
        </p>
      </div>
    `;

    const confirmationEmailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 20px;color:#059669;">SewaHive Support</h2>

        <p>Hi ${safeName},</p>
        <p>Thank you for reaching out. We have received your message and will respond within 24 hours.</p>

        <p style="margin:16px 0 8px;"><strong>Reference:</strong> ${ticketRef}</p>
        <p style="margin:8px 0;"><strong>Subject:</strong> ${safeSubject}</p>

        <div style="margin-top:20px;">
          <p style="margin:0 0 8px;"><strong>Your message:</strong></p>
          <blockquote style="margin:0;border-left:4px solid #d1fae5;padding:12px 16px;background:#ecfdf5;color:#374151;white-space:pre-wrap;">
            ${safeMessage}
          </blockquote>
        </div>

        <p style="margin-top:24px;color:#6b7280;font-size:13px;">
          — The SewaHive Team
        </p>
      </div>
    `;

    const mailJobs = [];
    const mailMeta = [];

    if (SUPPORT_INBOX && isValidEmail(SUPPORT_INBOX)) {
      mailJobs.push(
        sendEmail(
          SUPPORT_INBOX,
          `[Support Ticket] ${trimmedSubject}`,
          internalEmailHtml
        )
      );
      mailMeta.push('internal');
    } else {
      console.warn(
        'SUPPORT_EMAIL_TO is missing or invalid. Internal support email was skipped.'
      );
    }

    mailJobs.push(
      sendEmail(
        trimmedEmail,
        `We received your message: ${trimmedSubject}`,
        confirmationEmailHtml
      )
    );
    mailMeta.push('confirmation');

    const results = await Promise.allSettled(mailJobs);

    let internalMailSent = false;
    let confirmationMailSent = false;

    results.forEach((result, index) => {
      const type = mailMeta[index];

      if (result.status === 'fulfilled') {
        if (type === 'internal') internalMailSent = true;
        if (type === 'confirmation') confirmationMailSent = true;
      } else {
        console.warn(
          `Support email send warning [${type}]:`,
          result.reason?.message || result.reason
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been received.',
      ticketId: String(ticket._id),
      ticketRef,
      mail: {
        internalMailSent,
        confirmationMailSent,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;