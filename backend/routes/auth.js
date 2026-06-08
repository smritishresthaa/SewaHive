const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { authGuard, resolveAccountAccess, buildAccountMeta } = require("../middleware/auth");
const upload = require("../middleware/upload");
const cloudinary = require("../utils/cloudinary");
const { normalizeNepalPhone, isValidNepalMobile } = require("../utils/phone");
const { normalizeRoles, hasRole } = require("../utils/roles");
const { validateRegistrationPayload, validateEmail, validatePassword, normalizeEmail } = require("../utils/authValidation");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ----------------------------------------------
// Generate Access + Refresh tokens
// ----------------------------------------------
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "1h";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "365d";
const REFRESH_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const RESET_SECRET =
  process.env.PASSWORD_RESET_SECRET || process.env.JWT_ACCESS_SECRET;
const RESET_EXPIRES = process.env.PASSWORD_RESET_EXPIRES || "10m";

function resolveActiveRole(user, requestedRole = null) {
  const availableRoles = normalizeRoles(user?.roles, user?.role);
  const normalizedRequestedRole = String(requestedRole || "").trim().toLowerCase();

  if (normalizedRequestedRole && availableRoles.includes(normalizedRequestedRole)) {
    return normalizedRequestedRole;
  }

  if (availableRoles.includes(user?.role)) {
    return user.role;
  }

  if (availableRoles.includes("provider")) return "provider";
  if (availableRoles.includes("client")) return "client";
  return "admin";
}

function generateTokens(user, activeRole = null) {
  const resolvedRole = resolveActiveRole(user, activeRole);
  const resolvedRoles = normalizeRoles(user?.roles, user?.role);

  const accessToken = jwt.sign(
    { sub: user._id, role: resolvedRole, roles: resolvedRoles },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { sub: user._id, role: resolvedRole, roles: resolvedRoles },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );

  return { accessToken, refreshToken, activeRole: resolvedRole };
}

const EMAIL_VERIFICATION_OTP_LENGTH = 6;
const EMAIL_VERIFICATION_OTP_TTL_MS = 30 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

function generateNumericOtp(length = EMAIL_VERIFICATION_OTP_LENGTH) {
  let otp = "";
  while (otp.length < length) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp.slice(0, length);
}

