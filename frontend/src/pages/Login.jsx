import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiEnvelope, HiLockClosed, HiArrowRight, HiEye, HiEyeSlash, HiArrowLeft, HiShieldCheck, HiCheckBadge, HiExclamationCircle } from "react-icons/hi2";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, getRedirectPath } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // --------------------------------------------------
  // ROLE-BASED REDIRECT (centralized in AuthContext)
  // --------------------------------------------------
  function redirectByRole(role) {
    return navigate(getRedirectPath(role));
  }

  // --------------------------------------------------
  // EMAIL + PASSWORD LOGIN
  // --------------------------------------------------
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

      // If email verification flow is triggered
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

  // --------------------------------------------------
  // GOOGLE LOGIN INITIALIZATION
  // --------------------------------------------------
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-1 shadow-2xl">
        <div className="relative flex flex-col md:flex-row bg-white/98 backdrop-blur-xl rounded-3xl overflow-hidden">
          {/* LEFT PANEL - Branding */}
          <div className="relative md:w-2/5 px-6 md:px-8 py-8 md:py-10 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800">
            {/* Background effects */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-20 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-20 left-10 w-32 h-32 bg-white rounded-full blur-2xl" />
            </div>

            <div className="relative z-10">
              {/* Back Link */}
              <Link
                to="/"
                className="inline-flex items-center text-xs text-emerald-100 hover:text-white transition mb-4 group"
              >
                <HiArrowLeft className="mr-2 text-sm group-hover:-translate-x-0.5 transition-transform" /> Back to Home
              </Link>

              {/* Logo */}
              <div className="mt-6 mb-8">
                <img
                  src={logo}
                  alt="SewaHive logo"
                  className="h-12 w-auto object-contain drop-shadow-lg"
                />
              </div>

              {/* Branding Text */}
              <div className="space-y-4">
                <p className="text-xs font-bold tracking-widest uppercase text-emerald-200">
                  Welcome Back
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  Login to<br />
                  <span className="text-emerald-200">SewaHive</span>
                </h1>
                <p className="text-sm text-emerald-100 leading-relaxed">
                  Access your bookings, manage services, and connect with trusted professionals.
                </p>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 pt-8 border-t border-emerald-500/30 space-y-3 text-[11px] text-emerald-100">
                <div className="flex items-center gap-2">
                  <HiShieldCheck className="text-lg flex-shrink-0" />
                  <span>Secure & Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <HiCheckBadge className="text-lg flex-shrink-0" />
                  <span>No Spam · Privacy Protected</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Login Form */}
          <div className="relative md:w-3/5 px-6 md:px-10 py-8 md:py-10 bg-white/95">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Login
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Welcome back! Please sign in to your account.
              </p>
            </div>

            {/* Form Container */}
            <div className="mt-7">
              {/* Error Alert */}
              {error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                    <HiExclamationCircle className="text-lg flex-shrink-0" />
                    {error}
                  </p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                {/* EMAIL */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <HiEnvelope className="absolute left-3.5 top-3.5 text-slate-400 text-lg group-focus-within:text-emerald-600 transition" />
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-11 pr-4 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition font-medium"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <HiLockClosed className="absolute left-3.5 top-3.5 text-slate-400 text-lg group-focus-within:text-emerald-600 transition" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-11 pr-11 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition font-medium"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? (
                        <HiEyeSlash className="text-lg" />
                      ) : (
                        <HiEye className="text-lg" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Login
                      <HiArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs uppercase tracking-wider font-medium text-slate-400">
                    or
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                {/* GOOGLE LOGIN */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                >
                  <FcGoogle className="text-xl" />
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </button>
              </form>
            </div>

            {/* Sign Up Link */}
            <div className="mt-7 pt-6 border-t border-slate-200 text-center text-sm">
              <p className="text-slate-600 mb-2">
                Don't have an account?
              </p>
              <div className="flex gap-2 justify-center">
                <Link 
                  to="/signup" 
                  className="text-emerald-700 font-semibold hover:text-emerald-900 transition"
                >
                  Sign Up as Client
                </Link>
                <span className="text-slate-400">•</span>
                <Link 
                  to="/provider/signup" 
                  className="text-emerald-700 font-semibold hover:text-emerald-900 transition"
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
