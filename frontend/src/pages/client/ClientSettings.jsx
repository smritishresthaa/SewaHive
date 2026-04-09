import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../layouts/ClientLayout";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import {
  HiBell,
  HiShieldCheck,
  HiTrash,
  HiEye,
  HiEyeSlash,
  HiExclamationTriangle,
  HiPower,
} from "react-icons/hi2";

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

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
        checked ? "bg-emerald-500" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(28px)" : "translateX(0px)" }}
      />
    </button>
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

export default function ClientSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState({
    bookingUpdates: user?.settings?.notifications?.bookingUpdates ?? true,
    messages: user?.settings?.notifications?.messages ?? true,
    reviews: user?.settings?.notifications?.reviews ?? true,
    email: user?.settings?.notifications?.email ?? true,
  });

  const [savingNotifications, setSavingNotifications] = useState(false);

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
  const [dangerAction, setDangerAction] = useState("");
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);

  const isGoogleOnly = useMemo(() => {
    return !!user?.googleId && !user?.passwordHash;
  }, [user]);

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      const res = await api.patch("/account/notifications", {
        notifications,
      });

      updateUser({
        settings: {
          notifications: res.data?.notifications || notifications,
        },
      });

      toast.success("Notification settings updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update notifications");
    } finally {
      setSavingNotifications(false);
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

  return (
    <ClientLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your security, notifications, and account controls.
          </p>
        </div>

        {/* Notifications */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <HiBell className="text-xl text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Choose which updates you want to receive.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "bookingUpdates",
                title: "Booking updates",
                desc: "Receive booking status and request updates.",
              },
              {
                key: "messages",
                title: "Messages",
                desc: "Receive alerts for new chat messages.",
              },
              {
                key: "reviews",
                title: "Reviews and service updates",
                desc: "Receive review-related and service activity notifications.",
              },
              {
                key: "email",
                title: "Email notifications",
                desc: "Receive important updates through email.",
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
                <Toggle
                  checked={!!notifications[item.key]}
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

          <button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        </section>

        {/* Security */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <HiShieldCheck className="text-xl text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Update your password and protect your account.
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
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
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
        </section>
      </div>
    </ClientLayout>
  );
}