function hashOtp(otp = "") {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function compareOtp(otp = "", hashedOtp = "") {
  if (!otp || !hashedOtp) return false;

  const providedHash = Buffer.from(hashOtp(otp), "utf8");
  const storedHash = Buffer.from(String(hashedOtp), "utf8");

  if (providedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(providedHash, storedHash);
}

function buildEmailVerificationState(user) {
  const verification = user?.emailVerification || {};
  const resendAvailableAt = verification?.resendAvailableAt ? new Date(verification.resendAvailableAt) : null;
  const expiresAt = verification?.otpExpiresAt ? new Date(verification.otpExpiresAt) : null;
  const now = Date.now();

  return {
    pending: Boolean(!user?.isVerified && verification?.otpHash && expiresAt && expiresAt.getTime() > now),
    expiresAt,
    resendAvailableAt,
    resendCooldownSeconds: resendAvailableAt ? Math.max(0, Math.ceil((resendAvailableAt.getTime() - now) / 1000)) : 0,
    remainingAttempts: Math.max(0, EMAIL_VERIFICATION_MAX_ATTEMPTS - Number(verification?.failedAttempts || 0)),
  };
}

function clearEmailVerification(user) {
  user.emailVerification = {
    otpHash: "",
    otpExpiresAt: null,
    lastSentAt: null,
    resendAvailableAt: null,
    failedAttempts: 0,
  };
  return user;
}

async function issueEmailVerificationOtp(user) {
  const otp = generateNumericOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_OTP_TTL_MS);
  const resendAvailableAt = new Date(now.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);

  user.emailVerification = {
    otpHash: hashOtp(otp),
    otpExpiresAt: expiresAt,
    lastSentAt: now,
    resendAvailableAt,
    failedAttempts: 0,
  };

  await user.save();

  const subject = "Your SewaHive verification code";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 8px; color: #065f46;">Verify your email address</h2>
      <p>Use the verification code below to complete your SewaHive signup:</p>
      <div style="margin: 24px 0;">
        <div style="display: inline-block; padding: 14px 20px; border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #065f46;">${otp}</div>
      </div>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not create a SewaHive account, you can safely ignore this email.</p>
    </div>
  `;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`DEV EMAIL VERIFICATION OTP for ${user.email}: ${otp}`);
  }

  const emailInfo = await sendEmail(user.email, subject, html);

  console.log("Signup verification email queued:", {
    userId: user._id,
    email: user.email,
    messageId: emailInfo?.messageId,
  });

  return { expiresAt, resendAvailableAt };
}

function generatePasswordResetToken(user) {
  return jwt.sign({ sub: user._id }, RESET_SECRET, {
    expiresIn: RESET_EXPIRES,
  });
}

async function syncSuspensionState(user) {
  if (!user) return user;

  const now = new Date();
  const isSuspended = user.accountStatus === "suspended";
  const hasExpiry = Boolean(user?.suspension?.endsAt);

  if (isSuspended && hasExpiry && new Date(user.suspension.endsAt) <= now) {
    user.accountStatus = "active";
    user.suspension = {
      reason: "",
      startsAt: null,
      endsAt: null,
      imposedBy: null,
    };
    await user.save();
  }

  return user;
}

function buildOnboarding(user, activeRole = null) {
  const resolvedRole = resolveActiveRole(user, activeRole);
  const canActAsProvider = hasRole(user, "provider");

  const profileCompleted = Boolean(
    user?.profile?.name?.trim() &&
      user?.phone?.trim() &&
      user?.profile?.address?.city?.trim() &&
      user?.profile?.address?.area?.trim()
  );

  const skillProfileCompleted =
    !canActAsProvider
      ? true
      : Boolean(
          Number(user?.providerDetails?.experienceYears || 0) > 0 ||
            user?.providerDetails?.experienceDescription?.trim() ||
            (user?.providerDetails?.tools || []).length > 0 ||
            (user?.providerDetails?.skillProofs || []).length > 0
        );

  const kycCompleted = !canActAsProvider ? true : user?.kycStatus === "approved";

  let nextStep = null;
  if (!profileCompleted) nextStep = resolvedRole === "provider" ? "/provider/profile" : "/client/profile/edit";
  else if (resolvedRole === "provider" && !kycCompleted) nextStep = "/provider/verification";
  else if (resolvedRole === "provider" && !skillProfileCompleted) nextStep = "/provider/profile";

  const onboardingState = user?.onboarding || {};
  const clientWalkthroughCompletedAt = onboardingState.clientWalkthroughCompletedAt || null;
  const clientWalkthroughSkippedAt = onboardingState.clientWalkthroughSkippedAt || null;
  const providerWalkthroughCompletedAt = onboardingState.providerWalkthroughCompletedAt || null;
  const providerWalkthroughSkippedAt = onboardingState.providerWalkthroughSkippedAt || null;

  const walkthrough = {
    client: {
      completedAt: clientWalkthroughCompletedAt,
      skippedAt: clientWalkthroughSkippedAt,
      shouldAutoStart: !clientWalkthroughCompletedAt && !clientWalkthroughSkippedAt,
    },
    provider: {
      completedAt: providerWalkthroughCompletedAt,
      skippedAt: providerWalkthroughSkippedAt,
      shouldAutoStart:
        canActAsProvider && !providerWalkthroughCompletedAt && !providerWalkthroughSkippedAt,
    },
    currentRole: resolvedRole,
  };

  return {
    profileCompleted,
    kycCompleted,
    skillProfileCompleted,
    lastSuggestedStep: nextStep ? nextStep.split("/").pop() : "done",
    nextStep,
    completed: !nextStep,
    walkthrough,
  };
}

function sanitizeAuthUser(user, activeRole = null) {
  const resolvedRole = resolveActiveRole(user, activeRole);
  const roles = normalizeRoles(user?.roles, user?.role);
  const onboarding = buildOnboarding(user, resolvedRole);
  return {
    id: user._id,
    role: resolvedRole,
    roles,
    email: user.email,
    phone: user.phone,
    profile: user.profile,
    location: user.location,
    isVerified: user.isVerified,
    kycStatus: user.kycStatus,
    providerDetails: user.providerDetails,
    accountStatus: user.accountStatus,
    suspension: user.suspension || {},
    onboarding,
    emailVerification: buildEmailVerificationState(user),
  };
}

function enableProviderCapability(user) {
  if (!user) return user;
  user.roles = normalizeRoles([...(Array.isArray(user.roles) ? user.roles : []), "provider"], user.role);
  if (user.role !== "admin") {
    user.role = "provider";
  }
  return user;
}

// ----------------------------------------------
// REGISTER
// ----------------------------------------------
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, phone, role = "client", profile } = req.body;
    const requestedRole = String(role || "client").trim().toLowerCase();
    const validation = validateRegistrationPayload({
      name: profile?.name,
      email,
      password,
    });

    // Check registrationOpen
    const AdminServiceConfig = require("../models/AdminServiceConfig");
    const settings = await AdminServiceConfig.findOne({});
    if (settings && settings.registrationOpen === false) {
      return res
        .status(403)
        .json({ message: "Registration is currently closed by the platform admin." });
    }

    if (!validation.isValid) {
      const errors = Object.fromEntries(
        Object.entries(validation.errors).filter(([, value]) => Boolean(value))
      );

      return res.status(400).json({
        message: Object.values(errors)[0] || "Please check your signup details and try again.",
        errors,
      });
    }

    const existing = await User.findOne({ email: validation.normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let normalizedPhone = "";
    if (phone !== undefined && phone !== null && String(phone).trim() !== "") {
      normalizedPhone = normalizeNepalPhone(phone);

      if (!isValidNepalMobile(normalizedPhone)) {
        return res.status(400).json({
          message: "Please enter a valid Nepal mobile number (97/98XXXXXXXX)",
        });
      }
    }

    const user = await User.create({
      email: validation.normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: requestedRole === "provider" ? "provider" : requestedRole,
      roles: normalizeRoles([requestedRole], requestedRole),
      profile: {
        name: validation.normalizedName,
        avatarUrl: "",
        gender: "",
        bio: "",
        address: {
          country: "",
          city: "",
          postalCode: "",
          area: "",
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

    user.onboarding = {
      ...(user.onboarding || {}),
      ...buildOnboarding(user),
    };
    await user.save();

    try {
      await issueEmailVerificationOtp(user);
    } catch (emailError) {
      console.error("Signup verification email failed:", emailError.message);

      return res.status(502).json({
        message:
          "Account was created, but the verification email could not be sent. Please contact support or try resend after email service is configured.",
          verification: buildEmailVerificationState(user),
      });
    }

    res.json({
      message: "Registration successful. Please check your email for the verification code.",
      onboarding: buildOnboarding(user),
      verification: buildEmailVerificationState(user),
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
    const { email, password, role } = req.body;
    const requestedRole = String(role || "").trim().toLowerCase();

    let user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user = await syncSuspensionState(user);

    const access = await resolveAccountAccess(user);
    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: access.code,
        ...(access.meta ? { meta: access.meta } : {}),
      });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user) };
    await user.save();

    const requestedActiveRole =
      ["client", "provider", "admin"].includes(requestedRole) && hasRole(user, requestedRole)
        ? requestedRole
        : null;

    const { accessToken, refreshToken, activeRole } = generateTokens(user, requestedActiveRole);
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      accessToken,
      user: sanitizeAuthUser(user, activeRole),
    });
  } catch (e) {
    next(e);
  }
});

// ----------------------------------------------
// GOOGLE LOGIN / SIGNUP
// ----------------------------------------------
router.post("/google", async (req, res) => {
  try {
    const { credential, role = "client" } = req.body;
    const requestedRole = String(role || "client").trim().toLowerCase();

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });
    let avatarUrl = "";

    if (!user) {
      const AdminServiceConfig = require("../models/AdminServiceConfig");
      const settings = await AdminServiceConfig.findOne({});
      if (settings && settings.registrationOpen === false) {
        return res
          .status(403)
          .json({ message: "Registration is currently closed by the platform admin." });
      }
    }

    const hasCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (payload.picture) {
      try {
        if (hasCloudinary) {
          const response = await axios.get(payload.picture, {
            responseType: "arraybuffer",
          });
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
          avatarUrl = payload.picture;
        }
      } catch (err) {
        console.error("Failed to upload Google avatar:", err);
        avatarUrl = payload.picture || "";
      }
    }

    if (!user) {
      user = await User.create({
        email: payload.email,
        role: requestedRole === "provider" ? "provider" : requestedRole,
        roles: normalizeRoles([requestedRole], requestedRole),
        googleId: payload.sub,
        profile: {
          name: payload.name || "",
          avatarUrl,
          gender: "",
          bio: "",
          address: {
            country: "",
            city: "",
            postalCode: "",
            area: "",
          },
        },
        location: { type: "Point", coordinates: [0, 0] },
        isVerified: true,
        verifiedAt: new Date(),
      });
    }

    if (requestedRole === "provider" && !hasRole(user, "provider")) {
      enableProviderCapability(user);
    }

    user = await syncSuspensionState(user);

    const access = await resolveAccountAccess(user);
    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: access.code,
        ...(access.meta ? { meta: access.meta } : {}),
      });
    }

    user.lastLogin = new Date();
    user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user, requestedRole) };
    await user.save();

    const { accessToken, refreshToken, activeRole } = generateTokens(user, requestedRole);

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      accessToken,
      user: sanitizeAuthUser(user, activeRole),
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
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user = await syncSuspensionState(user);

    res.json({
      user: sanitizeAuthUser(user, req.user?.role || resolveActiveRole(user)),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------
// UPDATE PROFILE
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
        area,
      } = req.body;

      if (typeof name === "string") user.profile.name = name;

      if (phone !== undefined) {
        const rawPhone = String(phone).trim();

        if (rawPhone === "") {
          user.phone = "";
          if (user.isPhoneVerified !== undefined) {
            user.isPhoneVerified = false;
          }
        } else {
          const normalizedPhone = normalizeNepalPhone(rawPhone);

          if (!isValidNepalMobile(normalizedPhone)) {
            return res.status(400).json({
              message: "Please enter a valid Nepal mobile number (97/98XXXXXXXX)",
            });
          }

          if (user.phone !== normalizedPhone) {
            user.phone = normalizedPhone;

            if (user.isPhoneVerified !== undefined) {
              user.isPhoneVerified = false;
            }
          }
        }
      }

      if (!user.profile.address) {
        user.profile.address = {};
      }

      if (typeof country === "string") user.profile.address.country = country;
      if (typeof city === "string") user.profile.address.city = city;
      if (typeof postalCode === "string") user.profile.address.postalCode = postalCode;
      if (typeof area === "string") user.profile.address.area = area;

      if (req.file) {
        const fileUrl = req.file.path || req.file.secure_url || req.file.url;
        if (fileUrl) {
          user.profile.avatarUrl = fileUrl;
        }
      }

      user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user) };
      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: sanitizeAuthUser(user),
      });
    } catch (err) {
      console.error("Profile update error:", err.message);
      next(err);
    }
  }
);

// ----------------------------------------------
// VERIFY EMAIL (OTP)
// ----------------------------------------------
router.post("/verify-email", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").replace(/\D/g, "");

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 6-digit verification code we emailed you." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "We could not verify that email address." });
    }

    if (user.isVerified) {
      return res.json({
        message: "Your email is already verified. You can log in now.",
        alreadyVerified: true,
      });
    }

    const verification = user.emailVerification || {};

    if (!verification.otpHash || !verification.otpExpiresAt) {
      return res.status(400).json({
        message: "Your verification code is no longer active. Request a new code.",
      });
    }

    if (verification.otpExpiresAt < new Date()) {
      clearEmailVerification(user);
      await user.save();
      return res.status(400).json({
        message: "That verification code has expired. Request a new code.",
      });
    }

    const failedAttempts = Number(verification.failedAttempts || 0);
    if (failedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new code to continue.",
        verification: buildEmailVerificationState(user),
      });
    }

    if (!compareOtp(otp, verification.otpHash)) {
      user.emailVerification = {
        ...verification,
        failedAttempts: failedAttempts + 1,
      };
      await user.save();

      const remainingAttempts = Math.max(0, EMAIL_VERIFICATION_MAX_ATTEMPTS - Number(user.emailVerification.failedAttempts || 0));
      return res.status(400).json({
        message: remainingAttempts > 0
          ? `That code is incorrect. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
          : "Too many incorrect attempts. Request a new code to continue.",
        verification: buildEmailVerificationState(user),
      });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    clearEmailVerification(user);
    await user.save();

    res.json({ message: "Email verified successfully. You can log in now." });
  } catch (err) {
    console.error("Email OTP verification error:", err);
    res.status(500).json({ message: "Failed to verify email. Please try again." });
  }
});

