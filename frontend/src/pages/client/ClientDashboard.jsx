import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../layouts/ClientLayout";
import { useAuth } from "../../context/AuthContext";
import {
  HiCalendar,
  HiClock,
  HiCheckCircle,
  HiArrowRight,
  HiMagnifyingGlass,
} from "react-icons/hi2";
import {
  FiHome,
  FiDroplet,
  FiZap,
  FiTool,
  FiPenTool,
  FiSun,
} from "react-icons/fi";
import { MdEmojiEvents } from "react-icons/md";
import api from "../../utils/axios";

const QUICK_SERVICES = [
  {
    name: "Cleaning",
    icon: FiHome,
    category: "Cleaning",
    subtitle: "Home & office care",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
  {
    name: "Plumbing",
    icon: FiDroplet,
    category: "Plumbing",
    subtitle: "Repairs & fittings",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
  {
    name: "Electrical",
    icon: FiZap,
    category: "Electrical",
    subtitle: "Wiring & maintenance",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
  {
    name: "Carpentry",
    icon: FiTool,
    category: "Carpentry",
    subtitle: "Woodwork solutions",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
  {
    name: "Painting",
    icon: FiPenTool,
    category: "Painting",
    subtitle: "Interior & exterior",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
  {
    name: "Gardening",
    icon: FiSun,
    category: "Gardening",
    subtitle: "Outdoor upkeep",
    theme: {
      hoverBg: "group-hover:bg-emerald-50",
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "group-hover:border-emerald-200",
    },
  },
];

const DASHBOARD_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function getRankBadgeClass(idx) {
  if (idx === 0) {
    return "bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm";
  }
  if (idx === 1) {
    return "bg-slate-500 text-white ring-4 ring-slate-100 shadow-sm";
  }
  if (idx === 2) {
    return "bg-orange-600 text-white ring-4 ring-orange-100 shadow-sm";
  }

  return "bg-brand-700 text-white ring-4 ring-brand-100 shadow-sm";
}

function getLeaderboardRange(range, customFrom, customTo) {
  if (range === "today") return "week";
  if (range === "week") return "week";
  if (range === "month") return "month";
  if (range === "year") return "year";
  if (range === "custom" && customFrom && customTo) return "custom";
  return "month";
}

function formatSelectedRangeLabel(range, customFrom, customTo) {
  if (range === "today") return "today";
  if (range === "week") return "this week";
  if (range === "month") return "this month";
  if (range === "year") return "this year";
  if (range === "custom" && customFrom && customTo) {
    return `${customFrom} to ${customTo}`;
  }
  return "this month";
}

function getLeaderboardHeadingLabel(range, customFrom, customTo) {
  if (range === "today") return "This Week";
  if (range === "week") return "This Week";
  if (range === "month") return "This Month";
  if (range === "year") return "This Year";
  if (range === "custom" && customFrom && customTo) return "Custom Range";
  return "This Month";
}

function isStrictUpcomingBooking(booking) {
  return ["accepted", "confirmed"].includes(String(booking?.status || ""));
}

function getBookingDisplayDate(booking) {
  const rawDate =
    booking?.schedule?.date || booking?.scheduledAt || booking?.createdAt;

  if (!rawDate) return "Date not available";

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Date not available";

  return date.toLocaleDateString();
}

function getStatCardStyles(type) {
  if (type === "upcoming") {
    return {
      iconWrap: "bg-blue-100 text-blue-600",
      ring: "group-hover:ring-blue-100",
      border: "group-hover:border-blue-200",
      icon: HiCalendar,
      valueColor: "text-gray-900",
      label: "Upcoming Bookings",
      subtext: "Accepted and confirmed bookings",
      glow: "bg-blue-100/80",
    };
  }

  if (type === "completed") {
    return {
      iconWrap: "bg-emerald-100 text-emerald-600",
      ring: "group-hover:ring-emerald-100",
      border: "group-hover:border-emerald-200",
      icon: HiCheckCircle,
      valueColor: "text-gray-900",
      label: "Completed Services",
      subtext: "Finished bookings in selected range",
      glow: "bg-emerald-100/80",
    };
  }

  return {
    iconWrap: "bg-orange-100 text-orange-600",
    ring: "group-hover:ring-orange-100",
    border: "group-hover:border-orange-200",
    icon: HiClock,
    valueColor: "text-gray-900",
    label: "Pending Requests",
    subtext: "Requests waiting for provider action",
    glow: "bg-orange-100/80",
  };
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedRange, setSelectedRange] = useState("month");
  const [appliedRange, setAppliedRange] = useState("month");

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");

  const [stats, setStats] = useState({
    upcomingBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRankData, setUserRankData] = useState(null);
  const [loadingRank, setLoadingRank] = useState(true);

  useEffect(() => {
    if (selectedRange !== "custom") {
      setAppliedRange(selectedRange);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchDashboardData(appliedRange, appliedCustomFrom, appliedCustomTo);
    fetchUserRank(appliedRange, appliedCustomFrom, appliedCustomTo);

    const iv = setInterval(() => {
      if (!document.hidden) {
        fetchDashboardData(appliedRange, appliedCustomFrom, appliedCustomTo);
        fetchUserRank(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    }, 30000);

    const vis = () => {
      if (!document.hidden) {
        fetchDashboardData(appliedRange, appliedCustomFrom, appliedCustomTo);
        fetchUserRank(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    };

    document.addEventListener("visibilitychange", vis);

    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedRange, appliedCustomFrom, appliedCustomTo]);

  function buildRangeParams(range, fromDate, toDate, limit) {
    const params = {};
    if (limit != null) params.limit = limit;

    if (range === "custom" && fromDate && toDate) {
      params.range = "custom";
      params.from = fromDate;
      params.to = toDate;
    } else {
      params.range = range;
    }

    return params;
  }

  async function fetchDashboardData(
    range = appliedRange,
    fromDate = appliedCustomFrom,
    toDate = appliedCustomTo
  ) {
    try {
      setLoading(true);

      const upcomingParams = buildRangeParams(range, fromDate, toDate);
      const pastParams = buildRangeParams(range, fromDate, toDate);

      const [upcomingRes, pastRes] = await Promise.all([
        api.get("/bookings/upcoming", {
          params: upcomingParams,
        }),
        api.get("/bookings/past", {
          params: pastParams,
        }),
      ]);

      const upcoming = upcomingRes.data?.bookings || [];
      const past = pastRes.data?.bookings || [];
      const strictUpcoming = upcoming.filter(isStrictUpcomingBooking);

      setStats({
        upcomingBookings: strictUpcoming.length,
        completedBookings: past.filter((b) => b.status === "completed").length,
        pendingBookings: upcoming.filter((b) => b.status === "requested").length,
      });

      setRecentBookings(strictUpcoming.slice(0, 3));
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setStats({
        upcomingBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
      });
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserRank(
    range = appliedRange,
    fromDate = appliedCustomFrom,
    toDate = appliedCustomTo
  ) {
    try {
      setLoadingRank(true);

      const leaderboardRange = getLeaderboardRange(range, fromDate, toDate);
      const params = {};

      if (leaderboardRange === "custom" && fromDate && toDate) {
        params.range = "custom";
        params.from = fromDate;
        params.to = toDate;
      } else {
        params.range = leaderboardRange;
      }

      const res = await api.get("/leaderboard/current", {
        params,
      });

      const leaderboardData = res.data?.data || [];
      setUserRankData(leaderboardData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load rank data:", err.message);
      setUserRankData(null);
    } finally {
      setLoadingRank(false);
    }
  }

  function handleRangeSelect(rangeValue) {
    setSelectedRange(rangeValue);

    if (rangeValue !== "custom") {
      setAppliedRange(rangeValue);
    }
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;

    setAppliedCustomFrom(customFrom);
    setAppliedCustomTo(customTo);
    setAppliedRange("custom");
  }

  function handleResetCustomRange() {
    setCustomFrom("");
    setCustomTo("");
    setAppliedCustomFrom("");
    setAppliedCustomTo("");
    setSelectedRange("month");
    setAppliedRange("month");
  }

  function goToBookingHistoryTab(filterValue, bookingId = null) {
    navigate("/client/bookings", {
      state: {
        initialFilter: filterValue,
        highlightBookingId: bookingId || null,
      },
    });
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const upcomingCard = getStatCardStyles("upcoming");
  const completedCard = getStatCardStyles("completed");
  const pendingCard = getStatCardStyles("pending");

  return (
    <ClientLayout>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-onboarding="client-dashboard-hero" className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Welcome back, {user?.profile?.name || "there"}
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Manage your bookings and discover new services
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {DASHBOARD_RANGES.map((item) => {
                const active = selectedRange === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleRangeSelect(item.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      active
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {selectedRange === "custom" && (
              <div className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-end lg:w-auto">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">
                    From
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">
                    To
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    disabled={!customFrom || !customTo || customFrom > customTo}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCustomRange}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => goToBookingHistoryTab("confirmed")}
            className={`group relative overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm ring-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${upcomingCard.border} ${upcomingCard.ring} sm:p-6`}
          >
            <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${upcomingCard.glow} blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className={`absolute right-8 top-10 h-28 w-28 rounded-full ${upcomingCard.glow} opacity-60 blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex items-start justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${upcomingCard.iconWrap}`}
                >
                  <upcomingCard.icon className="text-2xl" />
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  View
                  <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">
                  {upcomingCard.label}
                </p>
                <p className={`mt-2 text-4xl font-bold ${upcomingCard.valueColor}`}>
                  {stats.upcomingBookings}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {upcomingCard.subtext}
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => goToBookingHistoryTab("completed")}
            className={`group relative overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm ring-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${completedCard.border} ${completedCard.ring} sm:p-6`}
          >
            <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${completedCard.glow} blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className={`absolute right-8 top-10 h-28 w-28 rounded-full ${completedCard.glow} opacity-60 blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex items-start justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${completedCard.iconWrap}`}
                >
                  <completedCard.icon className="text-2xl" />
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  View
                  <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">
                  {completedCard.label}
                </p>
                <p className={`mt-2 text-4xl font-bold ${completedCard.valueColor}`}>
                  {stats.completedBookings}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {completedCard.subtext}
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => goToBookingHistoryTab("requested")}
            className={`group relative overflow-hidden rounded-3xl border bg-white p-5 text-left shadow-sm ring-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${pendingCard.border} ${pendingCard.ring} sm:p-6 sm:col-span-2 xl:col-span-1`}
          >
            <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${pendingCard.glow} blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className={`absolute right-8 top-10 h-28 w-28 rounded-full ${pendingCard.glow} opacity-60 blur-3xl transition-all duration-300 group-hover:scale-110`} />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="mb-6 flex items-start justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${pendingCard.iconWrap}`}
                >
                  <pendingCard.icon className="text-2xl" />
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  View
                  <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">
                  {pendingCard.label}
                </p>
                <p className={`mt-2 text-4xl font-bold ${pendingCard.valueColor}`}>
                  {stats.pendingBookings}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {pendingCard.subtext}
                </p>
              </div>
            </div>
          </button>
        </div>

        <div data-onboarding="client-browse-services" className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
            Browse Services
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {QUICK_SERVICES.map((service) => {
              const Icon = service.icon;

              return (
                <button
                  key={service.name}
                  onClick={() => navigate(`/services?category=${service.category}`)}
                  className={`group relative rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-300 hover:shadow-md ${service.theme.border}`}
                >
                  <div
                    className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ${service.theme.hoverBg} group-hover:opacity-100`}
                  />

                  <div className="relative z-10">
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${service.theme.iconWrap}`}
                    >
                      <Icon className="text-xl" />
                    </div>

                    <p className="text-sm font-semibold text-gray-800">{service.name}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {service.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border bg-white p-4 sm:p-5 lg:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MdEmojiEvents className="text-2xl text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">
                  Top Providers (
                  {getLeaderboardHeadingLabel(
                    appliedRange,
                    appliedCustomFrom,
                    appliedCustomTo
                  )}
                  )
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Based on ratings, bookings and response time
              </p>
            </div>

            <button
              onClick={() => navigate("/services")}
              className="flex items-center gap-1 text-sm font-medium text-brand-700 transition-all hover:gap-2"
            >
              View all
              <HiArrowRight />
            </button>
          </div>

          {loadingRank ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : userRankData && userRankData.length > 0 ? (
            <div className="space-y-3">
              {userRankData.map((entry, idx) => (
                <div
                  key={entry._id || entry.providerId?._id || idx}
                  className="flex flex-col gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getRankBadgeClass(
                      idx
                    )}`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {entry.providerId?.profile?.name || "Provider"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Rating {(entry.metrics?.avgRating || 0).toFixed(1)} •{" "}
                      {entry.metrics?.completedBookings || 0} jobs
                    </p>
                  </div>

                  <span className="w-fit whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    {Math.round(entry.scores?.totalScore || entry.points || 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">
              Leaderboard data will appear here soon
            </div>
          )}
        </div>

        <div className="brand-gradient relative mb-8 overflow-hidden rounded-2xl p-4 text-white shadow-lg sm:p-6 lg:p-8">
          <div className="relative z-10">
            <h2 className="mb-2 text-xl font-bold sm:text-2xl">Need a service?</h2>
            <p className="mb-6 text-white/90">
              Search from hundreds of verified providers in your area
            </p>
            <button
              onClick={() => navigate("/services")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-brand-700 transition-all hover:shadow-lg sm:w-auto"
            >
              <HiMagnifyingGlass className="text-xl" />
              Browse All Services
            </button>
          </div>
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-brand-500 opacity-50 blur-3xl" />
        </div>

        <div className="rounded-2xl border bg-white p-4 sm:p-5 lg:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                Your Upcoming Bookings
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Filtered by{" "}
                {formatSelectedRangeLabel(
                  appliedRange,
                  appliedCustomFrom,
                  appliedCustomTo
                )}
              </p>
            </div>

            <button
              onClick={() => goToBookingHistoryTab("confirmed")}
              className="flex items-center gap-1 text-sm font-medium text-brand-700 transition-all hover:gap-2"
            >
              View All
              <HiArrowRight />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <HiCalendar className="text-3xl" />
              </div>
              <p className="mb-2 text-base font-medium text-gray-800">
                No accepted or confirmed bookings
              </p>
              <p className="mb-5 text-sm text-gray-500">
                Accepted and confirmed bookings in the selected range will appear here.
              </p>
              <button
                onClick={() => navigate("/services")}
                className="rounded-lg bg-brand-700 px-6 py-2 text-white transition-colors hover:bg-brand-800"
              >
                Book a Service
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() => goToBookingHistoryTab("confirmed", booking._id)}
                  className="group flex w-full flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200">
                      <HiCalendar className="text-xl" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-gray-900">
                        {booking.serviceId?.title || "Service"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {booking.providerId?.profile?.name || "Provider"} •{" "}
                        {getBookingDisplayDate(booking)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      NPR {booking.price}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "accepted"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                      View
                      <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}