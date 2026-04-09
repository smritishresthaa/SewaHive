const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authGuard } = require("../middleware/auth");

const router = express.Router();

function buildDefaultNotifications(role = "client") {
  return {
    bookingUpdates: true,
    messages: true,
    reviews: true,
    email: true,
    emergencyAlerts: role === "provider",
  };
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    role: user.role,
    email: user.email,
    phone: user.phone,
    profile: user.profile,
    location: user.location,
    providerDetails: user.providerDetails,
    settings: user.settings,
    isVerified: user.isVerified,
    kycStatus: user.kycStatus,
    accountStatus: user.accountStatus,
    hasGoogleAccount: !!user.googleId,
  };
}

/**
 * GET current account settings snapshot
 */
router.get("/settings", authGuard, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "role email phone profile location providerDetails settings googleId passwordHash accountStatus isVerified kycStatus"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notifications = {
      ...buildDefaultNotifications(user.role),
      ...(user.settings?.notifications || {}),
    };

    return res.json({
      user: sanitizeUser(user),
      notifications,
      hasPassword: !!user.passwordHash,
      isGoogleOnly: !!user.googleId && !user.passwordHash,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH notifications
 */
router.patch("/notifications", authGuard, async (req, res, next) => {
  try {
    const incoming = req.body?.notifications || {};
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentNotifications = {
      ...buildDefaultNotifications(user.role),
      ...(user.settings?.notifications || {}),
    };

    const nextNotifications = {
      bookingUpdates: incoming.bookingUpdates ?? currentNotifications.bookingUpdates,
      messages: incoming.messages ?? currentNotifications.messages,
      reviews: incoming.reviews ?? currentNotifications.reviews,
      email: incoming.email ?? currentNotifications.email,
      emergencyAlerts: incoming.emergencyAlerts ?? currentNotifications.emergencyAlerts,
    };

    user.settings = user.settings || {};
    user.settings.notifications = nextNotifications;

    let emergencyDisabled = false;
    let providerNotificationsEnabled = null;

    if (user.role === "provider") {
      providerNotificationsEnabled = Object.values(nextNotifications).some(Boolean);
      user.providerDetails = user.providerDetails || {};
      user.providerDetails.notificationsEnabled = providerNotificationsEnabled;

      if (!providerNotificationsEnabled && user.providerDetails.emergencyAvailable) {
        user.providerDetails.emergencyAvailable = false;
        emergencyDisabled = true;
      }
    }

    await user.save();

    return res.json({
      ok: true,
      notifications: user.settings.notifications,
      providerNotificationsEnabled,
      emergencyDisabled,
      emergencyAvailable: user.providerDetails?.emergencyAvailable,
      user: sanitizeUser(user),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH change password
 */
router.patch("/change-password", authGuard, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user.id).select("passwordHash googleId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        message: "Password change is not available for this account",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsCurrent) {
      return res.status(400).json({
        message: "New password cannot be the same as current password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({
      ok: true,
      message: "Password updated successfully",
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH deactivate account
 */
router.patch("/deactivate", authGuard, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        accountStatus: "suspended",
        deactivatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      ok: true,
      message: "Account deactivated successfully",
      user: sanitizeUser(user),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE account
 */
router.delete("/delete", authGuard, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        accountStatus: "deleted",
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      ok: true,
      message: "Account deleted successfully",
      user: sanitizeUser(user),
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;