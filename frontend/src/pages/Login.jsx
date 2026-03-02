import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiEnvelope, HiLockClosed, HiArrowRight, HiEye, HiEyeSlash, HiArrowLeft, HiShieldCheck, HiCheckBadge, HiExclamationCircle } from "react-icons/hi2";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, getRedirectPath } = useAuth();

  // If user was redirected here from a "Login-to-Book" flow, returnTo holds the path to go back to
  const returnTo = location.state?.returnTo;

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
    // If redirected from a "Login-to-Book" flow, go back there (clients only)
    if (returnTo && role === "client") {
      return navigate(returnTo);
    }
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
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4 py-8">
      <div className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* ── LEFT PANEL ── */}
        <div className="md:w-2/5 bg-emerald-700 px-8 py-10 flex flex-col relative overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-20 -left-12 w-56 h-56 bg-emerald-900/30 rounded-full" />

          <div className="relative z-10 flex flex-col flex-1">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white transition mb-8 w-fit"
            >
              <HiArrowLeft className="text-sm" /> Back to Home
            </Link>

            <img src={logo} alt="SewaHive" className="h-10 w-auto object-contain object-left mb-8" />

            <p className="text-xs font-bold tracking-widest uppercase text-emerald-300 mb-3">
              Welcome Back
            </p>
            <h1 className="text-3xl font-bold text-white leading-snug mb-4">
              Login to<br />
              <span className="text-emerald-300">SewaHive</span>
            </h1>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Access your bookings, manage services, and connect with trusted professionals.
            </p>

            <div className="mt-auto pt-10 border-t border-emerald-600 space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <HiShieldCheck className="text-base flex-shrink-0 text-emerald-300" />
                Secure &amp; Encrypted
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-100">
                <HiCheckBadge className="text-base flex-shrink-0 text-emerald-300" />
                No Spam · Privacy Protected
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="md:w-3/5 bg-white px-8 md:px-12 py-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900">Login</h2>
          <p className="mt-1 text-sm text-slate-500">Welcome back! Please sign in to your account.</p>

          <div className="mt-8">
            {/* Error */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <HiExclamationCircle className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              {/* EMAIL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                    <HiEnvelope className="text-slate-400 text-base" />
                  </span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                    <HiLockClosed className="text-slate-400 text-base" />
                  </span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <HiEyeSlash className="text-base" /> : <HiEye className="text-base" />}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-emerald-700 hover:text-emerald-900 font-medium transition">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: "#1c6c3b" }}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

              {/* DIVIDER */}
              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              {/* GOOGLE */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-200 bg-white py-2.5 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FcGoogle className="text-xl" />
                {googleLoading ? "Connecting…" : "Continue with Google"}
              </button>
            </form>
          </div>

          {/* Sign up links */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm">
            <p className="text-slate-500 mb-2">Don't have an account?</p>
            <div className="flex items-center justify-center gap-2">
              <Link to="/signup" className="font-semibold text-emerald-700 hover:text-emerald-900 transition">
                Sign Up as Client
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/provider/signup" className="font-semibold text-emerald-700 hover:text-emerald-900 transition">
                Join as Provider
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
