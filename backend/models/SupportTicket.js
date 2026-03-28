const { Schema, model, Types } = require('mongoose');

const SupportResponseSchema = new Schema(
  {
    sender: {
      type: String,
      enum: ['admin', 'user', 'system'],
      default: 'admin',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    sentByAdminId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const SupportTicketSchema = new Schema(
  {
    ticketRef: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    sourcePanel: {
      type: String,
      enum: ['client', 'provider', 'unknown'],
      default: 'unknown',
    },
    responses: {
      type: [SupportResponseSchema],
      default: [],
    },
    lastReplyAt: {
      type: Date,
      default: null,
    },
    lastReplyBy: {
      type: String,
      enum: ['admin', 'user', 'system', null],
      default: null,
    },
    assignedTo: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = model('SupportTicket', SupportTicketSchema);