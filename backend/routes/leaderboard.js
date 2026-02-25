// routes/leaderboard.js
const express = require("express");
const { authGuard } = require("../middleware/auth");
const Leaderboard = require("../models/Leaderboard");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const User = require("../models/User");
const { calculateSpeedScore } = require("../utils/responseTime");
const {
  calculateBookingScore,
  calculateRatingScore,
  calculateTotalScore,
  qualifiesForLeaderboard,
} = require("../utils/leaderboardScoring");

const router = express.Router();

/**
 * Current month leaderboard
 */
router.get("/current", authGuard, async (req, res, next) => {
  try {
    const range = String(req.query.range || "").trim();
    const requestedMonth = String(req.query.month || "").trim();
    const monthMatch = requestedMonth.match(/^(\d{4})-(\d{2})$/);
    const now = new Date();

    let startDate;
    let endDate;
    let rangeLabel;

    if (range === "30d") {
      endDate = now;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      rangeLabel = "rolling-30d";
    } else {
      const year = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
      const monthIndex = monthMatch ? Number(monthMatch[2]) - 1 : now.getMonth();
      rangeLabel = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      startDate = new Date(year, monthIndex, 1);
      endDate = new Date(year, monthIndex + 1, 1);
    }

    const bookingsAgg = await Booking.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$providerId",
          completedBookings: { $sum: 1 },
          monthlyEarnings: { $sum: "$totalAmount" },
        },
      },
    ]);

    const responseTimes = await Booking.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startDate, $lt: endDate },
          requestedAt: { $type: "date" },
          acceptedAt: { $type: "date" },
        },
      },
      {
        $project: {
          providerId: 1,
          responseMinutes: {
            $divide: [{ $subtract: ["$acceptedAt", "$requestedAt"] }, 60000],
          },
        },
      },
      {
        $group: {
          _id: "$providerId",
          avgResponseMinutes: { $avg: "$responseMinutes" },
        },
      },
    ]);

    const reviewsAgg = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$providerId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const emergencyAgg = await Booking.aggregate([
      {
        $match: {
          type: "emergency",
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$providerId",
          totalEmergency: { $sum: 1 },
          completedEmergency: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const categoryAgg = await Booking.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            providerId: "$providerId",
            categoryId: "$service.categoryId",
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      {
        $group: {
          _id: "$_id.providerId",
          categoryId: { $first: "$_id.categoryId" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          providerId: "$_id",
          categoryId: 1,
          categoryName: "$category.name",
        },
      },
    ]);

    const bookingsMap = new Map();
    bookingsAgg.forEach((b) => {
      bookingsMap.set(String(b._id), {
        completedBookings: b.completedBookings || 0,
        monthlyEarnings: b.monthlyEarnings || 0,
      });
    });

    const responseMap = new Map();
    responseTimes.forEach((r) => {
      responseMap.set(String(r._id), r.avgResponseMinutes || 0);
    });

    const reviewMap = new Map();
    reviewsAgg.forEach((r) => {
      reviewMap.set(String(r._id), {
        avgRating: r.avgRating || 0,
        reviewCount: r.reviewCount || 0,
      });
    });

    const emergencyMap = new Map();
    emergencyAgg.forEach((e) => {
      emergencyMap.set(String(e._id), {
        totalEmergency: e.totalEmergency || 0,
        completedEmergency: e.completedEmergency || 0,
      });
    });

    const categoryMap = new Map();
    categoryAgg.forEach((c) => {
      categoryMap.set(String(c.providerId), {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
      });
    });

    const providerIds = new Set([
      ...bookingsAgg.map((b) => String(b._id)),
      ...responseTimes.map((r) => String(r._id)),
      ...reviewsAgg.map((r) => String(r._id)),
      ...emergencyAgg.map((e) => String(e._id)),
      ...categoryAgg.map((c) => String(c.providerId)),
    ]);

    const maxBookings = Math.max(
      0,
      ...bookingsAgg.map((b) => b.completedBookings || 0)
    );

    const users = await User.find({ _id: { $in: Array.from(providerIds) } })
      .select("email profile providerDetails.trustScore providerDetails.badges")
      .lean();

    const userMap = new Map();
    users.forEach((u) => {
      userMap.set(String(u._id), u);
    });

    const entries = Array.from(providerIds).map((providerId) => {
      const bookingData = bookingsMap.get(providerId) || {
        completedBookings: 0,
        monthlyEarnings: 0,
      };
      const reviewData = reviewMap.get(providerId) || { avgRating: 0, reviewCount: 0 };
      const responseMinutes = responseMap.get(providerId) || 0;
      const emergencyData = emergencyMap.get(providerId) || {
        totalEmergency: 0,
        completedEmergency: 0,
      };

      const bookingScore = calculateBookingScore(
        bookingData.completedBookings,
        maxBookings
      );
      const ratingScore = calculateRatingScore(reviewData.avgRating || 0);
      const speedScore = calculateSpeedScore(responseMinutes);
      const totalScore = calculateTotalScore({
        bookingScore,
        ratingScore,
        speedScore,
      });

      const metrics = {
        completedBookings: bookingData.completedBookings,
        avgRating: reviewData.avgRating || 0,
        reviewCount: reviewData.reviewCount || 0,
        avgResponseMinutes: responseMinutes,
        monthlyEarnings: bookingData.monthlyEarnings || 0,
        emergencyResponseRate:
          emergencyData.totalEmergency > 0
            ? (emergencyData.completedEmergency / emergencyData.totalEmergency) * 100
            : null,
      };

      const user = userMap.get(providerId);
      const category = categoryMap.get(providerId);
      const qualifies = qualifiesForLeaderboard(metrics);

      // Add trust score to total points (e.g., 1 trust score point = 1 leaderboard point)
      const trustScore = user?.providerDetails?.trustScore || 0;
      const finalPoints = totalScore + trustScore;

      return {
        _id: `${providerId}-${rangeLabel}`,
        providerId: user || { _id: providerId, profile: { name: "" }, email: "" },
        categoryId: category?.categoryId || null,
        categoryName: category?.categoryName || null,
        points: finalPoints,
        trustScore,
        badges: user?.providerDetails?.badges || [],
        metrics,
        scores: {
          bookingScore,
          ratingScore,
          speedScore,
          totalScore,
        },
        qualifiesForLeaderboard: qualifies,
        isRisingProvider: bookingData.completedBookings > 0 && !qualifies,
      };
    });

    entries.sort((a, b) => b.points - a.points);
    const ranked = entries.slice(0, 100).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({ data: ranked });
  } catch (e) {
    next(e);
  }
});

/**
 * Leaderboard history
 */
router.get("/history", authGuard, async (req, res, next) => {
  try {
    const data = await Leaderboard.find()
      .sort({ month: -1, rank: 1 })
      .limit(500);

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
