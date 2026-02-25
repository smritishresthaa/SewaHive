// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { HiArrowNarrowLeft, HiMail } from "react-icons/hi";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setInfo("We’ve sent a 6-digit code to your email.");
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "We couldn’t find an account with that email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5faf7] to-[#ebf5f0] flex items-center justify-center px-4">
      {/* MAIN OUTER CARD */}
      <div className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-[0_30px_80px_rgba(15,94,54,0.25)] overflow-hidden border border-emerald-100">
        
        {/* Glow blobs */}
        <div className="absolute -left-28 -top-20 h-72 w-72 bg-emerald-200/50 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -right-20 bottom-0 h-64 w-64 bg-emerald-300/40 rounded-full blur-[100px] pointer-events-none" />

        {/* GRID LAYOUT */}
        <div className="relative grid md:grid-cols-2">

          {/* LEFT PANEL - INFO */}
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
                RESET ACCESS
              </p>
              <h1 className="text-4xl font-bold leading-tight text-emerald-900">
                Forgot your
                <br />
                password?
              </h1>
              <p className="text-sm text-emerald-900/70 leading-relaxed">
                No worries! Enter your email and we’ll send you a 6-digit OTP to securely reset
                your password.
              </p>

              <p className="mt-6 text-[11px] text-emerald-900/60">
                Protected by secure OTP verification. We never share or store your email externally.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL - FORM */}
          <div className="p-8 md:p-12 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Send reset code
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter the email linked with your SewaHive account.
              </p>

              {error && (
                <div className="mt-4 text-xs rounded-lg bg-red-50 border border-red-100 text-red-700 px-3 py-2">
                  {error}
                </div>
              )}

              {info && (
                <div className="mt-4 text-xs rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2">
                  {info}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                      <HiMail className="text-lg" />
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 shadow-md shadow-emerald-600/40 transition disabled:opacity-60"
                >
                  {loading ? "Sending code…" : "Send reset code"}
                </button>
              </form>

              <p className="mt-6 text-xs text-gray-500">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-emerald-700 font-medium hover:text-emerald-900"
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
