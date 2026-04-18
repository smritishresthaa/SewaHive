const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeRoles, hasRole } = require("../utils/roles");

function buildAccountMeta(user) {
  return {
    accountStatus: user.accountStatus,
    isDeleted: !!user.isDeleted,
    suspension: {
      reason: user.suspension?.reason || "",
      startsAt: user.suspension?.startsAt || null,
      endsAt: user.suspension?.endsAt || null,
    },
  };
}

async function resolveAccountAccess(user) {
  if (!user) {
    return { allowed: false, status: 401, message: "Unauthorized: User no longer exists" };
  }

  if (user.isDeleted || user.accountStatus === "deleted") {
    return {
      allowed: false,
      status: 403,
      message: "Account deleted",
      code: "ACCOUNT_DELETED",
      meta: buildAccountMeta(user),
    };
  }

  if (user.accountStatus === "suspended") {
    const endsAt = user.suspension?.endsAt ? new Date(user.suspension.endsAt) : null;
    if (endsAt && endsAt <= new Date()) {
      user.accountStatus = "active";
      user.suspension = {
        reason: "",
        startsAt: null,
        endsAt: null,
        imposedBy: null,
      };
      await user.save();
    } else {
      return {
        allowed: true,
        code: "ACCOUNT_SUSPENDED",
        message: "Account suspended",
        meta: buildAccountMeta(user),
      };
    }
  }

  if (user.isBlocked) {
    return {
      allowed: false,
      status: 403,
      message: "Account blocked by admin",
      code: "ACCOUNT_BLOCKED",
      meta: buildAccountMeta(user),
    };
  }

  return { allowed: true, meta: buildAccountMeta(user) };
}

async function attachUserFromToken(token) {
  if (!token) {
    return { error: { status: 401, message: "Unauthorized: No token provided" } };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    const access = await resolveAccountAccess(user);

    if (!access.allowed) {
      return { error: access };
    }

    return {
      user,
      reqUser: {
        id: String(user._id),
        role: hasRole(user, payload.role) ? payload.role : normalizeRoles(user.roles, user.role)[0],
        roles: normalizeRoles(user.roles, user.role),
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        location: user.location,
        providerDetails: user.providerDetails,
        settings: user.settings,
        isVerified: user.isVerified,
        kycStatus: user.kycStatus,
        accountStatus: user.accountStatus,
        suspension: user.suspension || {},
        onboarding: user.onboarding || {},
      },
    };
  } catch (error) {
    return { error: { status: 401, message: "Unauthorized: Invalid or expired token" } };
  }
}

async function authGuard(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const result = await attachUserFromToken(token);

  if (result.error) {
    return res.status(result.error.status).json({
      message: result.error.message,
      code: result.error.code,
      ...(result.error.meta ? { meta: result.error.meta } : {}),
    });
  }

  req.user = result.reqUser;
  req.userDoc = result.user;
  next();
}

async function authGuardFromQuery(req, res, next) {
  const result = await attachUserFromToken(req.query.token);

  if (result.error) {
    return res.status(result.error.status).json({
      message: result.error.message,
      code: result.error.code,
      ...(result.error.meta ? { meta: result.error.meta } : {}),
    });
  }

  req.user = result.reqUser;
  req.userDoc = result.user;
  next();
}

function roleGuard(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.accountStatus === "suspended") {
      return res.status(403).json({
        message: "Account suspended",
        code: "ACCOUNT_SUSPENDED",
        meta: {
          accountStatus: req.user.accountStatus,
          isDeleted: false,
          suspension: {
            reason: req.user.suspension?.reason || "",
            startsAt: req.user.suspension?.startsAt || null,
            endsAt: req.user.suspension?.endsAt || null,
          },
        },
      });
    }

    const activeRole = req.user.role;

    if (activeRole === "admin") return next();

    if (!allowedRoles.includes(activeRole)) {
      if (allowedRoles.some((role) => hasRole(req.user, role))) {
        return res.status(403).json({
          message: "Forbidden: Switch to the required role to continue",
          code: "ACTIVE_ROLE_REQUIRED",
          activeRole,
          availableRoles: normalizeRoles(req.user.roles, req.user.role),
        });
      }

      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }

    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.accountStatus === "suspended") {
    return res.status(403).json({
      message: "Account suspended",
      code: "ACCOUNT_SUSPENDED",
      meta: {
        accountStatus: req.user.accountStatus,
        isDeleted: false,
        suspension: {
          reason: req.user.suspension?.reason || "",
          startsAt: req.user.suspension?.startsAt || null,
          endsAt: req.user.suspension?.endsAt || null,
        },
      },
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  next();
}

async function requireVerifiedProvider(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.accountStatus === "suspended") {
      return res.status(403).json({
        message: "Account suspended",
        code: "ACCOUNT_SUSPENDED",
        meta: {
          accountStatus: req.user.accountStatus,
          isDeleted: false,
          suspension: {
            reason: req.user.suspension?.reason || "",
            startsAt: req.user.suspension?.startsAt || null,
            endsAt: req.user.suspension?.endsAt || null,
          },
        },
      });
    }

    if (!hasRole(req.user, "provider")) {
      return next();
    }

    if (req.user.role !== "provider") {
      return res.status(403).json({
        message: "Switch to provider mode to continue",
        code: "ACTIVE_ROLE_REQUIRED",
        activeRole: req.user.role,
        availableRoles: normalizeRoles(req.user.roles, req.user.role),
      });
    }

    const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
    const kycStatus = await resolveProviderKycStatus({
      user: req.user,
      providerId: req.user.id,
    });

    if (!isKycApproved(kycStatus)) {
      return res.status(403).json({
        message: "KYC verification required",
        reason:
          "You must complete and get approved for KYC verification before you can accept bookings or publish services.",
        kycStatus,
        needsAction: "Please complete your KYC verification in the Verification page.",
      });
    }

    next();
  } catch (error) {
    console.error("KYC verification check error:", error);
    return res.status(500).json({ message: "Failed to verify KYC status" });
  }
}

module.exports = {
  authGuard,
  roleGuard,
  requireAuth: authGuard,
  requireRole: (role) => roleGuard([role]),
  authenticate: authGuard,
  requireAdmin,
  authGuardFromQuery,
  requireVerifiedProvider,
  resolveAccountAccess,
  buildAccountMeta,
};