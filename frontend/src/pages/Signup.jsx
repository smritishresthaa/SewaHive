import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { useAuth } from "../context/AuthContext";
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast";
=======
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNavbar from "../components/Navbar/TopNavbar";
import {
  HiMagnifyingGlass,
  HiAdjustmentsHorizontal,
  HiStar,
  HiArrowRight,
} from "react-icons/hi2";
import {
  FiHome,
  FiDroplet,
  FiZap,
  FiTool,
  FiPenTool,
  FiSun,
  FiWind,
  FiPackage,
  FiSettings,
} from "react-icons/fi";
import { HiBugAnt } from "react-icons/hi2";
import api from "../utils/axios";
import ServiceCard from "../components/Service/ServiceCard";
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/axios";
import { useAuth } from "../context/AuthContext";
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import logo from "../logos/logo.png";
import toast from "react-hot-toast";

function CategoryIcon({ iconKey, categoryName, className = "w-5 h-5" }) {
  const normalized = (iconKey || categoryName || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");

  const iconMap = {
    cleaning: FiHome,
    plumbing: FiDroplet,
    "painting-and-decor": FiPenTool,
    painting: FiPenTool,
    decor: FiPenTool,
    electrical: FiZap,
    electrician: FiZap,
    handyman: FiTool,
    carpentry: FiTool,
    ac: FiWind,
    appliance: FiSettings,
    shifting: FiPackage,
    pest: HiBugAnt,
    gardening: FiSun,
  };

  const Icon = iconMap[normalized] || FiSettings;
  return <Icon className={className} />;
}

export default function BrowseServices() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

<<<<<<< HEAD
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    role: "client",
  });

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});

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
=======
  const categoryParam = searchParams.get("category") || "";
  const subcategoryParam = searchParams.get("subcategory") || "";
  const initialQueryParam = searchParams.get("q") || "";

  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQueryParam);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!categories.length) return;

    if (!categoryParam) {
      setSelectedCategory("All");
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
      return;
    }

    const normalizedParam = categoryParam.trim().toLowerCase();

    const matchedCategory = categories.find((cat) => {
      const byId = String(cat._id) === categoryParam;
      const byName = String(cat.name || "").trim().toLowerCase() === normalizedParam;
      return byId || byName;
    });

    if (matchedCategory) {
      setSelectedCategory(matchedCategory._id);
    } else {
      setSelectedCategory("All");
    }
  }, [categories, categoryParam]);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, sortBy, subcategoryParam]);

  useEffect(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) {
      setServices(allServices);
      return;
    }

    setServices(
      allServices.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.categoryId?.name?.toLowerCase().includes(q) ||
          s.subcategoryId?.name?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, allServices]);

  const selectedCategoryObject = useMemo(() => {
    if (selectedCategory === "All") return null;
    return categories.find((cat) => cat._id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  async function fetchCategories() {
    try {
<<<<<<< HEAD
      await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        role: "client",
        profile: { name: form.name },
      });

      toast.success("Account created! Please check your email to verify your account.");
      navigate(`/verify-info?email=${encodeURIComponent(form.email)}`);
=======
      setLoadingCategories(true);
      const res = await api.get("/categories");
      const categoryList = res.data.data || [];
      setCategories(categoryList);
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
    } catch (err) {
      console.error("Failed to load categories:", err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchServices() {
    try {
      setLoading(true);

<<<<<<< HEAD
      setError(msg);
      toast.error(msg);
=======
      const params = new URLSearchParams();

      if (selectedCategory !== "All" && selectedCategory) {
        params.append("categoryId", selectedCategory);
      }

      const res = await api.get(`/services/list?${params.toString()}`);
      let servicesData = res.data.services || [];

      if (subcategoryParam) {
        const normalizedSub = subcategoryParam.trim().toLowerCase();
        servicesData = servicesData.filter(
          (service) =>
            service.subcategoryId?.name?.trim().toLowerCase() === normalizedSub
        );
      }

      if (sortBy === "price-low") {
        servicesData.sort((a, b) => Number(a.basePrice || 0) - Number(b.basePrice || 0));
      } else if (sortBy === "price-high") {
        servicesData.sort((a, b) => Number(b.basePrice || 0) - Number(a.basePrice || 0));
      } else if (sortBy === "rating") {
        servicesData.sort((a, b) => Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0));
      }

      setAllServices(servicesData);
      setServices(servicesData);
    } catch (err) {
      console.log("Services endpoint not available yet:", err.message);
      setAllServices([]);
      setServices([]);
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  useEffect(() => {
    if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const user = await loginWithGoogle(response.credential, "client");
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
=======
  async function fetchLeaderboard() {
    try {
      if (!isAuthenticated) {
        setLeaderboard([]);
        return;
      }

      setLoadingLeaderboard(true);
      const res = await api.get("/leaderboard/current?range=30d");
      setLeaderboard(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load leaderboard:", err.message);
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  function formatResponseTime(minutes) {
    if (!minutes || Number.isNaN(minutes)) return "N/A";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)} hr`;
  }

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setServices(allServices);
      return;
    }

    const filtered = allServices.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.categoryId?.name?.toLowerCase().includes(q) ||
        s.subcategoryId?.name?.toLowerCase().includes(q)
    );
    setServices(filtered);
  }

  function applyPriceFilter() {
    let filtered = [...allServices];

    if (priceRange.min || priceRange.max) {
      const min = priceRange.min ? Number(priceRange.min) : 0;
      const max = priceRange.max ? Number(priceRange.max) : Infinity;

      filtered = filtered.filter((s) => {
        const servicePrice =
          s.priceMode === "range"
            ? Number(s.priceRange?.min || s.basePrice || 0)
            : Number(s.basePrice || 0);

        return servicePrice >= min && servicePrice <= max;
      });
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
    }

    setServices(filtered);
    setShowFilters(false);
  }

  function handleBookService(serviceId) {
    navigate(`/booking/${serviceId}`);
  }

  function getServiceCategoryMeta(service) {
    const categoryId = service.categoryId?._id || service.categoryId;
    const categoryName = service.category?.name || service.categoryName || service.category;

    const match = categories.find(
      (cat) => cat._id === categoryId || (!categoryId && cat.name === categoryName)
    );

    return {
      name: match?.name || categoryName || "Service",
      iconKey: match?.iconKey || match?.name || categoryName || "service",
    };
  }

  if (checkingRegistration) {
    return null;
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
<<<<<<< HEAD
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      {registrationOpen ? (
        <div className="relative w-full max-w-5xl rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 p-[1px] shadow-[0_40px_80px_rgba(15,23,42,0.55)]">
          <div className="relative flex flex-col md:flex-row bg-white rounded-[22px] overflow-hidden">
            <div className="pointer-events-none absolute -left-20 top-6 h-56 w-56 rounded-full bg-emerald-300/40 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-emerald-500/30 blur-3xl" />

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
                        disabled={!registrationOpen}
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
                        disabled={!registrationOpen}
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
                        disabled={!registrationOpen}
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
                        disabled={!registrationOpen}
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
                    disabled={loading || !registrationOpen || !isFormValid}
                    className="mt-1 w-full rounded-xl bg-emerald-700 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(4,120,87,0.45)] hover:bg-emerald-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account..." : "Sign Up"}
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
                    disabled={googleLoading || !registrationOpen}
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
      ) : (
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
      )}
=======
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Services
          </h1>
          <p className="text-gray-600">
            Find the perfect service provider for your needs
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiMagnifyingGlass className="text-gray-400 text-xl" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for services..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center"
            >
              <HiAdjustmentsHorizontal className="text-xl" />
              Filters
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="relevance">Sort by: Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>

            <button
              onClick={handleSearch}
              className="px-8 py-3 bg-brand-700 text-white rounded-xl hover:bg-brand-800 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price (NPR)
                </label>
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, min: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price (NPR)
                </label>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, max: e.target.value })
                  }
                  placeholder="10000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setPriceRange({ min: "", max: "" });
                    setShowFilters(false);
                    setServices(allServices);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={applyPriceFilter}
                  className="px-6 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          {loadingCategories ? (
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide pb-2">
              <div className="flex gap-3 min-w-max">
                {/* All Services Button */}
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedCategory === "All"
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <FiHome className="w-5 h-5" />
                  All Services
                </button>

                {/* Dynamic Category Buttons */}
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                      selectedCategory === cat._id
                        ? "bg-green-600 text-white shadow-lg"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <CategoryIcon
                      iconKey={cat.iconKey}
                      categoryName={cat.name}
                      className="w-5 h-5"
                    />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            {loading
              ? "Loading..."
              : `${services.length} service${services.length === 1 ? "" : "s"} found${
                  selectedCategoryObject ? ` in ${selectedCategoryObject.name}` : ""
                }`}
          </p>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Top Providers (Last 30 Days)
              </h2>
              <p className="text-sm text-gray-600">
                Ranked by completed bookings, ratings, and response time
              </p>
            </div>
            <button
              onClick={() => navigate("/client/leaderboard")}
              className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View full leaderboard
              <HiArrowRight />
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Leaderboard data will appear here once rankings are generated.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaderboard.slice(0, 6).map((entry) => (
                <div
                  key={entry._id}
                  className="border rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">
                        {entry.providerId?.profile?.name
                          ? entry.providerId.profile.name.charAt(0).toUpperCase()
                          : "P"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 flex items-center gap-1">
                          {entry.providerId?.profile?.name || "Provider"}
                          {(entry.badges?.includes("Verified Provider") ||
                            entry.badges?.includes("verified")) && (
                            <span className="text-emerald-500" title="Verified Provider">
                              ✓
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">Rank #{entry.rank || "-"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                        Score {Math.round(entry.scores?.totalScore || entry.points || 0)}
                      </span>
                      {entry.trustScore > 0 && (
                        <span className="text-[10px] text-gray-500">
                          Trust: {entry.trustScore}/100
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <HiStar className="text-yellow-500" />
                      <span>{(entry.metrics?.avgRating || 0).toFixed(1)}</span>
                      <span className="text-gray-400">
                        ({entry.metrics?.reviewCount || 0})
                      </span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span>{entry.metrics?.completedBookings || 0} jobs</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Avg response {formatResponseTime(entry.metrics?.avgResponseMinutes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No services found
            </h2>
            <p className="text-gray-600">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const categoryMeta = getServiceCategoryMeta(service);

              return (
                <ServiceCard
                  key={service._id}
                  service={{
                    _id: service._id,
                    title: service.title,
                    description: service.description,
                    categoryName: categoryMeta.name,
                    categoryIcon: categoryMeta.iconKey,
                    category: service.categoryId,
                    subcategoryName: service.subcategoryId?.name,
                    images: service.images,
                    basePrice: service.basePrice,
                    priceRange: service.priceRange,
                    priceMode: service.priceMode,
                  }}
                  provider={{
                    _id: service.providerId._id,
                    name: service.providerId.profile?.name || "Provider",
                    avatar: service.providerId.profile?.avatarUrl,
                    kycStatus: service.providerId.kycStatus,
                    badges: service.providerId.providerDetails?.badges || [],
                    rating: service.providerId.providerDetails?.rating || {
                      average: 0,
                      count: 0,
                    },
                    completionRate:
                      service.providerId.providerDetails?.metrics?.completionRate || 0,
                    responseTimeMinutes:
                      service.providerId.providerDetails?.metrics?.responseSpeed || 0,
                  }}
                  onBook={handleBookService}
                />
              );
            })}
          </div>
        )}
      </div>
>>>>>>> b7cfe5e (Cleanup: remove extra folder, update all modules, and finalize correct repo structure)
    </div>
  );
}