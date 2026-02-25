// backend/middleware/emergencyEligibility.js
const User = require("../models/User");
const Service = require("../models/Service");
const { resolveProviderKycStatus, isKycApproved } = require("../utils/kyc");
const { isWithinCoverage } = require("../utils/geo");

function isEmergencyEligibleService(service) {
  if (!service) return false;

  return (
    service.isActive === true &&
    service.adminDisabled !== true &&
    Number(service.emergencyPrice || 0) > 0
  );
}

function hasValidCoverage(coverage) {
  const lat = Number(coverage?.lat);
  const lng = Number(coverage?.lng);
  const radiusKm = Number(coverage?.radiusKm);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(radiusKm) &&
    radiusKm > 0
  );
}

async function hasEmergencyEligibleService(providerId) {
  const services = await Service.find({
    providerId,
    isActive: true,
    adminDisabled: { $ne: true },
    emergencyPrice: { $gt: 0 },
  });

  return services.some((service) => isEmergencyEligibleService(service));
}

async function getEmergencyToggleEligibility(provider) {
  const errors = [];

  if (!provider || provider.role !== "provider") {
    return { ok: false, errors: ["Provider not found"], kycStatus: null };
  }

  const kycStatus = await resolveProviderKycStatus({
    user: provider,
    providerId: provider._id,
  });

  if (!isKycApproved(kycStatus)) {
    errors.push("KYC must be approved to enable emergency mode");
  }

  if (!provider.providerDetails?.notificationsEnabled) {
    errors.push("Notifications must be enabled for emergency mode");
  }

  const coverage = provider.providerDetails?.coverage;
  if (!hasValidCoverage(coverage)) {
    errors.push("Service coverage (lat/lng + radius) must be configured");
  }

  const eligibleService = await hasEmergencyEligibleService(provider._id);
  if (!eligibleService) {
    errors.push("At least one active emergency-eligible service is required");
  }

  return { ok: errors.length === 0, errors, kycStatus };
}

async function getEmergencyRequestEligibility({ providerId, serviceId, location }) {
  const errors = [];

  if (!providerId) {
    return { ok: false, errors: ["Provider ID is required"] };
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== "provider") {
    return { ok: false, errors: ["Provider not found"], kycStatus: null };
  }

  const kycStatus = await resolveProviderKycStatus({
    user: provider,
    providerId: provider._id,
  });

  if (!isKycApproved(kycStatus)) {
    errors.push("Provider is not KYC approved");
  }

  if (!provider.providerDetails?.emergencyAvailable) {
    errors.push("Provider is not accepting emergency requests");
  }

  if (!provider.providerDetails?.notificationsEnabled) {
    errors.push("Provider notifications are disabled");
  }

  const coverage = provider.providerDetails?.coverage;
  if (!hasValidCoverage(coverage)) {
    errors.push("Provider coverage area not configured");
  }

  if (!location?.coordinates || location.coordinates.length !== 2) {
    errors.push("Client location is required");
  }

  let distanceKm = null;
  if (hasValidCoverage(coverage) && location?.coordinates) {
    const coverageCheck = isWithinCoverage(coverage, location.coordinates);
    distanceKm = coverageCheck.distance;

    if (!coverageCheck.isWithinRange) {
      errors.push(
        `Location is ${distanceKm}km away, outside provider's ${coverageCheck.maxRange}km coverage area`
      );
    }
  }

  if (!serviceId) {
    errors.push("Service ID is required");
  }

  let service = null;
  if (serviceId) {
    service = await Service.findOne({ _id: serviceId, providerId: provider._id })
      .populate("categoryId", "emergencyServiceAllowed status");

    if (!service) {
      errors.push("Service not found for provider");
    } else if (!isEmergencyEligibleService(service)) {
      errors.push("Service is not emergency eligible");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    kycStatus,
    distanceKm,
    provider,
    service,
  };
}

module.exports = {
  isEmergencyEligibleService,
  hasEmergencyEligibleService,
  getEmergencyToggleEligibility,
  getEmergencyRequestEligibility,
};
