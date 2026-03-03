import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { useAuth } from "../context/AuthContext";
import { HiMail, HiLockClosed, HiUser } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast"; // ✅ NEW

export default function Signup() {
  const navigate = useNavigate();
  const { loginWithGoogle, getRedirectPath } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "client",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // --------------------------------------------------
  // BASIC REAL-WORLD VALIDATION (FRONTEND)
  // --------------------------------------------------
  function validateForm() {
    if (!form.name || !form.email || !form.password) {
      return "All fields are required.";
    }

    if (/^\d+$/.test(form.name)) {
      return "Name cannot contain only numbers.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return "Please enter a valid email address.";
    }

    if (form.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return "Password must contain at least one letter and one number.";
    }

    return null;
  }

  // --------------------------------------------------
  // EMAIL SIGNUP
  // --------------------------------------------------
  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError); // ✅ NEW
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        role: "client",
        profile: { name: form.name },
      });

      toast.success("Account created! Please check your email to verify your account."); // ✅ NEW

      // Email verification flow
      navigate(`/verify-info?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Signup failed. Email may already be in use.";

      setError(msg);
      toast.error(msg); // ✅ NEW
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // GOOGLE SIGNUP INITIALIZATION
  // --------------------------------------------------
  useEffect(() => {
    if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const user = await loginWithGoogle(response.credential, "client");

          toast.success("Signed up with Google!"); // ✅ NEW

          // Role-based redirect (centralized)
          navigate(getRedirectPath(user.role));
        } catch (err) {
          console.error(err);
          const errorMsg = err?.response?.data?.message || err?.message || "Google signup failed";
          setError(errorMsg);
          toast.error(errorMsg); // ✅ NEW
        } finally {
          setGoogleLoading(false);
        }
      },
    });
  }, [loginWithGoogle, navigate]);

  function handleGoogleSignup() {
    setError("");

    if (!window.google) {
      const msg = "Google Sign-In is not available right now.";
      setError(msg);
      toast.error(msg); // ✅ NEW
      return;
    }

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      const msg = "Google Client ID is missing.";
      setError(msg);
      toast.error(msg); // ✅ NEW
      return;
    }

    setGoogleLoading(true);
    window.google.accounts.id.prompt();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="relative w-full max-w-5xl rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 p-[1px] shadow-[0_40px_80px_rgba(15,23,42,0.55)]">
        <div className="relative flex flex-col md:flex-row bg-white rounded-[22px] overflow-hidden">

          {/* Glow Effects */}
          <div className="pointer-events-none absolute -left-20 top-6 h-56 w-56 rounded-full bg-emerald-300/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-emerald-500/30 blur-3xl" />

          {/* LEFT PANEL */}
          <div className="relative md:w-1/2 px-8 md:px-10 py-8 md:py-10 bg-gradient-to-br from-emerald-50/95 via-emerald-50 to-emerald-100/90">
            <Link
              to="/"
              className="inline-flex items-center text-xs text-emerald-800/70 hover:text-emerald-900"
            >
              <span className="mr-2">←</span> Back to Home
            </Link>

            <div className="mt-6">
              <img src={logo} alt="SewaHive logo" className="h-10 w-auto object-contain" />
            </div>

            <div className="mt-10 md:mt-16 space-y-4 max-w-sm">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-700/80">
                GET STARTED
              </p>

              <h1 className="text-3xl md:text-4xl font-semibold text-emerald-950 leading-tight">
                Join the
                <br />
                <span className="text-emerald-700">SewaHive Community</span>
              </h1>

              <p className="text-sm text-emerald-900/80 leading-relaxed">
                Create your account and start booking trusted service providers
                for your home — fast, safe, and easy.
              </p>
            </div>

            <div className="mt-10 text-[11px] text-emerald-900/60">
              Verified providers · Transparent pricing · 24/7 booking
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="relative md:w-1/2 px-6 md:px-8 py-7 md:py-9 bg-white">

            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                Create Account
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Sign up to get started with SewaHive.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.08)] px-5 py-6">
              {error && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSignup}>
                {/* FULL NAME */}
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3">
                    <HiUser className="text-slate-400 mr-2 text-lg" />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-transparent py-2 text-sm outline-none"
                      placeholder="Enter your full name"   // ✅ RESTORED
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Email
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3">
                    <HiMail className="text-slate-400 mr-2 text-lg" />
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-transparent py-2 text-sm outline-none"
                      placeholder="Enter your email"       // ✅ RESTORED
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3">
                    <HiLockClosed className="text-slate-400 mr-2 text-lg" />
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full bg-transparent py-2 text-sm outline-none"
                      placeholder="Create a password"       // ✅ RESTORED
                    />
                  </div>
                </div>

                {/* SIGNUP BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(4,120,87,0.45)] hover:bg-emerald-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing up…" : "Sign Up"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    or
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                {/* GOOGLE SIGNUP */}
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <FcGoogle className="text-xl" />
                  <span>
                    {googleLoading ? "Connecting…" : "Continue with Google"}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-700 font-medium">
                Login
              </Link>
            </div>

            <div className="mt-2 text-center text-[11px] text-slate-400">
              Want to offer services?{" "}
              <Link to="/provider/signup" className="text-emerald-700">
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
