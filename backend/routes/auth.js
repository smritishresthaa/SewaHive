const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { authGuard } = require("../middleware/auth");
const upload = require("../middleware/upload");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ----------------------------------------------
// Generate Access + Refresh tokens
// ----------------------------------------------
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "1h"; // keep short-lived access
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "365d"; // extended session (1 year)
const REFRESH_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year for cookie
const RESET_SECRET =
  process.env.PASSWORD_RESET_SECRET || process.env.JWT_ACCESS_SECRET;
const RESET_EXPIRES = process.env.PASSWORD_RESET_EXPIRES || "10m";

function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { sub: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );

  return { accessToken, refreshToken };
}

function generatePasswordResetToken(user) {
  return jwt.sign({ sub: user._id }, RESET_SECRET, {
    expiresIn: RESET_EXPIRES,
  });
}

// ----------------------------------------------
// REGISTER
// ----------------------------------------------
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, phone, role = "client", profile } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      phone,
      passwordHash,
      role,
      profile: {
        name: profile?.name || "",
        avatarUrl: "",
        gender: "",
        bio: "",
        address: {
          country: "",
          city: "",
          postalCode: "",
          area: "", // ✅ initialized safely
        },
      },
      providerDetails: {
        categories: [],
        badges: [],
        verificationDocs: [],
        rating: { average: 0, count: 0 },
        completedBookings: 0,
        analytics: {
          totalEarnings: 0,
          responseTimeAvg: 0,
          jobsThisMonth: 0,
        },
      },
      isVerified: false,
    });

    const verifyToken = jwt.sign(
      { sub: user._id },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1d" }
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;

    await sendEmail(
      email,
      "Verify your SewaHive Email",
      `<a href="${verifyUrl}">${verifyUrl}</a>`
    );

    res.json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (e) {
    next(e);
  }
});

// ----------------------------------------------
// LOGIN
// ----------------------------------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        location: user.location,
        isVerified: user.isVerified,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ----------------------------------------------
// GOOGLE LOGIN
// ----------------------------------------------
router.post("/google", async (req, res) => {
  try {
    const { credential, role = "client" } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });
      let avatarUrl = "";
      
      // Fetch and upload Google profile picture to Cloudinary (if configured)
      const hasCloudinary = !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );
      if (payload.picture) {
        try {
          if (hasCloudinary) {
            const response = await axios.get(payload.picture, { responseType: "arraybuffer" });
            const base64 = Buffer.from(response.data).toString("base64");
            const dataURI = `data:${response.headers["content-type"]};base64,${base64}`;

            const uploadResult = await cloudinary.uploader.upload(dataURI, {
              folder: "sewahive/avatars",
              resource_type: "auto",
              width: 200,
              height: 200,
              crop: "fill",
              gravity: "face",
            });

            avatarUrl = uploadResult.secure_url;
          } else {
            // Cloudinary not configured, use Google picture directly
            avatarUrl = payload.picture;
          }
        } catch (err) {
          console.error("Failed to upload Google avatar:", err);
          // Fall back to Google URL if upload fails
          avatarUrl = payload.picture || "";
        }
      }
      

    if (!user) {
      user = await User.create({
        email: payload.email,
        role: role, // ✅ Use the role passed from frontend
        googleId: payload.sub,
        profile: {
          name: payload.name || "",
          avatarUrl: avatarUrl,
          gender: "",
          bio: "",
          address: {
            country: "",
            city: "",
            postalCode: "",
            area: "", // ✅ initialized safely
          },
        },
        location: {
          type: "Point",
          coordinates: [0, 0],
        },
        isVerified: true,
        verifiedAt: new Date(),
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Set long-lived refresh cookie for Google login too
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        location: user.location,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: err.message || "Google login failed" });
  }
});

// ----------------------------------------------
// GET LOGGED-IN USER
// ----------------------------------------------
router.get("/me", authGuard, async (req, res, next) => {
  try {
    // Fetch fresh user data from database to ensure KYC status is up-to-date
    // (don't rely on JWT token which may be cached)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        location: user.location,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        providerDetails: user.providerDetails,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------
// UPDATE PROFILE (✅ FULLY FIXED, NON-BREAKING)
// ----------------------------------------------
router.put(
  "/profile",
  authGuard,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        name,
        phone,
        country,
        city,
        postalCode,
        area, // ✅ ADDED
      } = req.body;

      if (typeof name === "string") user.profile.name = name;
      if (typeof phone === "string") user.phone = phone;

      if (!user.profile.address) {
        user.profile.address = {};
      }

      if (typeof country === "string")
        user.profile.address.country = country;

      if (typeof city === "string")
        user.profile.address.city = city;

      if (typeof postalCode === "string")
        user.profile.address.postalCode = postalCode;

      if (typeof area === "string") // ✅ FIX
        user.profile.address.area = area;

      // Handle file upload - Cloudinary returns URL in different properties
      if (req.file) {
        // CloudinaryStorage returns the URL in req.file.path
        const fileUrl = req.file.path || req.file.secure_url || req.file.url;
        if (fileUrl) {
          user.profile.avatarUrl = fileUrl;
        }
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          role: user.role,
          email: user.email,
          phone: user.phone,
          profile: user.profile,
          location: user.location,
          isVerified: user.isVerified,
        },
      });
    } catch (err) {
      console.error("Profile update error:", err.message);
      next(err);
    }
  }
);

// ----------------------------------------------
// VERIFY EMAIL
// ----------------------------------------------
router.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(
      req.params.token,
      process.env.EMAIL_VERIFICATION_SECRET
    );

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch {
    res.status(400).json({ message: "Verification link expired or invalid" });
  }
});

// ----------------------------------------------
// RESEND VERIFICATION EMAIL
// ----------------------------------------------
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verifyToken = jwt.sign(
      { sub: user._id },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1d" }
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;

    const subject = "Verify your SewaHive Email";
    const html = `
      <h2>Email Verification</h2>
      <p>Thank you for signing up with SewaHive! Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Verify Email
      </a>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `;

    await sendEmail(email, subject, html);

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Failed to send verification email" });
  }
});

// ----------------------------------------------
// FORGOT PASSWORD - Send OTP via email
// ----------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10-minute expiration without full-document validation
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetOtp: otp,
          resetOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      }
    );

    // Send OTP via email
    const subject = "Your SewaHive Password Reset Code";
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Use the code below:</p>
      <h3 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #059669;">${otp}</h3>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const emailInfo = await sendEmail(email, subject, html);
    if (emailInfo?.messageId === "dev-skip") {
      console.warn(`DEV OTP for ${email}: ${otp}`);
    }

    res.json({ message: "OTP sent to email. Check your inbox." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset code" });
  }
});

// ----------------------------------------------
// VERIFY OTP - Validate OTP for password reset
// ----------------------------------------------
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP is valid and not expired
    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Request a new one." });
    }
    const resetToken = generatePasswordResetToken(user);

    res.json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
});

// ----------------------------------------------
// RESET PASSWORD - Update password with valid OTP
// ----------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Reset token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, RESET_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify OTP is still valid
    if (!user.resetOtp || user.resetOtpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired. Start password reset again." });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear OTP fields without full-document validation
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetOtp: "", resetOtpExpires: "" },
      }
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// ----------------------------------------------
// REFRESH ACCESS TOKEN
// ----------------------------------------------
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Get user to include role in new token
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRES }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// ----------------------------------------------
// LOGOUT
// ----------------------------------------------
router.post("/logout", (req, res) => {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: REFRESH_MAX_AGE_MS,
  });

  res.json({ message: "Logged out successfully" });
});

module.exports = router;
