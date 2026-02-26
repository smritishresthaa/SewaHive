const { Schema, model } = require("mongoose");

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    sizeBytes: { type: Number, default: 0 },
    // Image-specific
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    thumbnailUrl: { type: String, default: "" },
    // Voice-specific
    durationSec: { type: Number, default: null },
    waveform: { type: [Number], default: undefined },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: {
      type: String,
      enum: ["client", "provider"],
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "voice", "system"],
      default: "text",
    },
    text: { type: String, default: "" },
    attachment: { type: AttachmentSchema, default: null },
    status: {
      type: String,
      enum: ["sending", "sent", "read", "failed"],
      default: "sent",
    },
    readAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ bookingId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });

module.exports = model("Message", MessageSchema);
