const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const sendEmail = require('../utils/sendEmail');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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

router.use(authenticate, requireAdmin);

// GET /admin/support
router.get('/', async (req, res, next) => {
  try {
    const { status = 'all', search = '' } = req.query;

    const filter = {};

    if (status !== 'all') {
      filter.status = status;
    }

    if (search.trim()) {
      const query = search.trim();
      filter.$or = [
        { ticketRef: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { subject: { $regex: query, $options: 'i' } },
        { message: { $regex: query, $options: 'i' } },
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const [totalTickets, openCount, inProgressCount, resolvedCount, closedCount] =
      await Promise.all([
        SupportTicket.countDocuments(),
        SupportTicket.countDocuments({ status: 'open' }),
        SupportTicket.countDocuments({ status: 'in_progress' }),
        SupportTicket.countDocuments({ status: 'resolved' }),
        SupportTicket.countDocuments({ status: 'closed' }),
      ]);

    res.json({
      success: true,
      tickets,
      stats: {
        totalTickets,
        openCount,
        inProgressCount,
        resolvedCount,
        closedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/support/:ticketId
router.get('/:ticketId', async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate('responses.sentByAdminId', 'profile.name email')
      .populate('assignedTo', 'profile.name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/support/:ticketId/status
router.patch('/:ticketId/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket status.',
      });
    }

    const update = {
      status,
    };

    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }

    if (status === 'closed') {
      update.closedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      update,
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    res.json({
      success: true,
      message: 'Ticket status updated successfully.',
      ticket,
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/support/:ticketId/reply
router.post('/:ticketId/reply', async (req, res, next) => {
  try {
    const replyMessage = String(req.body.message || '').trim();

    if (!replyMessage) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required.',
      });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    let emailSent = false;

    const safeName = escapeHtml(ticket.name);
    const safeSubject = escapeHtml(ticket.subject);
    const safeReply = escapeHtml(replyMessage);
    const safeTicketRef = escapeHtml(ticket.ticketRef || '');
    const safeOriginalMessage = escapeHtml(ticket.message);

    if (ticket.email && isValidEmail(ticket.email)) {
      const replyEmailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111827;">
          <h2 style="margin:0 0 20px;color:#059669;">SewaHive Support Response</h2>

          <p>Hi ${safeName},</p>
          <p>Our support team has replied to your request.</p>

          <p style="margin:16px 0 8px;"><strong>Reference:</strong> ${safeTicketRef}</p>
          <p style="margin:8px 0;"><strong>Subject:</strong> ${safeSubject}</p>

          <div style="margin-top:18px;">
            <p style="margin:0 0 8px;"><strong>Our response:</strong></p>
            <blockquote style="margin:0;border-left:4px solid #d1fae5;padding:12px 16px;background:#ecfdf5;color:#374151;white-space:pre-wrap;">
              ${safeReply}
            </blockquote>
          </div>

          <div style="margin-top:18px;">
            <p style="margin:0 0 8px;"><strong>Your original message:</strong></p>
            <blockquote style="margin:0;border-left:4px solid #e5e7eb;padding:12px 16px;background:#f9fafb;color:#374151;white-space:pre-wrap;">
              ${safeOriginalMessage}
            </blockquote>
          </div>

          <p style="margin-top:24px;color:#6b7280;font-size:13px;">
            — The SewaHive Team
          </p>
        </div>
      `;

      try {
        await sendEmail(
          ticket.email,
          `Support Response: ${ticket.subject}`,
          replyEmailHtml
        );
        emailSent = true;
      } catch (error) {
        console.warn(
          'Support reply email failed:',
          error?.message || error
        );
      }
    }

    ticket.responses.push({
      sender: 'admin',
      message: replyMessage,
      sentAt: new Date(),
      sentByAdminId: req.user.id,
      emailSent,
    });

    ticket.lastReplyAt = new Date();
    ticket.lastReplyBy = 'admin';

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('responses.sentByAdminId', 'profile.name email')
      .populate('assignedTo', 'profile.name email');

    res.json({
      success: true,
      message: 'Reply sent successfully.',
      ticket: populatedTicket,
      mail: {
        emailSent,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;