// frontend/src/utils/kyc.js
const KYC_STATUS_MAP = {
  pending: "pending_review",
  submitted: "pending_review",
  under_review: "pending_review",
  verified: "approved",
};

export function normalizeKycStatus(status) {
  if (!status) return "not_submitted";
  return KYC_STATUS_MAP[status] || status;
}

export function isKycApproved(status) {
  return normalizeKycStatus(status) === "approved";
}

export function getKycLabel(status) {
  const normalized = normalizeKycStatus(status);
  if (normalized === "approved") return "Approved";
  if (normalized === "needs_correction") return "Needs Correction";
  if (normalized === "pending_review") return "Pending Review";
  if (normalized === "rejected") return "Rejected";
  return "Not Submitted";
}
