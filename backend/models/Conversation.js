const { Schema, model } = require("mongoose");

const ConversationSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date },
    lastMessageText: { type: String, default: "" },
    unreadByClient: { type: Number, default: 0 },
    unreadByProvider: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ clientId: 1, lastMessageAt: -1 });
ConversationSchema.index({ providerId: 1, lastMessageAt: -1 });

module.exports = model("Conversation", ConversationSchema);