// ----------------------------------------------
// LEGACY VERIFY EMAIL LINK
// ----------------------------------------------
router.get("/verify-email/:token", async (req, res) => {
  return res.status(410).json({
    message: "Email verification now uses a 6-digit code. Please request and enter the OTP instead.",
  });
});

// ----------------------------------------------
// RESEND VERIFICATION EMAIL OTP
// ----------------------------------------------
router.post("/resend-verification", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: "If an account exists for that email, a new verification code has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    const resendAvailableAt = user.emailVerification?.resendAvailableAt
      ? new Date(user.emailVerification.resendAvailableAt)
      : null;

    if (resendAvailableAt && resendAvailableAt.getTime() > Date.now()) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resendAvailableAt.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} before requesting another code.`,
        retryAfterSeconds,
        verification: buildEmailVerificationState(user),
      });
    }

    try {
      await issueEmailVerificationOtp(user);
    } catch (emailError) {
      console.error("Resend verification email failed:", emailError.message);
      return res.status(500).json({
        message: "Account exists, but verification email could not be sent right now.",
        verification: buildEmailVerificationState(user),
      });
    }

    res.json({
      message: "A new 6-digit verification code has been sent to your email.",
      verification: buildEmailVerificationState(user),
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Failed to send verification code. Please try again." });
  }
});

// ----------------------------------------------
// FORGOT PASSWORD
// ----------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetOtp: otp,
          resetOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      }
    );

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
// VERIFY OTP
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
// RESET PASSWORD
// ----------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Reset token and password are required",
      });
    }

    const passwordError = validatePassword(password, { email: "", name: "" });
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
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

    if (!user.resetOtp || user.resetOtpExpires < new Date()) {
      return res.status(400).json({
        message: "OTP expired. Start password reset again.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

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
// ENABLE PROVIDER CAPABILITY FOR CURRENT USER
// ----------------------------------------------
router.post("/enable-provider", authGuard, async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user = await syncSuspensionState(user);

    const access = await resolveAccountAccess(user);
    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: access.code,
        ...(access.meta ? { meta: access.meta } : {}),
      });
    }

    if (hasRole(user, "admin")) {
      return res.status(403).json({ message: "Admin accounts cannot be converted to providers." });
    }

    const alreadyProvider = hasRole(user, "provider");
    enableProviderCapability(user);
    user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user, "provider") };
    await user.save();

    const { accessToken, refreshToken, activeRole } = generateTokens(user, "provider");

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      message: alreadyProvider ? "Provider capability already enabled" : "Provider capability enabled",
      accessToken,
      user: sanitizeAuthUser(user, activeRole),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------
// SWITCH ACTIVE ROLE FOR CURRENT SESSION
// ----------------------------------------------
router.post("/switch-role", authGuard, async (req, res, next) => {
  try {
    const requestedRole = String(req.body?.role || "").trim().toLowerCase();

    if (!["client", "provider", "admin"].includes(requestedRole)) {
      return res.status(400).json({ message: "Invalid role selection" });
    }

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user = await syncSuspensionState(user);

    const access = await resolveAccountAccess(user);
    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: access.code,
        ...(access.meta ? { meta: access.meta } : {}),
      });
    }

    if (!hasRole(user, requestedRole)) {
      return res.status(403).json({
        message: "Forbidden: Insufficient role",
        code: "ROLE_NOT_ENABLED",
        availableRoles: normalizeRoles(user.roles, user.role),
      });
    }

    user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user, requestedRole) };
    await user.save();

    const { accessToken, refreshToken, activeRole } = generateTokens(user, requestedRole);

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.json({
      accessToken,
      user: sanitizeAuthUser(user, activeRole),
    });
  } catch (err) {
    next(err);
  }
});


// ----------------------------------------------
// UPDATE WALKTHROUGH STATE FOR CURRENT USER
// ----------------------------------------------
router.post("/onboarding/walkthrough", authGuard, async (req, res, next) => {
  try {
    const requestedRole = String(req.body?.role || req.user?.role || "client")
      .trim()
      .toLowerCase();
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!["client", "provider"].includes(requestedRole)) {
      return res.status(400).json({ message: "Invalid walkthrough role." });
    }

    if (!["completed", "skipped"].includes(status)) {
      return res.status(400).json({ message: "Invalid walkthrough status." });
    }

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!hasRole(user, requestedRole)) {
      return res.status(403).json({ message: "That walkthrough is not available for this account." });
    }

    const now = new Date();
    user.onboarding = {
      ...(user.onboarding || {}),
      ...(requestedRole === "client"
        ? {
            clientWalkthroughCompletedAt:
              status === "completed" ? now : user.onboarding?.clientWalkthroughCompletedAt || null,
            clientWalkthroughSkippedAt:
              status === "skipped" ? now : user.onboarding?.clientWalkthroughSkippedAt || null,
          }
        : {
            providerWalkthroughCompletedAt:
              status === "completed" ? now : user.onboarding?.providerWalkthroughCompletedAt || null,
            providerWalkthroughSkippedAt:
              status === "skipped" ? now : user.onboarding?.providerWalkthroughSkippedAt || null,
          }),
    };
    user.onboarding = { ...(user.onboarding || {}), ...buildOnboarding(user, requestedRole) };
    await user.save();

    res.json({
      message:
        status === "completed"
          ? "Walkthrough completed successfully."
          : "Walkthrough skipped for now.",
      user: sanitizeAuthUser(user, requestedRole),
    });
  } catch (err) {
    next(err);
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

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    let user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    user = await syncSuspensionState(user);

    const access = await resolveAccountAccess(user);
    if (!access.allowed) {
      return res.status(access.status).json({
        message: access.message,
        code: access.code,
        ...(access.meta ? { meta: access.meta } : {}),
      });
    }

    const { accessToken } = generateTokens(user, decoded.role);

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
  });

  res.json({ message: "Logged out successfully" });
});

module.exports = router;
