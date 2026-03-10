import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import {
  HiBell,
  HiMapPin,
  HiCheckCircle,
  HiXCircle,
  HiInformationCircle,
  HiShieldCheck,
  HiClock,
  HiExclamationCircle,
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";

/* ─── Inline Spinner ──────────────────────────────────────────────────────── */
function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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
  );
}

/* ─── Pill Toggle Switch ──────────────────────────────────────────────────── */
function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full p-1 overflow-hidden
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2
        ${enabled ? "bg-emerald-500" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
        `}
        style={{ transform: enabled ? "translateX(28px)" : "translateX(0px)" }}
      />
    </button>
  );
}

/* ─── KYC Status Banner ───────────────────────────────────────────────────── */
function KycBanner({ kycStatus }) {
  const normalized = normalizeKycStatus(kycStatus);

  const variants = {
    approved: {
      wrap: "bg-emerald-50 border-emerald-200",
      titleCls: "text-emerald-800",
      descCls: "text-emerald-600",
      iconCls: "text-emerald-600",
      Icon: HiShieldCheck,
      title: "Identity Verified",
      desc: "Your KYC has been approved. You are eligible to enable emergency mode.",
    },
    pending_review: {
      wrap: "bg-amber-50 border-amber-200",
      titleCls: "text-amber-800",
      descCls: "text-amber-600",
      iconCls: "text-amber-500",
      Icon: HiClock,
      title: "KYC Under Review",
      desc: "Your documents are currently under review. You will be notified when approved.",
    },
    rejected: {
      wrap: "bg-red-50 border-red-200",
      titleCls: "text-red-800",
      descCls: "text-red-600",
      iconCls: "text-red-500",
      Icon: HiXCircle,
      title: "KYC Rejected",
      desc: "Verification was not successful. Please resubmit with corrected documents.",
    },
    needs_correction: {
      wrap: "bg-red-50 border-red-200",
      titleCls: "text-red-800",
      descCls: "text-red-600",
      iconCls: "text-red-500",
      Icon: HiExclamationCircle,
      title: "KYC Needs Correction",
      desc: "Some documents require correction. Please review your submission and resubmit.",
    },
    not_submitted: {
      wrap: "bg-gray-50 border-gray-200",
      titleCls: "text-gray-700",
      descCls: "text-gray-500",
      iconCls: "text-gray-400",
      Icon: HiInformationCircle,
      title: "KYC Not Submitted",
      desc: "Complete your identity verification to unlock emergency mode features.",
    },
  };

  const v = variants[normalized] || variants.not_submitted;
  const { Icon } = v;

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${v.wrap}`}>
      <Icon className={`text-2xl flex-shrink-0 ${v.iconCls}`} />
      <div>
        <p className={`font-semibold text-sm ${v.titleCls}`}>{v.title}</p>
        <p className={`text-xs mt-0.5 ${v.descCls}`}>{v.desc}</p>
      </div>
    </div>
  );
}

