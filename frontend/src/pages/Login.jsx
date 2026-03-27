import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiEnvelope,
  HiLockClosed,
  HiArrowRight,
  HiEye,
  HiEyeSlash,
  HiArrowLeft,
  HiShieldCheck,
  HiCheckBadge,
  HiExclamationCircle,
} from "react-icons/hi2";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, getRedirectPath } = useAuth();

  const returnTo = location.state?.returnTo;

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function redirectByRole(role) {
    if (returnTo && role === "client") {
      return navigate(returnTo);
    }
    return navigate(getRedirectPath(role));
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form.email, form.password);

      toast.success("Logged in successfully");
      redirectByRole(user.role);
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid email or password";

      setError(msg);
      toast.error(msg);

      if (
        msg.toLowerCase().includes("verify") ||
        err?.response?.data?.message ===
          "Please verify your email before logging in."
      ) {
        navigate(`/verify-info?email=${encodeURIComponent(form.email)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const user = await loginWithGoogle(response.credential);

          toast.success("Logged in with Google");
          redirectByRole(user.role);
        } catch (err) {
          console.error(err);
          setError("Google login failed");
          toast.error("Google login failed");
        } finally {
          setGoogleLoading(false);
        }
      },
    });
  }, [loginWithGoogle]);

  function handleGoogleLogin() {
    setError("");

    if (!window.google) {
      const msg = "Google Sign-In is not available right now.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      const msg = "Google Client ID missing in environment config.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setGoogleLoading(true);
    window.google.accounts.id.prompt();
  }

  return (
    <div className="min-h-screen bg-emerald-50 px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="flex w-full flex-col overflow-hidden rounded-3xl shadow-2xl lg:flex-row">
          <div className="relative overflow-hidden bg-emerald-700 px-6 py-8 sm:px-8 sm:py-10 lg:w-2/5">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-emerald-900/30" />

            <div className="relative z-10 flex h-full flex-col">
              <Link
                to="/"
                className="mb-6 inline-flex w-fit items-center gap-1.5 text-xs text-emerald-200 transition hover:text-white sm:mb-8"
              >
                <HiArrowLeft className="text-sm" /> Back to Home
              </Link>

              <img
                src={logo}
                alt="SewaHive"
                className="mb-6 h-9 w-auto object-contain object-left sm:mb-8 sm:h-10"
              />

              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-300">
                Welcome Back
              </p>
              <h1 className="mb-4 text-2xl font-bold leading-snug text-white sm:text-3xl">
                Login to
                <br />
                <span className="text-emerald-300">SewaHive</span>
              </h1>
              <p className="text-sm leading-relaxed text-emerald-100 sm:text-[15px]">
                Access your bookings, manage services, and connect with trusted professionals.
              </p>

              <div className="mt-8 space-y-3 border-t border-emerald-600 pt-8 sm:mt-10 lg:mt-auto">
                <div className="flex items-center gap-2 text-sm text-emerald-100">
                  <HiShieldCheck className="shrink-0 text-base text-emerald-300" />
                  Secure &amp; Encrypted
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-100">
                  <HiCheckBadge className="shrink-0 text-base text-emerald-300" />
                  No Spam · Privacy Protected
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-white px-4 py-6 sm:px-8 sm:py-8 md:px-10 lg:w-3/5 lg:px-12 lg:py-10">
            <h2 className="text-2xl font-bold text-slate-900">Login</h2>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back! Please sign in to your account.
            </p>

            <div className="mt-6 sm:mt-8">
              {error && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <HiExclamationCircle className="mt-0.5 shrink-0 text-lg text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                      <HiEnvelope className="text-base text-slate-400" />
                    </span>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                      <HiLockClosed className="text-base text-slate-400" />
                    </span>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? (
                        <HiEyeSlash className="text-base" />
                      ) : (
                        <HiEye className="text-base" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-emerald-700 transition hover:text-emerald-900"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: "#1c6c3b" }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <>
                      Login
                      <HiArrowRight className="text-base" />
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    or
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FcGoogle className="text-xl" />
                  {googleLoading ? "Connecting…" : "Continue with Google"}
                </button>
              </form>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm">
              <p className="mb-2 text-slate-500">Don't have an account?</p>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link
                  to="/signup"
                  className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                >
                  Sign Up as Client
                </Link>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <Link
                  to="/provider/signup"
                  className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                >
                  Join as Provider
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}