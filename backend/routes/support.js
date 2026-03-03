// routes/support.js
const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// POST /support/contact
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const ticket = await SupportTicket.create({ name, email, subject, message });

    // Send confirmation email if email service is configured
    try {
      await sendEmail(
        email,
        `We received your message: ${subject}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#059669">SewaHive Support</h2>
          <p>Hi ${name},</p>
          <p>Thank you for reaching out. We have received your message and will respond within 24 hours.</p>
          <br/>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Your message:</strong></p>
          <blockquote style="border-left:3px solid #d1fae5;padding-left:16px;color:#374151">${message}</blockquote>
          <br/>
          <p style="color:#6b7280;font-size:13px">— The SewaHive Team</p>
        </div>`
      );
    } catch (emailErr) {
      // Non-fatal — ticket is already saved
      console.warn('Could not send confirmation email:', emailErr.message);
    }

    res.json({ success: true, message: 'Your message has been received.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
