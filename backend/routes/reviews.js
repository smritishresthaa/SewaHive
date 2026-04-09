const express = require("express");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { authGuard } = require("../middleware/auth");
const { createNotification } = require("../utils/createNotification");

const router = express.Router();

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getRangeBounds(range, from, to) {
  const now = new Date();

  if (range === "today") {
    const start = startOfDay(now);
    const end = addDays(start, 1);
    return { start, end };
  }

  if (range === "week") {
    const current = startOfDay(now);
    const day = current.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = addDays(current, -diffToMonday);
    const end = addDays(start, 7);
    return { start, end };
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }

  if (range === "custom" && from && to) {
    const start = startOfDay(new Date(from));
    const end = addDays(startOfDay(new Date(to)), 1);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return null;
    }

    return { start, end };
  }

  return null;
}

function applyRangeFilterToQuery(query, range, from, to) {
  const bounds = getRangeBounds(range, from, to);
  if (!bounds) return query;

  return {
    ...query,
    createdAt: {
      $gte: bounds.start,
      $lt: bounds.end,
    },
  };
}

async function populateReviews(query) {
  return query
    .populate(
      "clientId",
      [
        "profile.name",
        "profile.avatarUrl",
        "email",
        "kycStatus",
        "providerDetails.badges",
      ].join(" ")
    )
    .populate(
      "providerId",
      [
        "profile.name",
        "profile.avatarUrl",
        "email",
        "kycStatus",
        "providerDetails.badges",
      ].join(" ")
    )
    .populate({
      path: "bookingId",
      select: "serviceId status completedAt",
      populate: { path: "serviceId", select: "title" },
    });
}

function normalizeBadges(badges) {
  if (!Array.isArray(badges)) return [];
  return badges.filter(Boolean);
}

function getProviderLevel(providerDoc) {
  const badges = normalizeBadges(providerDoc?.providerDetails?.badges);

  if (badges.includes("top-rated") || badges.includes("Top Rated")) {
    return "Top Rated";
  }

  if (badges.includes("pro") || badges.includes("Pro")) {
    return "Pro";
  }

  if (
    badges.includes("verified") ||
    badges.includes("Verified") ||
    providerDoc?.kycStatus === "approved"
  ) {
    return "Verified";
  }

  return null;
}

function formatReview(r) {
  const providerBadges = normalizeBadges(r.providerId?.providerDetails?.badges);

  return {
    id: r._id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    client: {
      id: r.clientId?._id || null,
      name: r.clientId?.profile?.name || "Verified User",
      avatar: r.clientId?.profile?.avatarUrl || null,
    },
    provider: {
      id: r.providerId?._id || null,
      name: r.providerId?.profile?.name || "Service Provider",
      avatar: r.providerId?.profile?.avatarUrl || null,
      badges: providerBadges,
      level: getProviderLevel(r.providerId),
      isVerified:
        r.providerId?.kycStatus === "approved" || providerBadges.includes("verified"),
    },
    serviceTitle: r.bookingId?.serviceId?.title || "Home Service",
  };
}

router.get("/public/top", async (req, res, next) => {
  try {
    const base = Review.find({
      rating: { $gte: 4 },
      comment: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(8);

    const reviews = await populateReviews(base);

    res.json(reviews.filter((r) => r.clientId && r.providerId).map(formatReview));
  } catch (err) {
    next(err);
  }
});

router.get("/public/all", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(24, parseInt(req.query.limit) || 12);
    const ratingFilter = parseInt(req.query.rating);
    const sort =
      req.query.sort === "highest"
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const filter = { comment: { $exists: true, $ne: "" } };
    if (ratingFilter >= 1 && ratingFilter <= 5) filter.rating = ratingFilter;

    const [reviews, total] = await Promise.all([
      populateReviews(
        Review.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)
      ),
      Review.countDocuments(filter),
    ]);

    const avgResult = await Review.aggregate([
      { $match: { comment: { $exists: true, $ne: "" } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, total: { $sum: 1 } } },
    ]);

    const avgRating = avgResult[0]?.avg
      ? parseFloat(avgResult[0].avg.toFixed(1))
      : 0;
    const totalReviews = avgResult[0]?.total || 0;

    res.json({
      reviews: reviews.filter((r) => r.clientId && r.providerId).map(formatReview),
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

router.post("/", authGuard, async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const clientId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5 stars" });
    }

    const booking = await Booking.findById(bookingId).populate("providerId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.clientId.toString() !== clientId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only review your own bookings" });
    }

    if (booking.status !== "completed") {
      return res
        .status(400)
        .json({ message: "You can only review completed bookings" });
    }

    const existingReview = await Review.findOne({ bookingId, clientId });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this booking" });
    }

    const review = await Review.create({
      bookingId,
      clientId,
      providerId: booking.providerId._id,
      rating,
      comment: comment || "",
    });

    await review.populate("clientId", "profile.name email");

    const ratingStars = "⭐".repeat(rating);
    await createNotification({
      userId: booking.providerId._id,
      type: "review_received",
      title: "New Review Received!",
      message: `${
        review.clientId.profile?.name || "A client"
      } rated you ${ratingStars} (${rating}/5)${
        comment
          ? ': "' + comment.substring(0, 50) + (comment.length > 50 ? '..."' : '"')
          : ""
      }`,
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

router.get("/provider/:providerId", authGuard, async (req, res, next) => {
  try {
    const { providerId } = req.params;
    const { range, from, to } = req.query;

    const reviewFilter = applyRangeFilterToQuery({ providerId }, range, from, to);

    const reviews = await Review.find(reviewFilter)
      .populate("clientId", "profile.name profile.avatarUrl email")
      .populate(
        "providerId",
        "profile.name profile.avatarUrl kycStatus providerDetails.badges"
      )
      .populate("bookingId", "serviceId status completedAt")
      .populate({
        path: "bookingId",
        populate: {
          path: "serviceId",
          select: "title",
        },
      })
      .sort({ createdAt: -1 });

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating =
      reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
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

router.get("/booking/:bookingId", authGuard, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const clientId = req.user.id;

    const review = await Review.findOne({ bookingId, clientId }).populate(
      "providerId",
      "profile.name profile.avatarUrl email"
    );

    res.json({
      hasReviewed: !!review,
      review: review || null,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:reviewId", authGuard, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.clientId.toString() !== clientId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own reviews" });
    }

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

router.delete("/:reviewId", authGuard, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const clientId = req.user.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.clientId.toString() !== clientId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own reviews" });
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