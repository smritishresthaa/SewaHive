// models/Review.js
const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true }
);

// Prevent spam multiple reviews for same booking by same client
ReviewSchema.index({ bookingId: 1, clientId: 1 }, { unique: true });

module.exports = model('Review', ReviewSchema);
