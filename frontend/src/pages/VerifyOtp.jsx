// src/pages/VerifyOtp.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { HiArrowNarrowLeft } from "react-icons/hi";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const query = useQuery();
  const email = query.get("email") || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [cooldown, setCooldown] = useState(30); // 30 sec resend timer
  const [canResend, setCanResend] = useState(false);

  // -------------------------------------
  // Countdown logic
  // -------------------------------------
  useEffect(() => {
    if (!canResend && cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (cooldown === 0) {
      setCanResend(true);
    }
  }, [cooldown, canResend]);

  // -------------------------------------
  // Handle OTP input
  // -------------------------------------
  function handleChange(index, value) {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all digits typed
    if (index === 5 && value) {
      setTimeout(() => handleSubmit(), 150);
    }
  }

  // Backspace logic
  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  // -------------------------------------
  // Submit OTP
  // -------------------------------------
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setInfo("");

    const otp = digits.join("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      const resetToken = res?.data?.resetToken;

      if (!resetToken) {
        setError("Missing reset token. Please try again.");
        return;
      }

      setInfo("Code verified! Redirecting...");
      setTimeout(() => {
        navigate(
          `/reset-password?token=${encodeURIComponent(
            resetToken
          )}&email=${encodeURIComponent(email)}`
        );
      }, 800);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        "Invalid or expired code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------
  // RESEND OTP
  // -------------------------------------
  async function handleResend() {
    if (!canResend) return;

    try {
      setCanResend(false);
      setCooldown(30);
      await api.post("/auth/forgot-password", { email });
      setInfo("A new code has been sent!");
    } catch (err) {
      console.error(err);
      setError("Failed to resend code.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5faf7] to-[#ebf5f0] flex items-center justify-center px-4">
      <div className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-[0_30px_80px_rgba(15,94,54,0.25)] overflow-hidden">

        {/* Subtle blobs */}
        <div className="absolute -left-20 -top-24 h-60 w-60 bg-emerald-200/60 rounded-full blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-56 w-56 bg-emerald-300/40 rounded-full blur-3xl" />

        <div className="relative grid md:grid-cols-2">
          {/* LEFT SIDE */}
          <div className="p-10 md:p-12 bg-gradient-to-b from-emerald-50/80 to-transparent">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-emerald-700/80 hover:text-emerald-900"
            >
              <HiArrowNarrowLeft className="text-base" />
              Back
            </Link>

            <div className="mt-16 space-y-4 max-w-sm">
              <p className="text-xs tracking-[0.2em] text-emerald-600 uppercase">
                Step 2 of 3
              </p>

              <h1 className="text-4xl font-semibold leading-tight text-emerald-900">
                Enter the code
              </h1>

              <p className="text-sm text-emerald-900/70 leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <span className="font-semibold">{email}</span>.
              </p>

              <p className="mt-6 text-[11px] text-emerald-900/60">
                Didn’t receive it? You can request a new one.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE – OTP FORM */}
          <div className="p-8 md:p-10 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-gray-900">
                Verification code
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter the 6-digit code from your email.
              </p>

              {/* Error / Info */}
              {error && (
                <div className="mt-4 text-xs rounded-lg bg-red-50 text-red-700 px-3 py-2">
                  {error}
                </div>
              )}

              {info && (
                <div className="mt-4 text-xs rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2">
                  {info}
                </div>
              )}

              {/* OTP FIELDS */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="flex justify-between gap-2">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputsRef.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-semibold rounded-xl border border-gray-200 bg-gray-50 shadow-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  ))}
                </div>

                {/* Verify button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 text-white text-sm font-medium py-2.5 shadow-md shadow-emerald-600/40 hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify code"}
                </button>
              </form>

              {/* Resend Section */}
              <div className="mt-6 text-center text-xs text-gray-500">
                Didn’t get the code?{" "}
                <button
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`ml-1 font-medium ${
                    canResend
                      ? "text-emerald-700 hover:text-emerald-900"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {canResend ? "Resend code" : `Resend available in ${cooldown}s`}
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-gray-400">
                Wrong email?{" "}
                <Link
                  to="/forgot-password"
                  className="text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Start over
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
