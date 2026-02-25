import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiBolt, HiBellAlert, HiExclamationTriangle } from "react-icons/hi2";
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
          ? "Emergency mode activated ⚡"
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

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Emergency Availability
          </h1>
          <p className="text-gray-600 mt-1">
            Toggle your availability for urgent, last-minute service requests
          </p>
        </div>

        {/* Emergency Status Card */}
        <div
          className={`rounded-2xl shadow-lg p-8 mb-6 ${
            emergencyAvailable
              ? "bg-gradient-to-br from-orange-500 to-red-500 text-white"
              : "bg-white border"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  emergencyAvailable
                    ? "bg-white/20"
                    : "bg-gray-100"
                }`}
              >
                <HiBolt
                  className={`text-3xl ${
                    emergencyAvailable ? "text-white" : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <h2
                  className={`text-2xl font-bold ${
                    emergencyAvailable ? "text-white" : "text-gray-900"
                  }`}
                >
                  {emergencyAvailable ? "You're LIVE" : "Currently Offline"}
                </h2>
                <p
                  className={`text-sm mt-1 ${
                    emergencyAvailable ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  {emergencyAvailable
                    ? "Ready to accept emergency requests"
                    : "Not accepting emergency requests"}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={toggleEmergency}
              disabled={saving || (!emergencyAvailable && !canEnableEmergency)}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                emergencyAvailable
                  ? "bg-white/30"
                  : "bg-gray-300"
              } ${saving || (!emergencyAvailable && !canEnableEmergency) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                  emergencyAvailable ? "translate-x-12" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {emergencyAvailable && (
            <div className="bg-white/10 rounded-xl p-4 flex items-start gap-3">
              <HiBellAlert className="text-xl mt-0.5" />
              <div>
                <p className="font-medium">You'll receive notifications</p>
                <p className="text-sm text-white/80 mt-1">
                  Emergency requests from nearby clients will be sent to you
                  instantly
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Requirements Checklist */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-xl">✓</span>
              Requirements to Enable
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                {kycApproved ? (
                  <span className="text-green-600 text-lg">✓</span>
                ) : (
                  <span className="text-red-600 text-lg">✗</span>
                )}
                <span className={kycApproved ? "text-green-700" : "text-gray-600"}>
                  KYC approved
                </span>
              </li>
              <li className="flex items-center gap-3">
                {hasNotifications ? (
                  <span className="text-green-600 text-lg">✓</span>
                ) : (
                  <span className="text-red-600 text-lg">✗</span>
                )}
                <span className={hasNotifications ? "text-green-700" : "text-gray-600"}>
                  Notifications enabled (in-app, email, or SMS)
                </span>
              </li>
              <li className="flex items-center gap-3">
                {hasCoverage ? (
                  <span className="text-green-600 text-lg">✓</span>
                ) : (
                  <span className="text-red-600 text-lg">✗</span>
                )}
                <span className={hasCoverage ? "text-green-700" : "text-gray-600"}>
                  Service coverage area configured
                  {user?.providerDetails?.coverage?.radiusKm && (
                    <span className="text-xs ml-1">
                      ({user.providerDetails.coverage.radiusKm}km radius)
                    </span>
                  )}
                </span>
              </li>
              <li className="flex items-center gap-3">
                {hasEmergencyEligibleService ? (
                  <span className="text-green-600 text-lg">✓</span>
                ) : (
                  <span className="text-red-600 text-lg">✗</span>
                )}
                <span className={hasEmergencyEligibleService ? "text-green-700" : "text-gray-600"}>
                  Active emergency-eligible service
                </span>
              </li>
            </ul>
            {(!kycApproved || !hasNotifications || !hasCoverage || !hasEmergencyEligibleService) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  Complete these requirements to enable emergency mode
                </p>
              </div>
            )}
          </div>

          {/* Service Diagnostics - Show if emergency service check fails */}
          {!hasEmergencyEligibleService && services.length > 0 && (
            <DiagnosticsPanel services={services} />
          )}

          {/* How It Works */}
          {hasEmergencyEligibleService && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-emerald-600 text-xl">⚡</span>
                How Emergency Mode Works
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  Clients can send urgent service requests
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  You'll get instant push notifications
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  Higher priority in search results
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  Earn emergency service fees
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Additional Information Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* How It Works */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-emerald-600 text-xl">⚡</span>
              How Emergency Mode Works
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-emerald-600">•</span>
                Clients can send urgent service requests
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600">•</span>
                You'll get instant push notifications
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600">•</span>
                Higher priority in search results
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600">•</span>
                Charge emergency pricing (if set)
              </li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
              <HiExclamationTriangle className="text-xl" />
              Important Notice
            </h3>
            <ul className="space-y-3 text-sm text-amber-800">
              <li className="flex gap-2">
                <span>•</span>
                Only activate when you're truly available
              </li>
              <li className="flex gap-2">
                <span>•</span>
                Response time affects your rating
              </li>
              <li className="flex gap-2">
                <span>•</span>
                Declining too many requests may lower your score
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}

/**
 * Diagnostic Panel Component
 * Shows which services fail emergency eligibility and why
 */
function DiagnosticsPanel({ services }) {
  const diagnostics = diagnoseAllServices(services);

  if (diagnostics.services.length === 0) {
    return (
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          No Services Found
        </h3>
        <p className="text-sm text-red-800 mb-4">
          Create a service to enable emergency mode. Here's what you need:
        </p>
        <div className="space-y-2 text-sm text-red-700 bg-white/50 p-3 rounded-lg">
          <p>✓ Service must be <strong>Active</strong></p>
          <p>✓ Must have <strong>Emergency Price &gt; 0 NPR</strong></p>
          <p>✓ Category must <strong>allow emergency</strong> (admin setting)</p>
          <p>✓ Category must be <strong>Active</strong></p>
        </div>
      </div>
    );
  }

  const failingServices = diagnostics.services.filter(
    (s) => !s.diagnosis.isEligible
  );

  if (failingServices.length === 0) {
    return null; // All services pass - don't show panel
  }

  return (
    <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
      <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        Why Your Services Aren't Emergency-Eligible
      </h3>

      <div className="space-y-4">
        {failingServices.map((item, serviceIdx) => (
          <div
            key={serviceIdx}
            className="bg-white/70 p-4 rounded-lg border border-red-200"
          >
            <p className="font-medium text-red-900 mb-2">
              📋 {item.service?.title || "Unnamed Service"}
            </p>

            <div className="space-y-2 text-sm">
              {item.diagnosis.reasons.map((reason, reasonIdx) => {
                const isFailing = reason.status === "❌";
                return (
                  <div
                    key={reasonIdx}
                    className={`flex items-start gap-2 ${
                      isFailing ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    <span className="font-bold mt-0.5">{reason.status}</span>
                    <div className="flex-1">
                      <p className="font-medium">{reason.check}</p>
                      <p className="text-xs opacity-80">
                        Required: {reason.required} | Current: {reason.actual}
                      </p>
                      {reason.hint && (
                        <p className="text-xs mt-1 italic opacity-90 bg-yellow-100 px-2 py-1 rounded mt-1">
                          💡 {reason.hint}
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
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-4">
          <p className="font-medium text-blue-900 text-sm mb-2">🔧 Quick Fix:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <strong>Provider → My Services</strong></li>
            <li>Click <strong>Edit</strong> on the service above</li>
            <li>Enter an <strong>Emergency Price</strong> (e.g., 500+ NPR)</li>
            <li>Click <strong>Update Service</strong></li>
            <li>Return here and reload → ✓ should appear</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2 italic">
            Note: If category still shows ❌, contact admin to enable emergency for your category
          </p>
        </div>
      </div>
    </div>
  );
}
