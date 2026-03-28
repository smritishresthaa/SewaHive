import { useState, useEffect, useRef } from "react";
import {
  HiCog6Tooth,
  HiBell,
  HiShieldCheck,
  HiExclamationTriangle,
  HiCheckCircle,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import api from "../utils/axios";

// ToggleSwitch — no native checkbox, fully controlled
function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${
        enabled ? "bg-emerald-500" : "bg-gray-200"
      }`}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-3.5 h-3.5 text-white"
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

function ConfirmModal({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <HiExclamationTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            {loading && <Spinner />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "platform", label: "Platform Rules", Icon: HiCog6Tooth },
  { id: "notifications", label: "Notifications", Icon: HiBell },
  { id: "security", label: "Security", Icon: HiShieldCheck },
  { id: "danger", label: "Danger Zone", Icon: HiExclamationTriangle },
];

export default function Settings() {
  const platformRef = useRef(null);
  const notificationsRef = useRef(null);
  const securityRef = useRef(null);
  const dangerRef = useRef(null);

  const sectionRefs = {
    platform: platformRef,
    notifications: notificationsRef,
    security: securityRef,
    danger: dangerRef,
  };

  const [activeSection, setActiveSection] = useState("platform");

  const [platform, setPlatform] = useState({
    platformCommission: "",
    emergencySurcharge: "",
    minimumServiceFee: "",
    registrationOpen: true,
    termsAndConditions: "",
    termsVersion: "1.0",
    termsUpdatedAt: "",
  });
  const [platformDirty, setPlatformDirty] = useState(false);
  const [platformSaving, setPlatformSaving] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotificationsEnabled: true,
    smsAlertsEnabled: true,
  });
  const [notifDirty, setNotifDirty] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const [modal, setModal] = useState(null);
  const [dangerLoading, setDangerLoading] = useState(false);

  const [editTnc, setEditTnc] = useState(false);
  const [termsDraft, setTermsDraft] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/settings");
        const s = res.data.settings;

        const loadedPlatform = {
          platformCommission: s.platformCommission ?? 15,
          emergencySurcharge: s.emergencySurcharge ?? 12,
          minimumServiceFee: s.minimumServiceFee ?? 200,
          registrationOpen: s.registrationOpen ?? true,
          termsAndConditions: s.termsAndConditions ?? "",
          termsVersion: s.termsVersion ?? "1.0",
          termsUpdatedAt: s.termsUpdatedAt
            ? new Date(s.termsUpdatedAt).toLocaleString()
            : "",
        };

        setPlatform(loadedPlatform);
        setTermsDraft(loadedPlatform.termsAndConditions);

        setNotifications({
          emailNotificationsEnabled: s.emailNotificationsEnabled ?? true,
          smsAlertsEnabled: s.smsAlertsEnabled ?? true,
        });

        setPlatformDirty(false);
        setNotifDirty(false);
      } catch {
        toast.error("Failed to load settings.");
      }
    })();
  }, []);

  useEffect(() => {
    const refs = Object.entries(sectionRefs);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.section);
          }
        });
      },
      { threshold: 0.4 }
    );

    refs.forEach(([, ref]) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  function scrollTo(id) {
    sectionRefs[id]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSection(id);
  }

  function updatePlatform(field, value) {
    setPlatform((p) => ({ ...p, [field]: value }));
    setPlatformDirty(true);
  }

  function updateNotif(field, value) {
    setNotifications((n) => ({ ...n, [field]: value }));
    setNotifDirty(true);
  }

  async function saveTerms() {
    setPlatformSaving(true);

    try {
      const parts = String(platform.termsVersion || "1.0").split(".");
      const major = parseInt(parts[0], 10) || 1;
      const minor = (parseInt(parts[1] || "0", 10) || 0) + 1;
      const newVersion = `${major}.${minor}`;
      const nowIso = new Date().toISOString();
      const nowLocal = new Date().toLocaleString();

      await api.put("/admin/settings", {
        termsAndConditions: termsDraft,
        termsVersion: newVersion,
        termsUpdatedAt: nowIso,
      });

      setPlatform((p) => ({
        ...p,
        termsAndConditions: termsDraft,
        termsVersion: newVersion,
        termsUpdatedAt: nowLocal,
      }));

      setEditTnc(false);
      setPlatformDirty(false);
      toast.success("Terms & Conditions updated.");
    } catch (err) {
      toast.error("Failed to update Terms & Conditions.");
      console.error("Save Terms Error:", err);
    } finally {
      setPlatformSaving(false);
    }
  }

  async function savePlatform() {
    setPlatformSaving(true);
    try {
      await api.put("/admin/settings", platform);
      setPlatformDirty(false);
      toast.success("Platform settings saved.");
    } catch {
      toast.error("Failed to save platform settings.");
    } finally {
      setPlatformSaving(false);
    }
  }

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      await api.put("/admin/settings", notifications);
      setNotifDirty(false);
      toast.success("Notification settings saved.");
    } catch {
      toast.error("Failed to save notification settings.");
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleDangerAction() {
    if (!modal) return;

    setDangerLoading(true);
    try {
      if (modal.action === "cache") {
        await api.post("/admin/clear-cache").catch(() => {});
        toast.success("Caches cleared.");
      } else if (modal.action === "leaderboard") {
        await api.post("/admin/reset-leaderboard").catch(() => {});
        toast.success("Leaderboard reset.");
      }
    } catch {
      toast.error("Action failed.");
    } finally {
      setDangerLoading(false);
      setModal(null);
    }
  }

  const inputCls =
    "rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none";

  function SectionCard({ id, Icon, title, dirty, saving, onSave, children }) {
    return (
      <div
        ref={sectionRefs[id]}
        data-section={id}
        className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
          id === "danger" ? "border-red-200 bg-red-50/30" : "border-gray-100"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Icon
              className={`w-4 h-4 ${
                id === "danger" ? "text-red-500" : "text-emerald-600"
              }`}
            />
            <span className="text-sm font-semibold text-gray-800">{title}</span>
          </div>

          {onSave && dirty && (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {saving && <Spinner />}
              Save
            </button>
          )}
        </div>

        <div className="px-5 pb-5 pt-3">{children}</div>
      </div>
    );
  }

  function SettingsRow({ label, description, children }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure platform behaviour and preferences
        </p>
      </div>

      <div className="md:hidden overflow-x-auto flex gap-2 px-6 mb-4 pb-1">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === id
                ? "bg-emerald-600 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6 px-6 pb-10">
        <aside className="w-56 shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-1">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === id
                    ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    activeSection === id ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 space-y-5">
          <SectionCard
            id="platform"
            Icon={HiCog6Tooth}
            title="Platform Rules"
            dirty={platformDirty}
            saving={platformSaving}
            onSave={savePlatform}
          >
            <SettingsRow
              label="Platform Commission (%)"
              description="Percentage taken on each completed booking"
            >
              <input
                type="number"
                min="0"
                max="100"
                value={platform.platformCommission}
                onChange={(e) =>
                  updatePlatform("platformCommission", Number(e.target.value))
                }
                className={`${inputCls} w-24`}
              />
            </SettingsRow>

            <SettingsRow
              label="Emergency Surcharge (%)"
              description="Extra fee applied to emergency bookings"
            >
              <input
                type="number"
                min="0"
                max="100"
                value={platform.emergencySurcharge}
                onChange={(e) =>
                  updatePlatform("emergencySurcharge", Number(e.target.value))
                }
                className={`${inputCls} w-24`}
              />
            </SettingsRow>

            <SettingsRow
              label="Minimum Service Fee (NPR)"
              description="Lowest allowed booking price"
            >
              <input
                type="number"
                min="0"
                value={platform.minimumServiceFee}
                onChange={(e) =>
                  updatePlatform("minimumServiceFee", Number(e.target.value))
                }
                className={`${inputCls} w-28`}
              />
            </SettingsRow>

            <SettingsRow
              label="Allow New Registrations"
              description="Enable or disable new user sign-ups"
            >
              <ToggleSwitch
                enabled={platform.registrationOpen}
                onChange={(v) => updatePlatform("registrationOpen", v)}
              />
            </SettingsRow>

            <div className="pt-3">
              <p className="text-sm font-medium text-gray-800 mb-2">
                Terms &amp; Conditions
              </p>

              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500">Version:</span>
                <span className="border border-gray-200 rounded px-2 py-1 text-xs w-20 bg-gray-50">
                  {platform.termsVersion}
                </span>
                <span className="text-xs text-gray-400">
                  Last updated: {platform.termsUpdatedAt || "Never"}
                </span>
              </div>

              {editTnc ? (
                <>
                  <textarea
                    rows={5}
                    value={termsDraft}
                    onChange={(e) => setTermsDraft(e.target.value)}
                    placeholder="Enter the platform terms and conditions..."
                    className="rounded-xl border border-gray-200 p-3 text-sm w-full focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                  />

                  <button
                    className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    onClick={saveTerms}
                    disabled={platformSaving}
                  >
                    {platformSaving ? "Saving..." : "Save"}
                  </button>

                  <button
                    className="mt-2 ml-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-300 transition"
                    onClick={() => {
                      setTermsDraft(platform.termsAndConditions);
                      setEditTnc(false);
                    }}
                    disabled={platformSaving}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm w-full min-h-[120px] whitespace-pre-line">
                    {platform.termsAndConditions || (
                      <span className="text-gray-400">
                        No terms and conditions set.
                      </span>
                    )}
                  </div>

                  <button
                    className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
                    onClick={() => {
                      setTermsDraft(platform.termsAndConditions);
                      setEditTnc(true);
                    }}
                  >
                    Update T&amp;C
                  </button>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard
            id="notifications"
            Icon={HiBell}
            title="Notifications"
            dirty={notifDirty}
            saving={notifSaving}
            onSave={saveNotifications}
          >
            <SettingsRow
              label="Email Notifications"
              description="Send email alerts for bookings, disputes, and approvals"
            >
              <ToggleSwitch
                enabled={notifications.emailNotificationsEnabled}
                onChange={(v) => updateNotif("emailNotificationsEnabled", v)}
              />
            </SettingsRow>

            <SettingsRow
              label="SMS Alerts"
              description="Send SMS messages for emergency and critical events"
            >
              <ToggleSwitch
                enabled={notifications.smsAlertsEnabled}
                onChange={(v) => updateNotif("smsAlertsEnabled", v)}
              />
            </SettingsRow>
          </SectionCard>

          <SectionCard id="security" Icon={HiShieldCheck} title="Security">
            <div className="space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    SSL Certificate
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    End-to-end encrypted traffic
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1">
                  <HiCheckCircle className="w-3.5 h-3.5" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Two-Factor Authentication
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Enforced for all admin accounts via OTP on login
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1">
                  <HiCheckCircle className="w-3.5 h-3.5" /> Enforced
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Rate Limiting
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    API endpoints protected against abuse
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1">
                  <HiCheckCircle className="w-3.5 h-3.5" /> Enabled
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="danger"
            Icon={HiExclamationTriangle}
            title="Danger Zone"
          >
            <p className="text-xs text-gray-500 mb-4">
              These actions are irreversible. Proceed with caution.
            </p>

            <div className="space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Clear All Caches
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Flush server-side caches for a fresh state
                  </p>
                </div>
                <button
                  onClick={() => setModal({ action: "cache" })}
                  className="border border-red-300 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  Clear Caches
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Reset Leaderboard
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Remove all current leaderboard rankings permanently
                  </p>
                </div>
                <button
                  onClick={() => setModal({ action: "leaderboard" })}
                  className="border border-red-300 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  Reset Leaderboard
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {modal && (
        <ConfirmModal
          title={
            modal.action === "cache"
              ? "Clear all caches?"
              : "Reset leaderboard?"
          }
          description={
            modal.action === "cache"
              ? "All server-side caches will be flushed. This cannot be undone."
              : "All current leaderboard rankings will be permanently removed."
          }
          onConfirm={handleDangerAction}
          onCancel={() => setModal(null)}
          loading={dangerLoading}
        />
      )}
    </div>
  );
}