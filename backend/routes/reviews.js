// routes/reviews.js
const express = require("express");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { authGuard } = require("../middleware/auth");
const { createNotification } = require("../utils/createNotification");

const router = express.Router();

// ─── Shared populate helper ───────────────────────────────────────────────────
async function populateReviews(query) {
  return query
    .populate("clientId", "profile.name profile.avatar")
    .populate("providerId", "profile.name profile.avatar")
    .populate({
      path: "bookingId",
      select: "serviceId",
      populate: { path: "serviceId", select: "title" },
    });
}

function formatReview(r) {
  return {
    id: r._id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    client: {
      name: r.clientId?.profile?.name || "Verified User",
      avatar: r.clientId?.profile?.avatar || null,
    },
    provider: {
      id: r.providerId?._id || null,
      name: r.providerId?.profile?.name || "Service Provider",
      avatar: r.providerId?.profile?.avatar || null,
    },
    serviceTitle: r.bookingId?.serviceId?.title || "Home Service",
  };
}

// ─── PUBLIC: Top 8 platform reviews (4-5★) for landing page social proof ─────
router.get("/public/top", async (req, res, next) => {
  try {
    const base = Review.find({
      rating: { $gte: 4 },
      comment: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(8);

    const reviews = await populateReviews(base);
    res.json(reviews.filter((r) => r.clientId).map(formatReview));
  } catch (err) {
    next(err);
  }
});

// ─── PUBLIC: Paginated all-reviews browser ────────────────────────────────────
router.get("/public/all", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(24, parseInt(req.query.limit) || 12);
    const ratingFilter = parseInt(req.query.rating);
    const sort = req.query.sort === "highest" ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

    const filter = { comment: { $exists: true, $ne: "" } };
    if (ratingFilter >= 1 && ratingFilter <= 5) filter.rating = ratingFilter;

    const [reviews, total] = await Promise.all([
      populateReviews(
        Review.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)
      ),
      Review.countDocuments(filter),
    ]);

    const avgResult = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } },
    ]);
    const avgRating = avgResult[0]?.avg ? parseFloat(avgResult[0].avg.toFixed(1)) : 0;
    const totalReviews = avgResult[0]?.total || 0;

    res.json({
      reviews: reviews.filter((r) => r.clientId).map(formatReview),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: { avgRating, totalReviews },
    });
  } catch (err) {
    next(err);
  }
});

// Create a review for a completed booking
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const clientId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5 stars" });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate('providerId');
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify client owns this booking
    if (booking.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "You can only review your own bookings" });
    }

    // Verify booking is completed
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only review completed bookings" });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId, clientId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this booking" });
    }

    // Create the review
    const review = await Review.create({
      bookingId,
      clientId,
      providerId: booking.providerId._id,
      rating,
      comment: comment || "",
    });

    // Populate client details for the notification
    await review.populate('clientId', 'profile.name email');

    // Create notification for provider
    const ratingStars = "⭐".repeat(rating);
    await createNotification({
      userId: booking.providerId._id,
      type: "review_received",
      title: "New Review Received!",
      message: `${review.clientId.profile?.name || "A client"} rated you ${ratingStars} (${rating}/5)${comment ? ': "' + comment.substring(0, 50) + (comment.length > 50 ? '..."' : '"') : ''}`,
      category: "review",
      bookingId: booking._id,
      fromUserId: clientId,
      metadata: {
        rating,
        reviewId: review._id,
      },
      sendEmail: false,
    });

    res.status(201).json({
      message: "Review submitted successfully!",
      review,
    });
  } catch (err) {
    next(err);
  }
});

// Get reviews for a specific provider (visible to provider)
router.get("/provider/:providerId", authGuard, async (req, res, next) => {
  try {
    const { providerId } = req.params;

    // Only allow providers to view their own reviews or anyone can view (for transparency)
    const reviews = await Review.find({ providerId })
      .populate('clientId', 'profile.name email')
      .populate('bookingId', 'serviceId status completedAt')
      .populate({
        path: 'bookingId',
        populate: {
          path: 'serviceId',
          select: 'title'
        }
      })
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    res.json({
      reviews,
      stats: {
        totalReviews: reviews.length,
        averageRating: parseFloat(averageRating),
        ratingDistribution,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get review for a specific booking (check if client has reviewed)
router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const clientId = req.user.id;

    const review = await Review.findOne({ bookingId, clientId })
      .populate('providerId', 'profile.name email');

    res.json({
      hasReviewed: !!review,
      review: review || null,
    });
  } catch (err) {
    next(err);
  }
});

// Update a review (optional - allow clients to edit their reviews)
router.patch("/:reviewId", authGuard, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify client owns this review
    if (review.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    
    await review.save();

    res.json({
      message: "Review updated successfully",
      review,
    });
  } catch (err) {
    next(err);
  }
});

// Delete a review (optional)
router.delete("/:reviewId", authGuard, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const clientId = req.user.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify client owns this review
    if (review.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    await review.deleteOne();

    res.json({
      message: "Review deleted successfully",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
