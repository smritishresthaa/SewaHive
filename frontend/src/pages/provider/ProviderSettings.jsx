import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  HiEye,
  HiEyeSlash,
  HiExclamationTriangle,
  HiTrash,
  HiPower,
  HiBolt,
  HiWrenchScrewdriver,
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
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
    <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${v.wrap}`}>
      <Icon className={`text-2xl flex-shrink-0 ${v.iconCls}`} />
      <div>
        <p className={`text-sm font-semibold ${v.titleCls}`}>{v.title}</p>
        <p className={`mt-0.5 text-xs ${v.descCls}`}>{v.desc}</p>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {show ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Coverage Map Preview ────────────────────────────────────────────────── */
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
        const poll = setInterval(() => {
          if (window.L) {
            clearInterval(poll);
            initMap();
          }
        }, 100);
        return () => clearInterval(poll);
      }
    } else {
      initMap();
    }
  }, [lat, lng, radiusKm]);

  return (
    <div
      className="mt-1 overflow-hidden rounded-xl border border-emerald-200 shadow-sm"
      style={{ height: 220 }}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

function isEmergencyEligibleService(service) {
  const category = service?.categoryId;

  return (
    service?.isActive === true &&
    service?.adminDisabled !== true &&
    Number(service?.emergencyPrice || 0) > 0 &&
    category?.emergencyServiceAllowed === true &&
    category?.status === "active"
  );
}

export default function ProviderSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [kycStatus, setKycStatus] = useState(normalizeKycStatus(user?.kycStatus));

  // Notification settings
  const [notifications, setNotifications] = useState({
    bookingUpdates: user?.settings?.notifications?.bookingUpdates ?? true,
    messages: user?.settings?.notifications?.messages ?? true,
    reviews: user?.settings?.notifications?.reviews ?? true,
    email: user?.settings?.notifications?.email ?? true,
    emergencyAlerts: user?.settings?.notifications?.emergencyAlerts ?? true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Services
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

  // Security
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Danger zone
  const [dangerAction, setDangerAction] = useState("");
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);

  const isGoogleOnly = useMemo(() => {
    return !!user?.googleId && !user?.passwordHash;
  }, [user]);

  useEffect(() => {
    setCoverageArea({
      lat: user?.providerDetails?.coverage?.lat || "",
      lng: user?.providerDetails?.coverage?.lng || "",
      radiusKm: user?.providerDetails?.coverage?.radiusKm || 5,
    });

    setNotifications({
      bookingUpdates: user?.settings?.notifications?.bookingUpdates ?? true,
      messages: user?.settings?.notifications?.messages ?? true,
      reviews: user?.settings?.notifications?.reviews ?? true,
      email: user?.settings?.notifications?.email ?? true,
      emergencyAlerts: user?.settings?.notifications?.emergencyAlerts ?? true,
    });

    setKycStatus(normalizeKycStatus(user?.kycStatus));
  }, [user]);

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

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      const res = await api.patch("/account/notifications", {
        notifications,
      });

      const updatedNotifications = res.data?.notifications || notifications;
      const providerNotificationsEnabled =
        res.data?.providerNotificationsEnabled ??
        Object.values(updatedNotifications).some(Boolean);

      const emergencyAvailable =
        res?.data?.emergencyAvailable ?? user?.providerDetails?.emergencyAvailable;

      updateUser({
        settings: {
          notifications: updatedNotifications,
        },
        providerDetails: {
          ...user?.providerDetails,
          notificationsEnabled: providerNotificationsEnabled,
          emergencyAvailable,
        },
      });

      if (!providerNotificationsEnabled && res?.data?.emergencyDisabled) {
        toast.success("Notifications updated. Emergency mode turned off.");
      } else {
        toast.success("Notification settings updated");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update notifications");
    } finally {
      setSavingNotifications(false);
    }
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoverageArea((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
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

  async function handleSaveCoverage() {
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

      updateUser({
        providerDetails: {
          ...user?.providerDetails,
          coverage: {
            lat: parseFloat(coverageArea.lat),
            lng: parseFloat(coverageArea.lng),
            radiusKm: parseFloat(coverageArea.radiusKm),
          },
          emergencyAvailable,
        },
      });

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

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (form.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      toast.error("New password cannot be the same as current password");
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch("/account/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast.success("Password updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDangerSubmit() {
    if (!dangerAction) return;

    const expected = dangerAction === "deactivate" ? "DEACTIVATE" : "DELETE";

    if (dangerConfirm !== expected) {
      toast.error(`Please type ${expected} to continue`);
      return;
    }

    setDangerLoading(true);
    try {
      if (dangerAction === "deactivate") {
        await api.patch("/account/deactivate");
        toast.success("Account deactivated");
      } else {
        await api.delete("/account/delete");
        toast.success("Account deleted");
      }

      await logout();
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setDangerLoading(false);
    }
  }

  const isCoverageConfigured =
    user?.providerDetails?.coverage?.lat !== undefined &&
    user?.providerDetails?.coverage?.lat !== null &&
    user?.providerDetails?.coverage?.lng !== undefined &&
    user?.providerDetails?.coverage?.lng !== null &&
    user?.providerDetails?.coverage?.radiusKm > 0;

  const kycApproved = isKycApproved(kycStatus);
  const notificationsEnabled = Object.values(notifications).some(Boolean);
  const emergencyModeEnabled = !!user?.providerDetails?.emergencyAvailable;

  const hasEmergencyEligibleService = useMemo(() => {
    return services.some((service) => isEmergencyEligibleService(service));
  }, [services]);

  const allRequirementsMet =
    kycApproved &&
    notificationsEnabled &&
    isCoverageConfigured &&
    hasEmergencyEligibleService &&
    !loadingServices;

  const requirementItems = [
    { met: kycApproved, label: "KYC approved", Icon: HiShieldCheck },
    {
      met: notificationsEnabled,
      label: "Notifications enabled",
      Icon: HiBell,
    },
    {
      met: isCoverageConfigured,
      label: "Coverage area configured",
      Icon: HiMapPin,
    },
    {
      met: hasEmergencyEligibleService,
      label: "Active emergency-eligible service",
      Icon: HiWrenchScrewdriver,
    },
  ];

  return (
    <ProviderLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your notifications, coverage area, security, and account controls.
          </p>
        </div>

        <KycBanner kycStatus={kycStatus} />

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <HiBell className="text-xl text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Control which provider alerts and updates you want to receive.
              </p>

              <div className="mt-4 space-y-4">
                {[
                  {
                    key: "bookingUpdates",
                    title: "Booking updates",
                    desc: "Receive booking requests and booking status updates.",
                  },
                  {
                    key: "messages",
                    title: "Messages",
                    desc: "Receive alerts for new chat messages.",
                  },
                  {
                    key: "reviews",
                    title: "Reviews and service activity",
                    desc: "Receive review-related and service activity notifications.",
                  },
                  {
                    key: "email",
                    title: "Email notifications",
                    desc: "Receive important updates through email.",
                  },
                  {
                    key: "emergencyAlerts",
                    title: "Emergency alerts",
                    desc: "Receive emergency booking and urgent provider alerts.",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                  >
                    <div className="pr-4">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      enabled={!!notifications[item.key]}
                      onChange={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      disabled={savingNotifications}
                    />
                  </div>
                ))}
              </div>

              {!notificationsEnabled && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <HiInformationCircle className="mt-0.5 flex-shrink-0 text-lg text-amber-500" />
                  <p className="text-xs text-amber-800">
                    All notifications are turned off. Emergency mode may also be disabled
                    if provider notifications are required for it.
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveNotifications}
                disabled={savingNotifications}
                className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNotifications ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    Saving...
                  </>
                ) : (
                  "Save Notification Settings"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Coverage Area */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <HiMapPin className="text-xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Service Coverage Area</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Define your service location and radius. Nearby emergency requests use this.
              </p>
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3.5">
            {isCoverageConfigured ? (
              <HiCheckCircle className="flex-shrink-0 text-xl text-emerald-600" />
            ) : (
              <HiXCircle className="flex-shrink-0 text-xl text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isCoverageConfigured ? "Coverage Configured" : "Not Configured"}
              </p>
              {isCoverageConfigured && (
                <p className="text-xs text-gray-500">
                  Serving within {user?.providerDetails?.coverage?.radiusKm} km of your set
                  location.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Center Location
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Coverage Radius</label>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-600">
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
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-emerald-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>1 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            {coverageArea.lat && coverageArea.lng && (
              <CoverageMapPreview
                lat={coverageArea.lat}
                lng={coverageArea.lng}
                radiusKm={coverageArea.radiusKm}
              />
            )}

            <button
              onClick={handleSaveCoverage}
              disabled={savingCoverage || !coverageArea.lat || !coverageArea.lng}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Emergency Requirements Summary */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <HiInformationCircle className="flex-shrink-0 text-xl text-emerald-600" />
            <p className="text-sm font-semibold text-gray-900">
              Emergency Mode Requirements
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {requirementItems.map(({ met, label, Icon }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
                  met ? "border-emerald-200" : "border-gray-200"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    met ? "bg-emerald-50" : "bg-gray-100"
                  }`}
                >
                  <Icon className={`text-lg ${met ? "text-emerald-600" : "text-gray-400"}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${met ? "text-gray-800" : "text-gray-400"}`}>
                    {label}
                  </p>
                </div>

                {met ? (
                  <HiCheckCircle className="flex-shrink-0 text-lg text-emerald-600" />
                ) : (
                  <HiXCircle className="flex-shrink-0 text-lg text-gray-300" />
                )}
              </div>
            ))}
          </div>

          {loadingServices && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <Spinner className="h-3 w-3 text-gray-400" />
              Checking your services...
            </p>
          )}

          {/* Emergency mode live status */}
          <div
            className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${
              emergencyModeEnabled
                ? "border-emerald-200 bg-white"
                : "border-gray-200 bg-white"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                emergencyModeEnabled ? "bg-emerald-50" : "bg-gray-100"
              }`}
            >
              <HiBolt
                className={`text-lg ${
                  emergencyModeEnabled ? "text-emerald-600" : "text-gray-400"
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  emergencyModeEnabled ? "text-gray-900" : "text-gray-500"
                }`}
              >
                Emergency mode {emergencyModeEnabled ? "is live" : "is currently offline"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {emergencyModeEnabled
                  ? "You are currently available for urgent emergency requests."
                  : allRequirementsMet
                  ? "All requirements are met. You can turn it on from the Emergency Availability page."
                  : "Complete the requirements above, then enable it from the Emergency Availability page."}
              </p>
            </div>

            {emergencyModeEnabled ? (
              <HiCheckCircle className="flex-shrink-0 text-lg text-emerald-600" />
            ) : (
              <HiXCircle className="flex-shrink-0 text-lg text-gray-300" />
            )}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Complete all four requirements to enable emergency mode on the Emergency
            Availability page.
          </p>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <HiShieldCheck className="text-xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Update your password and protect your provider account.
              </p>
            </div>
          </div>

          {isGoogleOnly ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This account appears to use Google sign-in only. Password changes are
              not available here.
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Current Password"
                value={form.currentPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                show={showPassword.currentPassword}
                onToggle={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    currentPassword: !prev.currentPassword,
                  }))
                }
                placeholder="Enter current password"
              />

              <PasswordField
                label="New Password"
                value={form.newPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                show={showPassword.newPassword}
                onToggle={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    newPassword: !prev.newPassword,
                  }))
                }
                placeholder="Enter new password"
              />

              <PasswordField
                label="Confirm New Password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                show={showPassword.confirmPassword}
                onToggle={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    confirmPassword: !prev.confirmPassword,
                  }))
                }
                placeholder="Confirm new password"
              />

              <p className="text-xs text-gray-500">
                Use at least 8 characters. Avoid reusing your current password.
              </p>

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    Updating...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <HiExclamationTriangle className="text-xl text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                These actions affect account access and may be irreversible.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <HiPower className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Deactivate Account</h3>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Temporarily disable your account and sign out.
              </p>
              <button
                onClick={() => {
                  setDangerAction("deactivate");
                  setDangerConfirm("");
                }}
                className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
              >
                Deactivate Account
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <HiTrash className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Delete Account</h3>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Permanently mark your account as deleted and block access.
              </p>
              <button
                onClick={() => {
                  setDangerAction("delete");
                  setDangerConfirm("");
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>

          {dangerAction && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Confirm {dangerAction === "deactivate" ? "deactivation" : "deletion"}
              </p>
              <p className="mt-1 text-xs text-red-700">
                Type{" "}
                <span className="font-bold">
                  {dangerAction === "deactivate" ? "DEACTIVATE" : "DELETE"}
                </span>{" "}
                to continue.
              </p>

              <input
                value={dangerConfirm}
                onChange={(e) => setDangerConfirm(e.target.value)}
                placeholder={
                  dangerAction === "deactivate" ? "Type DEACTIVATE" : "Type DELETE"
                }
                className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={handleDangerSubmit}
                  disabled={dangerLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dangerLoading ? (
                    <>
                      <Spinner className="h-4 w-4 text-white" />
                      Processing...
                    </>
                  ) : dangerAction === "deactivate" ? (
                    "Confirm Deactivation"
                  ) : (
                    "Confirm Delete"
                  )}
                </button>

                <button
                  onClick={() => {
                    setDangerAction("");
                    setDangerConfirm("");
                  }}
                  disabled={dangerLoading}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}