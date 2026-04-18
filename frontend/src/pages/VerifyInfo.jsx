import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/axios";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VerifyInfo() {
  const navigate = useNavigate();
  const query = useQuery();

  const [email, setEmail] = useState((query.get("email") || "").trim().toLowerCase());
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [justSent, setJustSent] = useState(Boolean(query.get("email")));

  useEffect(() => {
    const queryEmail = (query.get("email") || "").trim().toLowerCase();
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [query]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const normalizedOtp = useMemo(() => otp.replace(/\D/g, "").slice(0, 6), [otp]);

  function handleOtpChange(event) {
    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
    if (error) setError("");
    if (success) setSuccess("");
  }

  function handleEmailChange(event) {
    setEmail(event.target.value.trimStart().toLowerCase());
    if (error) setError("");
    if (success) setSuccess("");
  }

  async function handleVerify(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      const message = "Please enter the email address you signed up with.";
      setError(message);
      toast.error(message);
      return;
    }

    if (normalizedOtp.length !== 6) {
      const message = "Enter the 6-digit verification code from your email.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setVerifying(true);
      const res = await api.post("/auth/verify-email", {
        email: email.trim().toLowerCase(),
        otp: normalizedOtp,
      });

      const message = res.data?.message || "Email verified successfully.";
      setSuccess(message);
      setError("");
      toast.success(message);
      setOtp("");
      setRemainingAttempts(5);

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1400);
    } catch (err) {
      const retryAfterSeconds = Number(err?.response?.data?.retryAfterSeconds || 0);
      const verification = err?.response?.data?.verification || null;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "We could not verify that code. Please try again.";

      if (retryAfterSeconds > 0) {
        setCooldown(retryAfterSeconds);
      }
      if (verification?.remainingAttempts !== undefined) {
        setRemainingAttempts(Number(verification.remainingAttempts));
      }

      setError(message);
      setSuccess("");
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      const message = "Enter your email first so we know where to send the code.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setResending(true);
      const res = await api.post("/auth/resend-verification", {
        email: email.trim().toLowerCase(),
      });

      const verification = res.data?.verification || null;
      const retryAfterSeconds = Number(
        res.data?.retryAfterSeconds || verification?.resendCooldownSeconds || 60
      );

      setCooldown(Math.max(0, retryAfterSeconds));
      setRemainingAttempts(
        verification?.remainingAttempts !== undefined
          ? Number(verification.remainingAttempts)
          : 5
      );
      setJustSent(true);

      const message =
        res.data?.message || "A fresh verification code has been sent to your email.";
      setSuccess(message);
      setError("");
      toast.success(message);
    } catch (err) {
      const retryAfterSeconds = Number(err?.response?.data?.retryAfterSeconds || 0);
      const verification = err?.response?.data?.verification || null;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "We could not resend the verification code right now.";

      if (retryAfterSeconds > 0) {
        setCooldown(retryAfterSeconds);
      } else if (verification?.resendCooldownSeconds) {
        setCooldown(Number(verification.resendCooldownSeconds));
      }

      if (verification?.remainingAttempts !== undefined) {
        setRemainingAttempts(Number(verification.remainingAttempts));
      }

      setError(message);
      setSuccess("");
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  const resendDisabled = resending || cooldown > 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="max-w-md">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50">
                Secure email verification
              </div>

              <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
                Enter the 6-digit code we sent to your inbox.
              </h1>

              <p className="mt-4 text-sm leading-7 text-emerald-50/90 sm:text-base">
                We now verify new accounts with a one-time code instead of a link.
                This keeps signup simple across devices and helps users finish verification
                without switching browsers.
              </p>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
                  What to expect
                </p>
                <ul className="mt-3 space-y-3 text-sm text-emerald-50/90">
                  <li>• The code expires in 10 minutes.</li>
                  <li>• You can request a new code after a short cooldown.</li>
                  <li>• Too many incorrect attempts will require a fresh code.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-md">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
              >
                <span className="mr-2">←</span>
                Back to login
              </Link>

              <div className="mt-6">
                <h2 className="text-2xl font-semibold text-slate-900 sm:text-[28px]">
                  Verify your email
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                  {justSent
                    ? "A verification code should already be in your inbox. Enter it below to activate your account."
                    : "Enter your email and the OTP from your inbox to continue."}
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleVerify}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Verification code
                    </label>
                    <span className="text-xs text-slate-400">6 digits</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-2xl tracking-[0.45em] text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:text-[30px]"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {remainingAttempts < 5
                        ? `${remainingAttempts} verification attempt${remainingAttempts === 1 ? "" : "s"} remaining`
                        : "Use the latest code from your inbox."}
                    </span>
                    {cooldown > 0 ? (
                      <span className="font-medium text-emerald-700">
                        Resend available in {formatCountdown(cooldown)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {(error || success) && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      error
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {error || success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {verifying ? "Verifying..." : "Verify email"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Didn’t get the code?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Check spam or promotions first, then request a fresh code.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendDisabled}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    {resending
                      ? "Sending..."
                      : cooldown > 0
                      ? `Resend in ${formatCountdown(cooldown)}`
                      : "Resend code"}
                  </button>
                </div>
              </div>

              <div className="mt-6 text-xs leading-6 text-slate-500">
                Wrong email?{" "}
                <Link to="/signup" className="font-medium text-emerald-700 hover:text-emerald-800">
                  Create a new account
                </Link>
                {" "}or go back to{" "}
                <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
                  login
                </Link>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
