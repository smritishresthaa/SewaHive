import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProviderLayout from "../../layouts/ProviderLayout";
import { useAuth } from "../../context/AuthContext";
import {
  HiCurrencyDollar,
  HiCheckCircle,
  HiClock,
  HiStar,
  HiArrowRight,
  HiShieldCheck,
  HiExclamationTriangle,
  HiTrophy,
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { normalizeKycStatus } from "../../utils/kyc";

export default function ProviderDashboard() {
  const { user, updateUser, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    rating: 0,
    ratingCount: 0,
    serviceCount: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankData, setRankData] = useState(null);
  const [loadingRank, setLoadingRank] = useState(true);

  const [trustData, setTrustData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    setupRealtimeListener();
  }, []);

  useEffect(() => {
    fetchRankData();
  }, []);

  function setupRealtimeListener() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    let source;
    let retryTimer;

    const connect = () => {
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);
      source.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === "notification") {
            const type = payload?.notification?.type;
            // Update KYC status in real-time when approved/rejected
            if ([
              "verification_approved",
              "verification_rejected",
              "verification_needs_correction",
            ].includes(type)) {
              fetchKycStatus();
              if (type === "verification_approved") {
                // Update user badge in context
                updateUser({
                  ...user,
                  providerDetails: {
                    ...user?.providerDetails,
                    badges: "verified",
                  },
                });
                // Fetch fresh user data to sync KYC status across app
                if (fetchUser) {
                  await fetchUser();
                }
                toast.success("🎉 Your KYC has been approved!");
              } else if (type === "verification_needs_correction") {
                toast(
                  "⚠️ Your KYC needs correction. Please review and resubmit.",
                  { icon: "📝" }
                );
              } else if (type === "verification_rejected") {
                toast.error("❌ Your KYC was rejected. Please contact support.");
              }
            }

            if (["payment_released", "payment_held", "payment_refunded"].includes(type)) {
              fetchDashboardData();
            }
          }
        } catch (err) {
          console.error("Error parsing notification", err);
        }
      };
      source.onerror = () => {
        source.close();
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      if (source) source.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }

  async function fetchKycStatus() {
    try {
      const res = await api.get("/providers/verification");
      setKycStatus(res.data?.verification || null);
    } catch (err) {
      console.error("Failed to fetch KYC status", err);
    }
  }

  async function fetchDashboardData() {
    try {
      // Fetch stats, bookings, reviews, KYC status, and trust data
      const [statsRes, bookingsRes, reviewsRes, kycRes, trustRes] = await Promise.all([
        api.get("/providers/stats"),
        api.get("/bookings/provider-bookings?limit=5"),
        api.get("/reviews/provider/" + user.id),
        api.get("/providers/verification"),
        api.get(`/providers/${user.id}/trust`).catch(() => ({ data: { trust: null } }))
      ]);

      // Use review stats if available, otherwise use stats from providers endpoint
      const reviewStats = reviewsRes.data.stats;
      const mergedStats = {
        ...statsRes.data.stats,
        rating: reviewStats?.averageRating || statsRes.data.stats?.rating || 0,
        ratingCount: reviewStats?.totalReviews || statsRes.data.stats?.ratingCount || 0,
      };

      setStats(mergedStats);
      setRecentBookings(bookingsRes.data.bookings || []);
      setKycStatus(kycRes.data?.verification || null);
      setTrustData(trustRes.data?.trust || null);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRankData() {
    try {
      setLoadingRank(true);
      const res = await api.get("/leaderboard/current?range=30d");
      const leaderboardData = res.data?.data || [];
      const myRank = leaderboardData.find((entry) => entry.providerId?._id === user?.id);
      setRankData(myRank || null);
    } catch (err) {
      console.error("Failed to load rank data:", err.message);
      setRankData(null);
    } finally {
      setLoadingRank(false);
    }
  }

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </ProviderLayout>
    );
  }

  const normalizedKycStatus = normalizeKycStatus(kycStatus?.status);

  return (
    <ProviderLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.profile?.name || "Provider"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your services today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <HiCurrencyDollar className="text-3xl opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                All Time
              </span>
            </div>
            <p className="text-white/80 text-sm">Total Earnings</p>
            <p className="text-3xl font-bold mt-1">
              NPR {(stats.totalEarnings || 0).toLocaleString()}
            </p>
          </div>

          {/* Completed Jobs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiCheckCircle className="text-3xl text-green-500" />
            </div>
            <p className="text-gray-600 text-sm">Completed Jobs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.completedBookings || 0}
            </p>
          </div>

          {/* Pending Requests */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiClock className="text-3xl text-orange-500" />
            </div>
            <p className="text-gray-600 text-sm">Pending Requests</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.pendingBookings || 0}
            </p>
          </div>

          {/* Rating */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <HiStar className="text-3xl text-yellow-500" />
            </div>
            <p className="text-gray-600 text-sm">Your Rating</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {stats.rating ? stats.rating.toFixed(1) : "N/A"}
              {stats.ratingCount > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({stats.ratingCount})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* KYC Verification Status */}
        <div className="mb-8">
          {normalizedKycStatus === "approved" ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <HiShieldCheck className="text-3xl text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-emerald-900">✅ KYC Verified</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    Your identity has been verified. You're ready to provide services!
                  </p>
                </div>
              </div>
            </div>
          ) : normalizedKycStatus === "needs_correction" ? (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <HiExclamationTriangle className="text-3xl text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900">⚠️ KYC Needs Correction</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Some documents need to be resubmitted. Please review the feedback and reupload.
                  </p>
                  <button
                    onClick={() => navigate("/provider/verification")}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900 mt-2 underline"
                  >
                    Fix KYC →
                  </button>
                </div>
              </div>
            </div>
          ) : normalizedKycStatus === "pending_review" ? (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <HiClock className="text-3xl text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900">⏳ KYC Pending Review</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    We're reviewing your documents. This usually takes 24 hours.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <HiExclamationTriangle className="text-3xl text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">📝 KYC Not Submitted</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    You need to complete KYC verification to receive bookings.
                  </p>
                  <p className="text-xs text-rose-600 font-semibold mt-2">
                    ⚠️ Cannot accept bookings or publish services until KYC is approved.
                  </p>
                  <button
                    onClick={() => navigate("/provider/verification")}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-800 mt-2 underline"
                  >
                    Complete KYC →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trust Center */}
        {trustData && (
          <div className="mb-8 bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HiShieldCheck className="text-emerald-500" /> Trust Center
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/provider/skills")}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-800 underline"
                >
                  Manage Skill Proofs →
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Trust Score:</span>
                  <span className={`text-lg font-bold ${trustData.trustScore >= 80 ? 'text-emerald-600' : trustData.trustScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {trustData.trustScore}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Your Badges</h3>
                {trustData.badges && trustData.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {trustData.badges.map((badge, idx) => (
                      <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium flex items-center gap-1">
                        <HiCheckCircle /> {badge}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No badges earned yet. Complete more jobs to earn badges!</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Performance Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rating Quality:</span>
                    <span className="font-medium">{trustData.metrics?.ratingQuality?.toFixed(1) || 0}/5.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed Jobs:</span>
                    <span className="font-medium">{trustData.metrics?.completedJobs || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Response Speed:</span>
                    <span className="font-medium">{trustData.metrics?.responseSpeed || 0} mins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cancellation Rate:</span>
                    <span className="font-medium">{trustData.metrics?.cancellationRate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Rank This Month */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HiTrophy className="text-amber-500" /> Your Rank (Last 30 Days)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Based on completed bookings, ratings & response time
              </p>
            </div>
          </div>

          {loadingRank ? (
            <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ) : rankData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-6 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                <div className="text-6xl font-black text-amber-600">
                  #{rankData.rank || "-"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-700 font-medium">Overall Score</p>
                  <p className="text-4xl font-bold text-amber-900">
                    {Math.round(rankData.scores?.totalScore || rankData.points || 0)}
                  </p>
                </div>
                {rankData.scores?.totalScore && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-2">Score Breakdown</p>
                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${Math.min(rankData.scores.bookingScore, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right">Bookings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500"
                            style={{
                              width: `${Math.min(rankData.scores.ratingScore, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right">Ratings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${Math.min(rankData.scores.speedScore, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right">Speed</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-gray-600 text-sm mb-2">Completed Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rankData.metrics?.completedBookings || 0}
                  </p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-gray-600 text-sm mb-2">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                    <HiStar /> {(rankData.metrics?.avgRating || 0).toFixed(1)}
                  </p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-gray-600 text-sm mb-2">Avg Response Time</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {rankData.metrics?.avgResponseMinutes
                      ? rankData.metrics.avgResponseMinutes < 60
                        ? `${Math.round(rankData.metrics.avgResponseMinutes)} min`
                        : `${(rankData.metrics.avgResponseMinutes / 60).toFixed(1)} hr`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>You're not ranked yet. Complete bookings to appear on the leaderboard!</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Recent Booking Requests
            </h2>
            <button
              onClick={() => navigate("/provider/bookings")}
              className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All
              <HiArrowRight />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No booking requests yet</p>
              <p className="text-sm text-gray-400 mt-1">
                New requests will appear here
              </p>
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
                      {booking.clientId?.profile?.name || "Client"} •{" "}
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
                        booking.status === "requested"
                          ? "bg-yellow-100 text-yellow-700"
                          : booking.status === "accepted"
                          ? "bg-green-100 text-green-700"
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
    </ProviderLayout>
  );
}

