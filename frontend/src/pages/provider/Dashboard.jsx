import { useState, useEffect, useMemo } from "react";
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
  HiDocumentCheck,
  HiMiniCheckBadge,
  HiCalendarDays,
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { normalizeKycStatus } from "../../utils/kyc";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

function formatCurrency(value) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function startCaseStatus(status) {
  if (!status) return "Unknown";
  return String(status)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusMeta(status) {
  const normalized = String(status || "").toLowerCase().replace(/-/g, "_");

  const map = {
    requested: {
      label: "Pending approval",
      tone: "bg-amber-100 text-amber-800 border-amber-200",
    },
    pending: {
      label: "Pending",
      tone: "bg-amber-100 text-amber-800 border-amber-200",
    },
    accepted: {
      label: "Accepted",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    confirmed: {
      label: "Confirmed",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    in_progress: {
      label: "In progress",
      tone: "bg-blue-100 text-blue-800 border-blue-200",
    },
    pending_completion: {
      label: "Awaiting completion",
      tone: "bg-sky-100 text-sky-800 border-sky-200",
    },
    completed: {
      label: "Completed",
      tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    rejected: {
      label: "Rejected",
      tone: "bg-gray-100 text-gray-700 border-gray-200",
    },
    cancelled: {
      label: "Cancelled",
      tone: "bg-rose-100 text-rose-800 border-rose-200",
    },
    canceled: {
      label: "Cancelled",
      tone: "bg-rose-100 text-rose-800 border-rose-200",
    },
    refunded: {
      label: "Refunded",
      tone: "bg-rose-100 text-rose-800 border-rose-200",
    },
    resolved_refunded: {
      label: "Refunded",
      tone: "bg-rose-100 text-rose-800 border-rose-200",
    },
  };

  return (
    map[normalized] || {
      label: startCaseStatus(status),
      tone: "bg-gray-100 text-gray-700 border-gray-200",
    }
  );
}

function getKycBannerContent(status) {
  if (status === "needs_correction") {
    return {
      title: "KYC needs correction",
      description:
        "Some verification details need to be updated before your provider account can fully progress.",
      cta: "Fix verification",
      icon: HiExclamationTriangle,
      wrapper: "border-amber-200 bg-amber-50/80",
      iconWrap: "bg-amber-100",
      iconColor: "text-amber-700",
      titleColor: "text-amber-950",
      bodyColor: "text-amber-800",
      buttonColor:
        "text-amber-900 hover:text-amber-950 border-amber-300 hover:bg-amber-100",
    };
  }

  if (status === "pending_review") {
    return {
      title: "KYC under review",
      description:
        "Your submitted documents are currently being reviewed. Status will update automatically.",
      cta: null,
      icon: HiClock,
      wrapper: "border-blue-200 bg-blue-50/80",
      iconWrap: "bg-blue-100",
      iconColor: "text-blue-700",
      titleColor: "text-blue-950",
      bodyColor: "text-blue-800",
      buttonColor: "",
    };
  }

  return {
    title: "Complete your KYC",
    description:
      "Verification helps build provider trust and supports a stronger service profile.",
    cta: "Complete now",
    icon: HiDocumentCheck,
    wrapper: "border-gray-200 bg-gray-50/80",
    iconWrap: "bg-gray-100",
    iconColor: "text-gray-700",
    titleColor: "text-gray-950",
    bodyColor: "text-gray-700",
    buttonColor:
      "text-emerald-800 hover:text-emerald-900 border-emerald-200 hover:bg-emerald-50",
  };
}

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
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingRank, setLoadingRank] = useState(true);
  const [trustData, setTrustData] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
    fetchRankData();
    const cleanup = setupRealtimeListener();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function setupRealtimeListener() {
    const token = localStorage.getItem("accessToken");
    if (!token) return () => {};

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

            if (
              [
                "verification_approved",
                "verification_rejected",
                "verification_needs_correction",
              ].includes(type)
            ) {
              fetchKycStatus();

              if (type === "verification_approved") {
                updateUser({
                  ...user,
                  providerDetails: {
                    ...user?.providerDetails,
                    badges: "verified",
                  },
                });

                if (fetchUser) {
                  await fetchUser();
                }

                toast.success("Your KYC has been approved");
              } else if (type === "verification_needs_correction") {
                toast("Your KYC needs correction. Please review and resubmit.");
              } else if (type === "verification_rejected") {
                toast.error("Your KYC was rejected. Please contact support.");
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
      const [statsRes, bookingsRes, reviewsRes, kycRes, trustRes] = await Promise.all([
        api.get("/providers/stats"),
        api.get("/bookings/provider-bookings?limit=5"),
        api.get("/reviews/provider/" + user.id),
        api.get("/providers/verification"),
        api.get(`/providers/${user.id}/trust`).catch(() => ({ data: { trust: null } })),
      ]);

      const reviewStats = reviewsRes.data?.stats || {};

      const mergedStats = {
        ...statsRes.data?.stats,
        rating: reviewStats?.averageRating || statsRes.data?.stats?.rating || 0,
        ratingCount: reviewStats?.totalReviews || statsRes.data?.stats?.ratingCount || 0,
      };

      setStats(mergedStats);
      setRecentBookings(bookingsRes.data?.bookings || []);
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
      const data = res.data?.data || [];

      setLeaderboardData(data);

      const myRank = data.find((entry) => entry.providerId?._id === user?.id);
      setRankData(myRank || null);
    } catch (err) {
      console.error("Failed to load rank data:", err.message);
      setRankData(null);
      setLeaderboardData([]);
    } finally {
      setLoadingRank(false);
    }
  }

  const normalizedKycStatus = normalizeKycStatus(kycStatus?.status);

  const trustScore = Number(trustData?.trustScore || 0);
  const ratingQuality = Number(trustData?.metrics?.ratingQuality || stats.rating || 0);
  const completedJobs = Number(
    trustData?.metrics?.completedJobs || stats.completedBookings || 0
  );
  const cancellationRate = Number(trustData?.metrics?.cancellationRate || 0);

  const providerBadges = useMemo(() => {
    if (!trustData?.badges || !Array.isArray(trustData.badges)) return [];
    return trustData.badges;
  }, [trustData]);

  const hasProBadge = providerBadges.some(
    (badge) => String(badge).trim().toLowerCase() === "pro"
  );

  const topThree = useMemo(() => {
    return (leaderboardData || []).slice(0, 3);
  }, [leaderboardData]);

  const pendingCount = Number(stats.pendingBookings || 0);
  const totalEarnings = Number(stats.totalEarnings || 0);
  const ratingCount = Number(stats.ratingCount || 0);

  const kycBanner = getKycBannerContent(normalizedKycStatus);
  const KycIcon = kycBanner.icon;

  const trustRingData = [{ name: "Trust", value: Math.max(0, Math.min(trustScore, 100)) }];

  const ratingPieData = [
    { name: "Score", value: Math.max(0, Math.min((ratingQuality / 5) * 100, 100)) },
    { name: "Remaining", value: 100 - Math.max(0, Math.min((ratingQuality / 5) * 100, 100)) },
  ];

  const performanceBarData = [
    {
      name: "Trust",
      value: Math.max(0, Math.min(trustScore, 100)),
    },
    {
      name: "Rating",
      value: Math.max(0, Math.min((ratingQuality / 5) * 100, 100)),
    },
    {
      name: "Jobs",
      value: Math.max(0, Math.min(completedJobs, 100)),
    },
    {
      name: "Cancel",
      value: Math.max(0, Math.min(cancellationRate, 100)),
    },
  ];

  const trendAreaData = [
    {
      name: "Earnings",
      value: Math.max(0, totalEarnings * 0.2),
    },
    {
      name: "Bookings",
      value: Math.max(0, completedJobs * 0.8 + pendingCount * 2),
    },
    {
      name: "Rating",
      value: Math.max(0, ratingQuality * 16),
    },
    {
      name: "Trust",
      value: Math.max(0, trustScore),
    },
  ];

  const kpiItems = [
    {
      title: "Total Earnings",
      value: formatCurrency(totalEarnings),
      sub: "All-time",
      icon: HiCurrencyDollar,
      iconWrap: "bg-emerald-100",
      iconColor: "text-emerald-700",
    },
    {
      title: "Completed Jobs",
      value: `${stats.completedBookings || 0}`,
      sub: "Delivered successfully",
      icon: HiCheckCircle,
      iconWrap: "bg-emerald-100",
      iconColor: "text-emerald-700",
    },
    {
      title: "Pending Requests",
      value: `${pendingCount}`,
      sub: "Needs provider attention",
      icon: HiClock,
      iconWrap: "bg-amber-100",
      iconColor: "text-amber-700",
    },
    {
      title: "Average Rating",
      value: stats.rating ? stats.rating.toFixed(1) : "N/A",
      sub: ratingCount > 0 ? `${ratingCount} reviews` : "No reviews yet",
      icon: HiStar,
      iconWrap: "bg-yellow-100",
      iconColor: "text-yellow-700",
    },
  ];

  const trustLabel =
    trustScore >= 80 ? "Strong" : trustScore >= 50 ? "Moderate" : "Needs work";

  const trustBadgeTone =
    trustScore >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : trustScore >= 50
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-rose-100 text-rose-800 border-rose-200";

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                Provider Dashboard
              </h1>

              {normalizedKycStatus === "approved" && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600">
                    <HiMiniCheckBadge className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-sm font-semibold text-emerald-800">Verified</span>
                </div>
              )}

              {hasProBadge && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600">
                    <HiShieldCheck className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-sm font-semibold text-sky-800">Pro</span>
                </div>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-700 sm:text-base">
              Welcome back, {user?.profile?.name || "Provider"}. Here is your current
              performance and booking overview.
            </p>
          </div>

          <div className="text-sm text-gray-600">
            {rankData ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-900">
                Rank #{rankData.rank || "-"} this month
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 font-medium text-gray-700">
                Live provider overview
              </span>
            )}
          </div>
        </div>

        {normalizedKycStatus !== "approved" && (
          <div className={`mb-8 rounded-3xl border px-5 py-4 ${kycBanner.wrapper}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${kycBanner.iconWrap}`}>
                  <KycIcon className={`h-5 w-5 ${kycBanner.iconColor}`} />
                </div>

                <div>
                  <h2 className={`text-sm font-bold ${kycBanner.titleColor}`}>
                    {kycBanner.title}
                  </h2>
                  <p className={`mt-1 text-sm ${kycBanner.bodyColor}`}>
                    {kycBanner.description}
                  </p>
                </div>
              </div>

              {kycBanner.cta && (
                <button
                  onClick={() => navigate("/provider/verification")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${kycBanner.buttonColor}`}
                >
                  {kycBanner.cta}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{item.title}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{item.sub}</p>
                  </div>

                  <div className={`rounded-2xl p-3 ${item.iconWrap}`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.6fr,1fr]">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-950">Performance Overview</h2>
                <p className="mt-1 text-sm text-gray-600">
                  A more realistic snapshot of provider activity and quality.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Live
              </span>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[260px,1fr]">
              <div className="flex flex-col justify-between rounded-3xl bg-gray-50 p-5">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">
                      Trust Score
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${trustBadgeTone}`}
                    >
                      {trustLabel}
                    </span>
                  </div>

                  <div className="relative mx-auto h-52 w-full max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="72%"
                        outerRadius="100%"
                        barSize={14}
                        data={trustRingData}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          angleAxisId={0}
                          tick={false}
                        />
                        <RadialBar
                          background={{ fill: "#e5e7eb" }}
                          dataKey="value"
                          cornerRadius={18}
                          fill="#059669"
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-4xl font-black text-gray-950">{trustScore}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Out of 100
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-sm leading-6 text-gray-600">
                    Based on provider signals like rating quality, completed work,
                    verification strength, and cancellation behavior.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-950">
                      Provider Performance Trend
                    </h3>
                    <span className="text-xs font-medium text-gray-500">
                      comparative index
                    </span>
                  </div>

                  <div className="h-64 rounded-2xl bg-gray-50 px-2 py-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendAreaData}>
                        <defs>
                          <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                        />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#perfFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-950">
                      Balanced Quality Metrics
                    </h3>
                    <span className="text-xs font-medium text-gray-500">
                      normalized view
                    </span>
                  </div>

                  <div className="h-56 rounded-2xl bg-gray-50 px-2 py-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceBarData} barCategoryGap={26}>
                        <CartesianGrid vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          formatter={(value) => [`${Math.round(value)} / 100`, "Score"]}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                          <Cell fill="#059669" />
                          <Cell fill="#d97706" />
                          <Cell fill="#2563eb" />
                          <Cell fill="#e11d48" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-xl font-bold text-gray-950">Quality Summary</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Focused metrics that matter on a provider dashboard.
                </p>
              </div>

              <div className="grid gap-6 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rating Quality</p>
                    <p className="mt-1 text-3xl font-extrabold text-gray-950">
                      {ratingQuality.toFixed(1)}
                      <span className="text-lg font-bold text-gray-700"> / 5.0</span>
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <div className="h-24 w-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ratingPieData}
                            dataKey="value"
                            innerRadius={24}
                            outerRadius={38}
                            stroke="none"
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#fde68a" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                    <p className="mt-1 text-2xl font-bold text-gray-950">{completedJobs}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
                    <p className="mt-1 text-2xl font-bold text-gray-950">
                      {cancellationRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Verification</p>
                    <p className="mt-1 text-2xl font-bold text-gray-950">
                      {normalizedKycStatus === "approved"
                        ? "Verified"
                        : startCaseStatus(normalizedKycStatus || "Not Submitted")}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <p className="text-sm leading-6 text-gray-600">
                    This section is intentionally simplified so the dashboard stays focused on
                    insights, not navigation. Detailed actions can remain in the sidebar.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-gray-950">
                      <HiTrophy className="text-amber-600" />
                      Ranking Snapshot
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Short context, not a full leaderboard page.
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    30 days
                  </span>
                </div>
              </div>

              <div className="p-6">
                {loadingRank ? (
                  <div className="space-y-3">
                    <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex items-end justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Your current rank</p>
                        <p className="mt-1 text-4xl font-black tracking-tight text-gray-950">
                          {rankData ? `#${rankData.rank || "-"}` : "—"}
                        </p>
                      </div>

                      {rankData && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-600">Score</p>
                          <p className="mt-1 text-2xl font-bold text-gray-950">
                            {Math.round(rankData.scores?.totalScore || rankData.points || 0)}
                          </p>
                        </div>
                      )}
                    </div>

                    {topThree.length > 0 ? (
                      <div className="space-y-3">
                        {topThree.map((entry, idx) => (
                          <div
                            key={entry.providerId?._id || idx}
                            className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                                  idx === 0
                                    ? "bg-amber-100 text-amber-800"
                                    : idx === 1
                                    ? "bg-gray-200 text-gray-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                #{idx + 1}
                              </div>

                              <div>
                                <p className="font-semibold text-gray-950">
                                  {entry.providerId?.profile?.name || "Provider"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Score {Math.round(entry.scores?.totalScore || entry.points || 0)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-gray-500">Rating</p>
                              <p className="font-bold text-gray-950">
                                {(entry.metrics?.avgRating || 0).toFixed(1)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-gray-50 px-4 py-5 text-sm text-gray-600">
                        Ranking data is not available yet.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-950">
                <HiCalendarDays className="text-emerald-600" />
                Recent Booking Requests
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Most recent provider-side booking activity.
              </p>
            </div>

            <button
              onClick={() => navigate("/provider/bookings")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 transition hover:gap-2"
            >
              View all
              <HiArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {recentBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                <p className="font-medium text-gray-700">No booking requests yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  New requests will appear here as booking activity grows.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => {
                  const statusMeta = getStatusMeta(booking.status);
                  const bookingDate = booking.schedule?.date || booking.createdAt;
                  const bookingTime = booking.schedule?.date
                    ? formatTime(booking.schedule.date)
                    : null;

                  return (
                    <div
                      key={booking._id}
                      className="grid gap-4 rounded-2xl border border-gray-200 px-4 py-4 lg:grid-cols-[1.5fr,auto,auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-lg font-semibold text-gray-950">
                            {booking.serviceId?.title || "Service"}
                          </p>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                          <span>
                            <span className="font-medium text-gray-900">Client:</span>{" "}
                            {booking.clientId?.profile?.name || "Client"}
                          </span>
                          <span>
                            <span className="font-medium text-gray-900">Date:</span>{" "}
                            {formatDate(bookingDate)}
                          </span>
                          {bookingTime && (
                            <span>
                              <span className="font-medium text-gray-900">Time:</span>{" "}
                              {bookingTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-left lg:text-right">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                            Amount
                          </p>
                          <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                            {formatCurrency(booking.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <button
                          onClick={() => navigate("/provider/bookings")}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-emerald-300 hover:text-emerald-800"
                        >
                          Manage
                          <HiArrowRight className="h-4 w-4" />
                        </button>
                      </div>

                      {(booking.paymentStatus || booking.notes) && (
                        <div className="lg:col-span-3">
                          <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                              {booking.paymentStatus && (
                                <span>
                                  <span className="font-medium text-gray-900">Payment:</span>{" "}
                                  {startCaseStatus(booking.paymentStatus)}
                                </span>
                              )}
                              {booking.notes && (
                                <span className="line-clamp-1">
                                  <span className="font-medium text-gray-900">Note:</span>{" "}
                                  {booking.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}