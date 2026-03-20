import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";
import {
  HiMail,
  HiLockClosed,
  HiUser,
  HiEye,
  HiEyeOff,
} from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import logo from "../../logos/logo.png";
import toast from "react-hot-toast";

export default function ProviderSignup() {
  const navigate = useNavigate();
  const { loginWithGoogle, getRedirectPath } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    role: "provider",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    async function fetchPublicRegistrationStatus() {
      try {
        const res = await api.get("/settings/public");
        setRegistrationOpen(res?.data?.registrationOpen ?? true);
      } catch (err) {
        console.error("Failed to fetch public registration status:", err);
        setRegistrationOpen(true);
      } finally {
        setCheckingRegistration(false);
      }
    }

    fetchPublicRegistrationStatus();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function getFieldErrors(values) {
    const errors = {};

    if (!values.name.trim()) {
      errors.name = "Full name is required.";
    } else if (/^\d+$/.test(values.name.trim())) {
      errors.name = "Name cannot contain only numbers.";
    }

    if (!values.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!values.password) {
      errors.password = "Password is required.";
    } else {
      if (values.password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
      } else if (!/[A-Z]/.test(values.password)) {
        errors.password = "Password must include at least one uppercase letter.";
      } else if (!/\d/.test(values.password)) {
        errors.password = "Password must include at least one number.";
      }
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!values.acceptTerms) {
      errors.acceptTerms = "You must accept the Terms & Conditions.";
    }

    return errors;
  }

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);
  const isFormValid = Object.keys(fieldErrors).length === 0;

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    });

    if (!isFormValid) {
      const firstError = Object.values(fieldErrors)[0];
      setError(firstError);
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        role: "provider",
        profile: { name: form.name },
      });

      toast.success("Provider account created! Please verify your email 📧");
      navigate(`/verify-info?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Signup failed. Email may already be in use.";

      setError(msg);
      toast.error(msg);
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
          const user = await loginWithGoogle(response.credential, "provider");
          toast.success("Signed up with Google!");
          navigate(getRedirectPath(user.role));
        } catch (err) {
          console.error(err);
          const errorMsg =
            err?.response?.data?.message ||
            err?.message ||
            "Google signup failed";
          setError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setGoogleLoading(false);
        }
      },
    });
  }, [loginWithGoogle, navigate, getRedirectPath]);

  function handleGoogleSignup() {
    setError("");

    if (!window.google) {
      const msg = "Google Sign-In is not available right now.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      const msg = "Google Client ID is missing.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setGoogleLoading(true);

    try {
      window.google.accounts.id.prompt();
    } catch (err) {
      const msg = err?.message || "Google Sign-In failed.";
      setError(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  }

  if (checkingRegistration) {
    return null;
  }

  if (!registrationOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center justify-center w-full h-full text-center">
          <img
            src="https://cdn-icons-png.flaticon.com/512/679/679720.png"
            alt="Construction"
            style={{ width: 120, height: 120 }}
          />
          <h2 className="mt-6 text-2xl font-bold text-emerald-800">
            We're working on something new!
          </h2>
          <p className="mt-2 text-lg text-emerald-700">
            Registration is temporarily closed.
            <br />
            Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  const inputBase =
    "w-full bg-transparent py-3 text-sm outline-none";
  const wrapperBase =
    "mt-1 flex items-center rounded-xl border bg-slate-50/60 px-3 transition-all";
  const getWrapperClass = (field) =>
    `${wrapperBase} ${
      touched[field] && fieldErrors[field]
        ? "border-red-300 focus-within:ring-2 focus-within:ring-red-200"
        : "border-slate-200 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="relative w-full max-w-5xl rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 p-[1px] shadow-[0_40px_80px_rgba(15,23,42,0.55)]">
        <div className="relative flex flex-col md:flex-row bg-white rounded-[22px] overflow-hidden">
          <div className="relative md:w-1/2 px-8 md:px-10 py-8 md:py-10 bg-gradient-to-br from-emerald-50/95 via-emerald-50 to-emerald-100/90">
            <Link
              to="/"
              className="inline-flex items-center text-xs text-emerald-800/70 hover:text-emerald-900"
            >
              <span className="mr-2">←</span> Back to Home
            </Link>

            <div className="mt-6">
              <img
                src={logo}
                alt="SewaHive logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="mt-10 md:mt-16 space-y-4 max-w-sm">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-700/80">
                BECOME A TASKER
              </p>

              <h1 className="text-3xl md:text-4xl font-semibold text-emerald-950 leading-tight">
                Create your
                <br />
                <span className="text-emerald-700">Provider Account</span>
              </h1>

              <p className="text-sm text-emerald-900/80 leading-relaxed">
                Join SewaHive as a service provider. Get bookings, grow your
                profile, and earn.
              </p>
            </div>

            <div className="mt-10 text-[11px] text-emerald-900/60">
              Verified onboarding · Profile building · More customers
            </div>
          </div>

          <div className="relative md:w-1/2 px-6 md:px-8 py-7 md:py-9 bg-white">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                Provider Sign Up
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Create your provider account to start getting jobs.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.08)] px-5 py-6">
              {error && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSignup} noValidate>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Full Name
                  </label>
                  <div className={getWrapperClass("name")}>
                    <HiUser className="text-slate-400 mr-2 text-lg" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={inputBase}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  {touched.name && fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Email
                  </label>
                  <div className={getWrapperClass("email")}>
                    <HiMail className="text-slate-400 mr-2 text-lg" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={inputBase}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <div className={getWrapperClass("password")}>
                    <HiLockClosed className="text-slate-400 mr-2 text-lg" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={inputBase}
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password ? (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Use at least 8 characters, 1 uppercase letter, and 1 number.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <div className={getWrapperClass("confirmPassword")}>
                    <HiLockClosed className="text-slate-400 mr-2 text-lg" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={inputBase}
                      placeholder="Re-enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
                    </button>
                  </div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={form.acceptTerms}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="text-emerald-700 font-medium">
                        Terms & Conditions
                      </span>
                      .
                    </span>
                  </label>
                  {touched.acceptTerms && fieldErrors.acceptTerms && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.acceptTerms}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="mt-1 w-full rounded-xl bg-emerald-700 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(4,120,87,0.45)] hover:bg-emerald-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Sign Up as Provider"}
                </button>

                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    or
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <FcGoogle className="text-xl" />
                  <span>
                    {googleLoading ? "Connecting..." : "Continue with Google"}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500">
              Already a provider?{" "}
              <Link to="/login" className="text-emerald-700 font-medium">
                Login
              </Link>
            </div>

            <div className="mt-2 text-center text-[11px] text-slate-400">
              Not a provider?{" "}
              <Link to="/signup" className="text-emerald-700">
                Create client account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}