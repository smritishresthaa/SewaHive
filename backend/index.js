// index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const { router: apiRouter } = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/error");
const { initSocket } = require("./utils/socket");

const cron = require("node-cron");
const { runMonthlyLeaderboard } = require("./cron/monthlyLeaderboard");
const { runReminders } = require("./cron/reminders");
const { runEmergencyAvailability } = require("./cron/emergencyAvailability");
const { runTrustScoring } = require("./cron/trustScoring");
const { sendPush, sendSMS, sendEmail } = require("./utils/notifications");

const app = express();
const server = http.createServer(app);

const corsOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://accounts.google.com",
  "https://*.googleusercontent.com",
];

// ----------------------------------------
// Security & core middleware
// ----------------------------------------
app.use(helmet());

// ----------------------------------------
// FIXED CORS CONFIG FOR GOOGLE LOGIN
// ----------------------------------------
app.use(
  cors({
    origin: corsOrigins,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,
  })
);

// ⭐ REQUIRED FOR GOOGLE IDENTITY PRE-FLIGHT ⭐
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------------------------
// Rate limiting (auth & payment only)
// ----------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === "GET" && req.path === "/me",
});

// Limit hits
app.use("/api/auth", authLimiter);
app.use("/api/payment", authLimiter);

// ----------------------------------------
// API routes
// ----------------------------------------
app.use("/api", apiRouter);

// ----------------------------------------
// 404 + error handlers
// ----------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ----------------------------------------
// Start server + cron jobs
// ----------------------------------------
async function start() {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log("Connected to MongoDB");

    initSocket(server, corsOrigins);

    server.listen(PORT, () => {
      console.log(`SewaHive API running on port ${PORT}`);
    });

    // Monthly leaderboard – midnight on day 1
    cron.schedule("0 0 1 * *", async () => {
      try {
        await runMonthlyLeaderboard();
      } catch (err) {
        console.error("Error in runMonthlyLeaderboard cron:", err);
      }
    });

    // Emergency availability – every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      try {
        await runEmergencyAvailability();
      } catch (err) {
        console.error("Error in runEmergencyAvailability cron:", err);
      }
    });

    // Trust scoring – daily at 1 AM
    cron.schedule("0 1 * * *", async () => {
      try {
        await runTrustScoring();
      } catch (err) {
        console.error("Error in runTrustScoring cron:", err);
      }
    });

    // Reminders – every hour
    cron.schedule("0 * * * *", async () => {
      try {
        await runReminders(async (booking) => {
          // Demo notifications
          await sendPush(booking.clientId, {
            type: "reminder",
            bookingId: booking._id,
          });

          if (process.env.TEST_SMS_TO) {
            await sendSMS(
              process.env.TEST_SMS_TO,
              `Reminder for booking ${booking._id}`
            );
          }

          if (process.env.TEST_EMAIL_TO) {
            await sendEmail(
              process.env.TEST_EMAIL_TO,
              "Booking Reminder",
              `<p>Reminder for booking ${booking._id}</p>`
            );
          }
        });
      } catch (err) {
        console.error("Error in runReminders cron:", err);
      }
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
