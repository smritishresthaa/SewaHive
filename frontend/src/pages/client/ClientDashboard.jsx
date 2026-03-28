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

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchUserRank();
  }, []);

  async function fetchDashboardData() {
    try {
      const [upcomingRes, pastRes] = await Promise.all([
        api.get("/bookings/upcoming"),
        api.get("/bookings/past?limit=5"),
      ]);

      const upcoming = upcomingRes.data?.bookings || [];
      const past = pastRes.data?.bookings || [];

      setStats({
        upcomingBookings: upcoming.length,
        completedBookings: past.filter((b) => b.status === "completed").length,
        pendingBookings: upcoming.filter((b) => b.status === "requested").length,
      });

      setRecentBookings(upcoming.slice(0, 3));
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserRank() {
    try {
      setLoadingRank(true);
      const res = await api.get("/leaderboard/current?range=30d");
      const leaderboardData = res.data?.data || [];
      setUserRankData(leaderboardData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load rank data:", err.message);
      setUserRankData(null);
    } finally {
      setLoadingRank(false);
    }
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

  return (
    <ClientLayout>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Welcome back, {user?.profile?.name || "there"}! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Manage your bookings and discover new services
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 sm:p-5 lg:p-6">
            <div className="mb-2 flex items-center justify-between">
              <HiCalendar className="text-3xl text-blue-500" />
            </div>
            <p className="text-sm text-gray-600">Upcoming Bookings</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stats.upcomingBookings}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 sm:p-5 lg:p-6">
            <div className="mb-2 flex items-center justify-between">
              <HiCheckCircle className="text-3xl text-green-500" />
            </div>
            <p className="text-sm text-gray-600">Completed Services</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stats.completedBookings}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 sm:p-5 lg:p-6">
            <div className="mb-2 flex items-center justify-between">
              <HiClock className="text-3xl text-orange-500" />
            </div>
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stats.pendingBookings}
            </p>
          </div>
        </div>

        <div className="mb-8">
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
                  Top Providers (Last 30 Days)
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Based on ratings, bookings & response time
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
                  key={entry._id}
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
                      ⭐ {(entry.metrics?.avgRating || 0).toFixed(1)} •{" "}
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
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              Your Upcoming Bookings
            </h2>
            <button
              onClick={() => navigate("/client/bookings")}
              className="flex items-center gap-1 text-sm font-medium text-brand-700 transition-all hover:gap-2"
            >
              View All
              <HiArrowRight />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">📅</div>
              <p className="mb-4 text-gray-500">No upcoming bookings</p>
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
                <div
                  key={booking._id}
                  className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-gray-900">
                      {booking.serviceId?.title || "Service"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {booking.providerId?.profile?.name || "Provider"} •{" "}
                      {new Date(
                        booking.schedule?.date || booking.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      NPR {booking.price}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "requested"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}