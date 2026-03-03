// routes/index.js
const express = require("express");

const authRoutes = require("./auth");
const providerRoutes = require("./providers");
const serviceRoutes = require("./services");
const bookingRoutes = require("./bookings");
const paymentRoutes = require("./payment");
const leaderboardRoutes = require("./leaderboard");
const disputeRoutes = require("./disputes");
const notificationRoutes = require("./notifications");
const reviewRoutes = require("./reviews");
const adminRoutes = require("./admin");
const categoryRoutes = require("./categories");
const chatRoutes = require("./chat");
const supportRoutes = require("./support");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/providers", providerRoutes);
router.use("/services", serviceRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payment", paymentRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/disputes", disputeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reviews", reviewRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/chat", chatRoutes);
router.use("/support", supportRoutes);

module.exports = { router };
