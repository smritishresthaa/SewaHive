import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import { 
  HiBell, 
  HiMapPin, 
  HiCheckCircle, 
  HiXCircle,
  HiInformationCircle
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";

export default function ProviderSettings() {
  const { user, updateUser } = useAuth();

  // Local KYC status state (directly polled from backend)
  const [kycStatus, setKycStatus] = useState(normalizeKycStatus(user?.kycStatus));

  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.providerDetails?.notificationsEnabled || false
  );
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Coverage area settings
  const [coverageArea, setCoverageArea] = useState({
    lat: user?.providerDetails?.coverage?.lat || "",
    lng: user?.providerDetails?.coverage?.lng || "",
    radiusKm: user?.providerDetails?.coverage?.radiusKm || 5,
  });
  const [savingCoverage, setSavingCoverage] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Update local state when user changes
  useEffect(() => {
    setNotificationsEnabled(user?.providerDetails?.notificationsEnabled || false);
    setCoverageArea({
      lat: user?.providerDetails?.coverage?.lat || "",
      lng: user?.providerDetails?.coverage?.lng || "",
      radiusKm: user?.providerDetails?.coverage?.radiusKm || 5,
    });
    setKycStatus(normalizeKycStatus(user?.kycStatus));
  }, [user]);

  // Refresh KYC from verification record (same source used by Emergency Toggle)
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

  // Load services on mount
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

  /* ===============================
     NOTIFICATION TOGGLE
  =============================== */
  async function handleNotificationToggle() {
    setSavingNotifications(true);
    try {
      const newValue = !notificationsEnabled;
      const res = await api.patch("/providers/notifications", { enabled: newValue });
      
      setNotificationsEnabled(newValue);

      const emergencyAvailable =
        res?.data?.emergencyAvailable ?? user?.providerDetails?.emergencyAvailable;
      
      // Update user context
      const updatedUser = {
        ...user,
        providerDetails: {
          ...user.providerDetails,
          notificationsEnabled: newValue,
          emergencyAvailable,
        },
      };
      updateUser(updatedUser);

      if (!newValue && res?.data?.emergencyDisabled) {
        toast.success("Notifications disabled. Emergency mode turned off.");
      } else {
        toast.success(newValue ? "Notifications enabled!" : "Notifications disabled");
      }
    } catch (err) {
      toast.error("Failed to update notification settings");
    } finally {
      setSavingNotifications(false);
    }
  }

  /* ===============================
     GET CURRENT LOCATION
  =============================== */
  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoverageArea({
          ...coverageArea,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGettingLocation(false);
        toast.success("Location detected! 📍");
      },
      (error) => {
        setGettingLocation(false);
        toast.error("Unable to get location. Please enter manually.");
        console.error(error);
      }
    );
  }

  /* ===============================
     SAVE COVERAGE AREA
  =============================== */
  async function handleSaveCoverage() {
    // Validation
    if (!coverageArea.lat || !coverageArea.lng) {
      toast.error("Please provide latitude and longitude");
      return;
    }

    if (coverageArea.radiusKm < 1 || coverageArea.radiusKm > 100) {
      toast.error("Radius must be between 1 and 100 km");
      return;
    }

    setSavingCoverage(true);
    try {
      const res = await api.patch("/providers/coverage", {
        lat: parseFloat(coverageArea.lat),
        lng: parseFloat(coverageArea.lng),
        radiusKm: parseFloat(coverageArea.radiusKm),
      });

      const emergencyAvailable =
        res?.data?.emergencyAvailable ?? user?.providerDetails?.emergencyAvailable;

      // Update user context
      const updatedUser = {
        ...user,
        providerDetails: {
          ...user.providerDetails,
          coverage: {
            lat: parseFloat(coverageArea.lat),
            lng: parseFloat(coverageArea.lng),
            radiusKm: parseFloat(coverageArea.radiusKm),
          },
          emergencyAvailable,
        },
      };
      updateUser(updatedUser);

      if (res?.data?.emergencyDisabled) {
        toast.success("Coverage updated. Emergency mode turned off.");
      } else {
        toast.success("Coverage area updated!");
      }
    } catch (err) {
      toast.error("Failed to update coverage area");
    } finally {
      setSavingCoverage(false);
    }
  }

  const isCoverageConfigured =
    user?.providerDetails?.coverage?.lat !== undefined &&
    user?.providerDetails?.coverage?.lat !== null &&
    user?.providerDetails?.coverage?.lng !== undefined &&
    user?.providerDetails?.coverage?.lng !== null &&
    user?.providerDetails?.coverage?.radiusKm > 0;

  const kycApproved = isKycApproved(kycStatus);

  const hasEmergencyEligibleService = useMemo(() => {
    return services.some((service) => {
      const category = service?.categoryId;
      return (
        service?.isActive === true &&
        service?.adminDisabled !== true &&
        Number(service?.emergencyPrice || 0) > 0 &&
        category?.emergencyServiceAllowed === true &&
        category?.status === "active"
      );
    });
  }, [services]);

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your notification preferences and service coverage area
          </p>
        </div>

        <div className="space-y-6">
          {/* ===============================
              NOTIFICATION SETTINGS
          =============================== */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <HiBell className="text-2xl text-emerald-600" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Notifications
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Receive instant notifications for new booking requests, especially emergency bookings
                </p>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <HiCheckCircle className="text-2xl text-green-600" />
                    ) : (
                      <HiXCircle className="text-2xl text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {notificationsEnabled ? "Enabled" : "Disabled"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {notificationsEnabled 
                          ? "You'll receive booking alerts" 
                          : "You won't receive notifications"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNotificationToggle}
                    disabled={savingNotifications}
                    className={`
                      relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                      ${notificationsEnabled ? "bg-emerald-600" : "bg-gray-300"}
                      ${savingNotifications ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                        ${notificationsEnabled ? "translate-x-7" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {!notificationsEnabled && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <HiInformationCircle className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      Enable notifications to receive emergency booking requests and improve your response time
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===============================
              COVERAGE AREA SETTINGS
          =============================== */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <HiMapPin className="text-2xl text-blue-600" />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Service Coverage Area
                </h2>
                <p className="text-gray-600 text-sm">
                  Set your service location and radius for emergency bookings. 
                  Only requests within this area will be assigned to you.
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {isCoverageConfigured ? (
                  <HiCheckCircle className="text-2xl text-green-600" />
                ) : (
                  <HiXCircle className="text-2xl text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {isCoverageConfigured ? "Coverage Configured" : "Not Configured"}
                  </p>
                  {isCoverageConfigured && (
                    <p className="text-sm text-gray-600">
                      Serving within {user.providerDetails.coverage.radiusKm} km radius
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Center Location
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={gettingLocation}
                  className="mb-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {gettingLocation ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                      Getting location...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <HiMapPin />
                      Use Current Location
                    </span>
                  )}
                </button>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="27.7172"
                      value={coverageArea.lat}
                      onChange={(e) => setCoverageArea({ ...coverageArea, lat: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="85.3240"
                      value={coverageArea.lng}
                      onChange={(e) => setCoverageArea({ ...coverageArea, lng: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coverage Radius: {coverageArea.radiusKm} km
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={coverageArea.radiusKm}
                  onChange={(e) => setCoverageArea({ ...coverageArea, radiusKm: e.target.value })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                </div>
              </div>

              {coverageArea.lat && coverageArea.lng && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <p className="text-sm text-blue-800">
                    <strong>Preview:</strong> You'll receive emergency bookings from clients 
                    within {coverageArea.radiusKm} km
                  </p>
                  <p className="text-xs font-mono text-blue-700">
                    📍 Lat: {parseFloat(coverageArea.lat).toFixed(6)} | Lng: {parseFloat(coverageArea.lng).toFixed(6)}
                  </p>
                  <p className="text-xs text-blue-600">
                    (Stored as: lat={coverageArea.lat}, lng={coverageArea.lng})
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveCoverage}
                disabled={savingCoverage || !coverageArea.lat || !coverageArea.lng}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCoverage ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Coverage Area"
                )}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border border-emerald-200">
            <div className="flex items-start gap-3">
              <HiInformationCircle className="text-2xl text-emerald-600 flex-shrink-0 mt-1" />
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-medium text-gray-900">Emergency Mode Requirements:</p>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    {kycApproved ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                    KYC approved
                  </li>
                  <li className="flex items-center gap-2">
                    {notificationsEnabled ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                    Notifications enabled (in-app, email, or SMS)
                  </li>
                  <li className="flex items-center gap-2">
                    {isCoverageConfigured ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                    Coverage area configured
                  </li>
                  <li className="flex items-center gap-2">
                    {hasEmergencyEligibleService ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                    Active emergency-eligible service
                  </li>
                </ul>
                <p className="text-xs text-gray-600 mt-3">
                  Complete all requirements to enable emergency mode and receive urgent booking requests.
                </p>
                {loadingServices && (
                  <p className="text-xs text-gray-500 mt-2">Checking your services...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
