const { Schema, model } = require("mongoose");

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
      enum: ["text", "image", "system"],
      default: "text",
    },
    text: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "read"],
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
