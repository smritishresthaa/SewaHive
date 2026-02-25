// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ----------------------------------------------
// AUTHENTICATION GUARD
// ----------------------------------------------
async function authGuard(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    // Verify JWT
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch user from DB
    const user = await User.findById(payload.sub);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User no longer exists" });
    }

    if (user.isDeleted) {
      return res.status(403).json({ message: "Account deleted" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked by admin" });
    }

    // Attach normalized user object
    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      phone: user.phone,
      profile: user.profile,
      location: user.location,
      providerDetails: user.providerDetails,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
    };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
}

// ----------------------------------------------
// AUTH GUARD FOR SSE (TOKEN FROM QUERY)
// ----------------------------------------------
async function authGuardFromQuery(req, res, next) {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User no longer exists" });
    }

    if (user.isDeleted) {
      return res.status(403).json({ message: "Account deleted" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked by admin" });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      phone: user.phone,
      profile: user.profile,
      location: user.location,
      providerDetails: user.providerDetails,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
}

// ----------------------------------------------
// ROLE-BASED AUTHORIZATION (WITH ADMIN OVERRIDE)
// ----------------------------------------------
function roleGuard(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = req.user.role;

    // Admin has access to everything
    if (userRole === "admin") return next();

    if (!allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient role" });
    }

    next();
  };
}

// ----------------------------------------------
// ADMIN-ONLY GUARD
// ----------------------------------------------
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  next();
}

// ----------------------------------------------
// KYC VERIFICATION GUARD (PHASE 2A)
// ----------------------------------------------
async function requireVerifiedProvider(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "provider") {
      return next(); // Not a provider, skip KYC check
    }

    const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
    const kycStatus = await resolveProviderKycStatus({
      user: req.user,
      providerId: req.user.id,
    });

    if (!isKycApproved(kycStatus)) {
      return res.status(403).json({ 
        message: "KYC verification required",
        reason: "You must complete and get approved for KYC verification before you can accept bookings or publish services.",
        kycStatus,
        needsAction: "Please complete your KYC verification in the Verification page."
      });
    }

    next();
  } catch (error) {
    console.error("KYC verification check error:", error);
    return res.status(500).json({ message: "Failed to verify KYC status" });
  }
}

// ----------------------------------------------
// EXPORTS (ALIASES FOR CLARITY & PROPOSAL ALIGNMENT)
// ----------------------------------------------
module.exports = {
  authGuard,
  roleGuard,

  // aliases (same logic, clearer naming)
  requireAuth: authGuard,
  requireRole: (role) => roleGuard([role]),
  
  // Additional aliases for admin routes
  authenticate: authGuard,
  requireAdmin,
  authGuardFromQuery,
  
  // KYC verification guard (Phase 2A)
  requireVerifiedProvider,
};
