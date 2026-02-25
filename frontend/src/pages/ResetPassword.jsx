// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { HiArrowNarrowLeft, HiLockClosed } from "react-icons/hi";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = useQuery();
  const email = query.get("email") || "";
  const token = query.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Please start the reset flow again.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setInfo("Password reset successfully. Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Could not reset password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5faf7] to-[#ebf5f0] flex items-center justify-center px-4">
      {/* OUTER CARD */}
      <div className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-[0_30px_80px_rgba(15,94,54,0.25)] border border-emerald-100 overflow-hidden">

        {/* Glow Blobs */}
        <div className="absolute -left-24 -top-20 h-72 w-72 bg-emerald-200/50 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 bg-emerald-300/40 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative grid md:grid-cols-2">

          {/* LEFT PANEL */}
          <div className="p-10 md:p-14 bg-gradient-to-b from-emerald-50/90 to-transparent">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700/80 hover:text-emerald-900 transition"
            >
              <HiArrowNarrowLeft className="text-base" />
              Back to login
            </Link>

            <div className="mt-16 space-y-4 max-w-sm">
              <p className="text-xs tracking-[0.22em] text-emerald-700 uppercase font-semibold">
                FINAL STEP
              </p>

              <h1 className="text-4xl font-bold leading-tight text-emerald-900">
                Set a new
                <br />
                password
              </h1>

              <p className="text-sm text-emerald-900/70 leading-relaxed">
                Create a strong password for{" "}
                <span className="font-semibold">{email}</span>.
              </p>

              <p className="mt-6 text-[11px] text-emerald-900/60">
                Tip: Use uppercase, lowercase, numbers & symbols for higher strength.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL — FORM */}
          <div className="p-8 md:p-12 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Create new password
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                You’ll use this password to log into your account.
              </p>

              {error && (
                <div className="mt-4 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
                  {error}
                </div>
              )}

              {info && (
                <div className="mt-4 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2">
                  {info}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                
                {/* NEW PASSWORD */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    New password
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                      <HiLockClosed className="text-lg" />
                    </span>
                    <input
                      type="password"
                      placeholder="Create a new password"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Confirm password
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                      <HiLockClosed className="text-lg" />
                    </span>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                {/* BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 shadow-md shadow-emerald-600/40 transition disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Reset password"}
                </button>
              </form>

              <p className="mt-6 text-xs text-gray-500 text-center">
                Remembered your password?{" "}
                <Link
                  to="/login"
                  className="text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
