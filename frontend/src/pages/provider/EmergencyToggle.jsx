import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import {
  HiBolt,
  HiBellAlert,
  HiExclamationTriangle,
  HiCheckCircle,
  HiXCircle,
  HiShieldCheck,
  HiBell,
  HiMapPin,
  HiWrenchScrewdriver,
  HiCog6Tooth,
  HiLightBulb,
  HiInformationCircle,
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";
import { diagnoseAllServices } from "../../utils/emergencyDiagnostics";

export default function ProviderEmergency() {
  const { user, updateUser, fetchUser } = useAuth();
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [kycStatus, setKycStatus] = useState(normalizeKycStatus(user?.kycStatus));

  // Sync kycStatus with user object whenever user updates
  useEffect(() => {
    setKycStatus(normalizeKycStatus(user?.kycStatus));
  }, [user?.kycStatus]);

  // Refresh user data on component mount to get latest KYC status
  useEffect(() => {
    if (fetchUser) {
      fetchUser();
    }
  }, [fetchUser]);

  // Refresh KYC status from verification record without hammering /auth/me
  useEffect(() => {
    let isMounted = true;

    async function loadKycStatus() {
      try {
        const res = await api.get("/providers/verification");
        if (!isMounted) return;

        const verificationStatus = res.data?.verification?.status;
        const nextStatus = normalizeKycStatus(verificationStatus || user?.kycStatus);
        setKycStatus(nextStatus);
      } catch (err) {
        if (isMounted) {
          setKycStatus(normalizeKycStatus(user?.kycStatus));
        }
      }
    }

    loadKycStatus();

    return () => {
      isMounted = false;
    };
  }, [user?.kycStatus]);

  useEffect(() => {
    setEmergencyAvailable(user?.providerDetails?.emergencyAvailable || false);
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadServices() {
      setLoadingServices(true);
      try {
        const res = await api.get("/services/my-services");
        if (isMounted) {
          setServices(res.data?.services || []);
        }
      } catch (err) {
        if (isMounted) {
          setServices([]);
        }
        console.error("Failed to load services", err);
      } finally {
        if (isMounted) {
          setLoadingServices(false);
        }
      }
    }

    if (user?.role === "provider") {
      loadServices();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const kycApproved = isKycApproved(kycStatus);
  const hasNotifications = !!user?.providerDetails?.notificationsEnabled;
  const hasCoverage =
    user?.providerDetails?.coverage?.lat !== undefined &&
    user?.providerDetails?.coverage?.lat !== null &&
    user?.providerDetails?.coverage?.lng !== undefined &&
    user?.providerDetails?.coverage?.lng !== null &&
    user?.providerDetails?.coverage?.radiusKm > 0;

  const hasEmergencyEligibleService = useMemo(() => {
    return services.some((service) => {
      return (
        service?.isActive === true &&
        service?.adminDisabled !== true &&
        Number(service?.emergencyPrice || 0) > 0
      );
    });
  }, [services]);

  const canEnableEmergency =
    kycApproved &&
    hasNotifications &&
    hasCoverage &&
    hasEmergencyEligibleService &&
    !loadingServices;

  async function toggleEmergency() {
    const newValue = !emergencyAvailable;
    
    // If turning ON, check requirements first
    if (newValue) {
      const missingRequirements = [];
      
      if (!kycApproved) {
        missingRequirements.push("KYC approval required");
      }

      if (!hasNotifications) {
        missingRequirements.push("Enable notifications");
      }
      
      if (!hasCoverage) {
        missingRequirements.push("Configure service coverage area");
      }

      if (!hasEmergencyEligibleService) {
        missingRequirements.push("Add an active emergency-eligible service");
      }

      if (loadingServices) {
        missingRequirements.push("Checking services, try again in a moment");
      }

      if (missingRequirements.length > 0) {
        toast.error(
          <div>
            <p className="font-semibold">Cannot enable emergency mode</p>
            <p className="text-sm mt-1">Missing requirements:</p>
            <ul className="text-sm list-disc pl-4 mt-1">
              {missingRequirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 }
        );
        return;
      }
    }
    
    setSaving(true);
    try {
      await api.post("/providers/toggle-emergency", { value: newValue });
      
      // Update local state
      setEmergencyAvailable(newValue);
      
      // Update user context
      updateUser({
        ...user,
        providerDetails: {
          ...user.providerDetails,
          emergencyAvailable: newValue,
        },
      });

      toast.success(
        newValue
          ? "Emergency mode activated"
          : "Emergency mode deactivated"
      );
    } catch (err) {
      const errorMsg = err?.response?.data?.errors?.join(", ") || 
                      err?.response?.data?.message || 
                      "Failed to update emergency availability";
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Prerequisite items for the checklist
  const prerequisites = [
    {
      met: kycApproved,
      Icon: HiShieldCheck,
      label: "Identity Verified",
      desc: "KYC approved by admin",
    },
    {
      met: hasNotifications,
      Icon: HiBell,
      label: "Notifications On",
      desc: "In-app, email, or SMS enabled",
    },
    {
      met: hasCoverage,
      Icon: HiMapPin,
      label: "Coverage Set",
      desc: user?.providerDetails?.coverage?.radiusKm
        ? `${user.providerDetails.coverage.radiusKm} km radius configured`
        : "No coverage area configured",
    },
    {
      met: hasEmergencyEligibleService,
      Icon: HiWrenchScrewdriver,
      label: "Emergency Service",
      desc: "Active service with emergency price",
    },
  ];

  const allMet = canEnableEmergency;

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Availability</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toggle your availability for urgent, last-minute service requests.
          </p>
        </div>

        {/* ── Main Toggle Card ─────────────────────────────────────────── */}
        <div
          className={`relative rounded-2xl border-2 p-8 transition-all duration-300 ${
            emergencyAvailable
              ? "border-emerald-400 shadow-sm"
              : allMet
              ? "bg-white border-emerald-300 shadow-sm"
              : "bg-white border-gray-200 shadow-sm opacity-80"
          }`}
          style={
            emergencyAvailable
              ? { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }
              : undefined
          }
        >
          {/* Status row */}
          <div className="flex items-center justify-between gap-6">
            {/* Bolt icon + title */}
            <div className="flex items-center gap-5 min-w-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                  emergencyAvailable ? "bg-white/20" : allMet ? "bg-emerald-50" : "bg-gray-100"
                }`}
              >
                <HiBolt
                  className={`text-3xl transition-colors duration-300 ${
                    emergencyAvailable ? "text-white" : allMet ? "text-emerald-500" : "text-gray-400"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <h2 className={`text-xl font-bold ${emergencyAvailable ? "text-white" : "text-gray-900"}`}>
                  {emergencyAvailable ? "You're Live" : "Currently Offline"}
                </h2>
                <p className={`text-sm mt-0.5 ${emergencyAvailable ? "text-white/80" : "text-gray-500"}`}>
                  {emergencyAvailable
                    ? "Accepting emergency requests from nearby clients."
                    : allMet
                    ? "All requirements met — ready to go live."
                    : "Complete the requirements below to enable emergency mode."}
                </p>
              </div>
            </div>

            {/* Big pill toggle — 40 px height, overflow-hidden keeps thumb clipped */}
            <div
              title={!allMet && !emergencyAvailable ? "Complete all prerequisites first" : undefined}
              className="flex-shrink-0"
            >
              <button
                type="button"
                onClick={toggleEmergency}
                disabled={saving || (!emergencyAvailable && !canEnableEmergency)}
                aria-checked={emergencyAvailable}
                role="switch"
                className={`
                  relative inline-flex items-center h-10 w-20 rounded-full p-1 overflow-hidden
                  transition-colors duration-300 focus:outline-none
                  ${emergencyAvailable ? "bg-emerald-800/40" : "bg-gray-300"}
                  ${saving || (!emergencyAvailable && !canEnableEmergency) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span
                  className={`
                    z-10 h-8 w-8 rounded-full bg-white shadow-md
                    flex items-center justify-center
                    transition-transform duration-300 ease-in-out
                  `}
                  style={{ transform: emergencyAvailable ? "translateX(40px)" : "translateX(0px)" }}
                >
                  {saving ? (
                    <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <HiBolt className={`text-sm ${emergencyAvailable ? "text-emerald-500" : "text-gray-400"}`} />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Active notice strip */}
          {emergencyAvailable && (
            <div className="mt-6 flex items-start gap-3 bg-white/15 rounded-xl p-4">
              <HiBellAlert className="text-xl text-white mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white text-sm">You will receive notifications</p>
                <p className="text-xs text-white/75 mt-0.5">
                  Emergency requests from nearby clients will be delivered instantly.
                </p>
              </div>
            </div>
          )}

          {/* Incomplete prerequisites banner */}
          {!emergencyAvailable && !allMet && (
            <div className="mt-5 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <HiInformationCircle className="text-amber-500 text-lg flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Complete all prerequisites below before you can enable emergency mode.
              </p>
            </div>
          )}
        </div>

        {/* ── Prerequisite Checklist ────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
            Prerequisites
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {prerequisites.map(({ met, Icon, label, desc }) => (
              <div
                key={label}
                className={`
                  flex items-start gap-4 p-4 rounded-2xl border bg-white transition-colors
                  ${met ? "border-emerald-200" : "border-gray-200"}
                `}
              >
                <div
                  className={`
                    h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${met ? "bg-emerald-50" : "bg-gray-100"}
                  `}
                >
                  <Icon
                    className={`text-lg ${met ? "text-emerald-600" : "text-gray-400"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        met ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {label}
                    </p>
                    {met ? (
                      <HiCheckCircle className="text-emerald-500 text-lg flex-shrink-0" />
                    ) : (
                      <HiXCircle className="text-gray-300 text-lg flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {loadingServices && (
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5 px-1">
              <svg
                className="animate-spin h-3 w-3 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Checking your services...
            </p>
          )}
        </div>

        {/* ── Service Diagnostics + Info Cards ─────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagnostics panel when eligible service check fails */}
          {!hasEmergencyEligibleService && services.length > 0 && (
            <DiagnosticsPanel services={services} />
          )}

          {/* How It Works */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <HiBolt className="text-emerald-500 text-xl" />
              <h3 className="font-semibold text-gray-900 text-sm">
                How Emergency Mode Works
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm text-gray-600">
              {[
                "Clients can send urgent service requests directly to you.",
                "You receive instant push notifications for each request.",
                "Your profile gets higher priority in search results.",
                "Earn emergency pricing fees set on your service.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <HiCheckCircle className="text-emerald-400 text-base flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <HiExclamationTriangle className="text-amber-500 text-xl" />
              <h3 className="font-semibold text-amber-900 text-sm">
                Important Notice
              </h3>
            </div>
            <ul className="space-y-2.5 text-sm text-amber-800">
              {[
                "Only activate when you are truly available to take requests.",
                "Response time directly affects your trust score and rating.",
                "Declining too many requests may lower your provider ranking.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </ProviderLayout>
  );
}

/**
 * Diagnostic Panel — shows which services fail emergency eligibility and why.
 */
function DiagnosticsPanel({ services }) {
  const diagnostics = diagnoseAllServices(services);

  if (diagnostics.services.length === 0) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <HiBolt className="text-red-500 text-xl" />
          <h3 className="font-semibold text-red-900 text-sm">No Services Found</h3>
        </div>
        <p className="text-sm text-red-800 mb-4">
          Create a service to enable emergency mode. Requirements:
        </p>
        <div className="space-y-1.5 text-sm text-red-700 bg-white/60 p-3 rounded-xl">
          {[
            "Service must be Active",
            "Emergency Price must be greater than 0 NPR",
            "Category must allow emergency (admin setting)",
            "Category must be Active",
          ].map((req) => (
            <p key={req} className="flex items-center gap-2">
              <HiCheckCircle className="text-red-400 flex-shrink-0" />
              {req}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const failingServices = diagnostics.services.filter((s) => !s.diagnosis.isEligible);
  if (failingServices.length === 0) return null;

  return (
    <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <HiExclamationTriangle className="text-red-500 text-xl" />
        <h3 className="font-semibold text-red-900 text-sm">
          Why Your Services Are Not Emergency-Eligible
        </h3>
      </div>

      <div className="space-y-4">
        {failingServices.map((item, serviceIdx) => (
          <div
            key={serviceIdx}
            className="bg-white/70 p-4 rounded-xl border border-red-200"
          >
            <p className="font-medium text-red-900 text-sm mb-3 flex items-center gap-2">
              <HiWrenchScrewdriver className="text-red-400" />
              {item.service?.title || "Unnamed Service"}
            </p>

            <div className="space-y-2 text-sm">
              {item.diagnosis.reasons.map((reason, reasonIdx) => {
                const isFailing = reason.status === "❌";
                return (
                  <div
                    key={reasonIdx}
                    className={`flex items-start gap-2 ${
                      isFailing ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {isFailing ? (
                      <HiXCircle className="flex-shrink-0 mt-0.5 text-base" />
                    ) : (
                      <HiCheckCircle className="flex-shrink-0 mt-0.5 text-base" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{reason.check}</p>
                      <p className="text-xs opacity-75 mt-0.5">
                        Required: {reason.required} | Current: {reason.actual}
                      </p>
                      {reason.hint && (
                        <p className="text-xs mt-1 italic bg-yellow-50 text-yellow-800 px-2 py-1 rounded-lg flex items-start gap-1">
                          <HiLightBulb className="flex-shrink-0 mt-0.5" />
                          {reason.hint}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick Fix Guide */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <p className="font-semibold text-blue-900 text-sm mb-2 flex items-center gap-2">
            <HiCog6Tooth className="text-blue-500" />
            Quick Fix
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <strong>Provider &rarr; My Services</strong></li>
            <li>Click <strong>Edit</strong> on the service above</li>
            <li>Enter an <strong>Emergency Price</strong> (e.g., 500+ NPR)</li>
            <li>Click <strong>Update Service</strong></li>
            <li>Return here and reload — the checkmark should appear</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2 italic">
            Note: If the category still fails, contact admin to enable emergency for your category.
          </p>
        </div>
      </div>
    </div>
  );
}
