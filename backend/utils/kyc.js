// backend/utils/kyc.js
const ProviderVerification = require("../models/ProviderVerification");

const KYC_STATUS_MAP = {
  submitted: "pending_review",
  under_review: "pending_review",
  needs_correction: "needs_correction",
  approved: "approved",
  rejected: "rejected",
};

function normalizeKycStatus(rawStatus) {
  if (!rawStatus) return "not_submitted";
  return KYC_STATUS_MAP[rawStatus] || rawStatus;
}

async function resolveProviderKycStatus({ user, providerId }) {
  if (!providerId) {
    return normalizeKycStatus(user?.kycStatus);
  }

  const verification = await ProviderVerification.findOne({
    providerId,
  }).sort({ createdAt: -1 });

  const verificationStatus = normalizeKycStatus(verification?.status);
  const userStatus = normalizeKycStatus(user?.kycStatus);

  if (verificationStatus !== "not_submitted") {
    return verificationStatus;
  }

  return userStatus;
}

function isKycApproved(status) {
  return status === "approved";
}

module.exports = {
  normalizeKycStatus,
  resolveProviderKycStatus,
  isKycApproved,
};
