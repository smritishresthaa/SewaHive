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
  HiStar,
} from "react-icons/hi2";
import api from "../../utils/axios";

const QUICK_SERVICES = [
  { name: "Cleaning", icon: "🧹", category: "Cleaning" },
  { name: "Plumbing", icon: "💧", category: "Plumbing" },
  { name: "Electrical", icon: "⚡", category: "Electrical" },
  { name: "Carpentry", icon: "🔨", category: "Carpentry" },
  { name: "Painting", icon: "🎨", category: "Painting" },
  { name: "Gardening", icon: "🌱", category: "Gardening" },
];

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

      const upcoming = upcomingRes.data.bookings || [];
      const past = pastRes.data.bookings || [];

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
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.profile?.name || "there"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your bookings and discover new services
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiCalendar className="text-3xl text-blue-500" />
            </div>
            <p className="text-gray-600 text-sm">Upcoming Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.upcomingBookings}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiCheckCircle className="text-3xl text-green-500" />
            </div>
            <p className="text-gray-600 text-sm">Completed Services</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.completedBookings}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiClock className="text-3xl text-orange-500" />
            </div>
            <p className="text-gray-600 text-sm">Pending Requests</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.pendingBookings}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Browse Services
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {QUICK_SERVICES.map((service) => (
              <button
                key={service.name}
                onClick={() => navigate(`/services?category=${service.category}`)}
                className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md hover:border-brand-500 transition-all group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {service.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Widget */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                🏆 Top Providers (Last 30 Days)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Based on ratings, bookings & response time
              </p>
            </div>
            <button
              onClick={() => navigate("/services")}
              className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all
              <HiArrowRight />
            </button>
          </div>

          {loadingRank ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : userRankData && userRankData.length > 0 ? (
            <div className="space-y-3">
              {userRankData.map((entry, idx) => (
                <div
                  key={entry._id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white bg-gradient-to-br from-brand-600 to-brand-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {entry.providerId?.profile?.name || "Provider"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ⭐ {(entry.metrics?.avgRating || 0).toFixed(1)} • {entry.metrics?.completedBookings || 0} jobs
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap">
                    {Math.round(entry.scores?.totalScore || entry.points || 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Leaderboard data will appear here soon
            </div>
          )}
        </div>

        {/* Search Services */}
            <div className="brand-gradient rounded-2xl shadow-lg p-8 mb-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">
                Need a service?
              </h2>
              <p className="text-white/90 mb-6">
                Search from hundreds of verified providers in your area
              </p>
              <button
                onClick={() => navigate("/services")}
                className="bg-white text-brand-700 px-8 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <HiMagnifyingGlass className="text-xl" />
                Browse All Services
              </button>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-brand-500 rounded-full opacity-50 blur-3xl"></div>
          </div>
        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Your Upcoming Bookings
            </h2>
            <button
              onClick={() => navigate("/client/bookings")}
              className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All
              <HiArrowRight />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-500 mb-4">No upcoming bookings</p>
              <button
                onClick={() => navigate("/services")}
                className="bg-brand-700 text-white px-6 py-2 rounded-lg hover:bg-brand-800 transition-colors"
              >
                Book a Service
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {booking.serviceId?.title || "Service"}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {booking.providerId?.profile?.name || "Provider"} •{" "}
                      {new Date(
                        booking.schedule?.date || booking.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      NPR {booking.price}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
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