/* ─── Coverage Map Preview (raw Leaflet, matches LocationPicker pattern) ──── */
function CoverageMapPreview({ lat, lng, radiusKm }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!parsedLat || !parsedLng) return;

    function initMap() {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView(
          [parsedLat, parsedLng],
          12
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapInstance.current);
      } else {
        mapInstance.current.setView([parsedLat, parsedLng], 12);
      }

      if (markerRef.current) mapInstance.current.removeLayer(markerRef.current);
      if (circleRef.current) mapInstance.current.removeLayer(circleRef.current);

      markerRef.current = L.marker([parsedLat, parsedLng])
        .addTo(mapInstance.current)
        .bindPopup("Coverage Center");

      circleRef.current = L.circle([parsedLat, parsedLng], {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        weight: 2,
        radius: parseFloat(radiusKm) * 1000,
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
    }

    if (!window.L) {
      if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      if (!document.querySelector('script[src*="leaflet@1.9.4"]')) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        let poll = setInterval(() => {
          if (window.L) { clearInterval(poll); initMap(); }
        }, 100);
        return () => clearInterval(poll);
      }
    } else {
      initMap();
    }
  }, [lat, lng, radiusKm]);

  return (
    <div
      className="mt-1 rounded-xl overflow-hidden border border-emerald-200 shadow-sm"
      style={{ height: 220 }}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

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
        toast.success("Location detected!");
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
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your notification preferences and service coverage area.
          </p>
        </div>

        {/* KYC Status Banner */}
        <KycBanner kycStatus={kycStatus} />

        {/* ── Notification Settings ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <HiBell className="text-xl text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Receive instant alerts for new booking requests and emergency calls.
              </p>

              <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {notificationsEnabled ? (
                    <HiCheckCircle className="text-xl text-emerald-600" />
                  ) : (
                    <HiXCircle className="text-xl text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {notificationsEnabled ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {notificationsEnabled
                        ? "You will receive booking and emergency alerts."
                        : "You will not receive any notifications."}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={notificationsEnabled}
                  onChange={handleNotificationToggle}
                  disabled={savingNotifications}
                />
              </div>

              {!notificationsEnabled && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <HiInformationCircle className="text-amber-500 text-lg flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Enable notifications to receive emergency booking requests and improve your response time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Coverage Area ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <HiMapPin className="text-xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Service Coverage Area</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Define your service location and radius. Only nearby emergency requests will be assigned to you.
              </p>
            </div>
          </div>

          {/* Coverage status strip */}
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-5">
            {isCoverageConfigured ? (
              <HiCheckCircle className="text-xl text-emerald-600 flex-shrink-0" />
            ) : (
              <HiXCircle className="text-xl text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isCoverageConfigured ? "Coverage Configured" : "Not Configured"}
              </p>
              {isCoverageConfigured && (
                <p className="text-xs text-gray-500">
                  Serving within {user.providerDetails.coverage.radiusKm} km of your set location.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {/* Get location button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Center Location
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gettingLocation ? (
                  <>
                    <Spinner className="h-4 w-4 text-emerald-600" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <HiMapPin className="text-base" />
                    Use Current Location
                  </>
                )}
              </button>
            </div>

            {/* Lat / Lng inputs */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="27.7172"
                  value={coverageArea.lat}
                  onChange={(e) =>
                    setCoverageArea({ ...coverageArea, lat: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="85.3240"
                  value={coverageArea.lng}
                  onChange={(e) =>
                    setCoverageArea({ ...coverageArea, lng: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                />
              </div>
            </div>

            {/* Radius slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Coverage Radius
                </label>
                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  {coverageArea.radiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={coverageArea.radiusKm}
                onChange={(e) =>
                  setCoverageArea({ ...coverageArea, radiusKm: e.target.value })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Inline map preview */}
            {coverageArea.lat && coverageArea.lng && (
              <CoverageMapPreview
                lat={coverageArea.lat}
                lng={coverageArea.lng}
                radiusKm={coverageArea.radiusKm}
              />
            )}

            {/* Save button */}
            <button
              onClick={handleSaveCoverage}
              disabled={savingCoverage || !coverageArea.lat || !coverageArea.lng}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingCoverage ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  Saving...
                </>
              ) : (
                "Save Coverage Area"
              )}
            </button>
          </div>
        </div>

        {/* ── Emergency Mode Requirements summary ───────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HiInformationCircle className="text-xl text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900">
              Emergency Mode Requirements
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { met: kycApproved, label: "KYC approved" },
              { met: notificationsEnabled, label: "Notifications enabled" },
              { met: isCoverageConfigured, label: "Coverage area configured" },
              { met: hasEmergencyEligibleService, label: "Active emergency-eligible service" },
            ].map(({ met, label }) => (
              <div
                key={label}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white ${
                  met ? "border-emerald-200" : "border-gray-200"
                }`}
              >
                {met ? (
                  <HiCheckCircle className="text-lg text-emerald-600 flex-shrink-0" />
                ) : (
                  <HiXCircle className="text-lg text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm ${met ? "text-gray-800" : "text-gray-400"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {loadingServices && (
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <Spinner className="h-3 w-3 text-gray-400" />
              Checking your services...
            </p>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Complete all four requirements to enable emergency mode on the Emergency Availability page.
          </p>
        </div>

      </div>
    </ProviderLayout>
  );
}
