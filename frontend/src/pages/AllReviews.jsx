import React from "react";
import { Link } from "react-router-dom";
import TopNavbar from "../components/Navbar/TopNavbar";
import api from "../utils/axios";

function StarIcon({ filled = true, size = 14, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={className}
    >
      <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8C16.8 4.53 14.67 2.4 12 2.4s-4.8 2.13-4.8 4.8c0 2.67 2.13 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function QuoteIcon({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className}>
      <path d="M10 8C6.686 8 4 10.686 4 14v10h10V14H7a3 3 0 013-3V8zm14 0c-3.314 0-6 2.686-6 6v10h10V14h-7a3 3 0 013-3V8z" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ServiceBadgeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M8 1l1.5 4.5H14l-3.6 2.6 1.4 4.4L8 9.8l-3.8 2.7 1.4-4.4L2 5.5h4.5L8 1z" />
    </svg>
  );
}

function normalizeProviderBadges(provider) {
  const rawBadges = provider?.badges || provider?.providerDetails?.badges || [];
  if (!Array.isArray(rawBadges)) return [];

  return rawBadges
    .map((badge) => String(badge || "").trim().toLowerCase())
    .filter(Boolean);
}

function getProviderBadgeMeta(badge) {
  const map = {
    verified: {
      label: "Verified",
      className: "border border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    "verified provider": {
      label: "Verified",
      className: "border border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    pro: {
      label: "Pro",
      className: "border border-sky-100 bg-sky-50 text-sky-700",
    },
    "top-rated": {
      label: "Top Rated",
      className: "border border-amber-100 bg-amber-50 text-amber-700",
    },
    "top rated": {
      label: "Top Rated",
      className: "border border-amber-100 bg-amber-50 text-amber-700",
    },
    elite: {
      label: "Elite",
      className: "border border-purple-100 bg-purple-50 text-purple-700",
    },
  };

  return (
    map[badge] || {
      label: badge.replace(/\b\w/g, (c) => c.toUpperCase()),
      className: "border border-gray-200 bg-gray-100 text-gray-700",
    }
  );
}

function ProviderBadgePills({ provider, max = 2 }) {
  const badges = normalizeProviderBadges(provider).slice(0, max);

  if (!badges.length) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => {
        const meta = getProviderBadgeMeta(badge);
        return (
          <span
            key={badge}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-inter ${meta.className}`}
          >
            <ShieldCheckIcon className="h-3 w-3" />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function StarRow({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} filled={i < rating} size={size} />
      ))}
    </div>
  );
}

function Avatar({ src, name, size = "h-10 w-10", ring = "ring-2 ring-gray-200" }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className={`${size} relative flex-shrink-0 overflow-hidden rounded-full ${ring}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : null}

      <div
        className={`${
          src ? "hidden" : "flex"
        } h-full w-full items-center justify-center bg-gray-100 font-poppins text-xs font-semibold text-gray-500`}
      >
        {initials || <UserIcon className="h-4 w-4 text-gray-400" />}
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  const { client, provider, rating, comment, serviceTitle, createdAt } = review;
  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className={`h-1 w-full ${rating === 5 ? "bg-emerald-400" : "bg-amber-400"}`} />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <StarRow rating={rating} />
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-inter">
            <CalendarIcon className="h-3.5 w-3.5" />
            {date}
          </span>
        </div>

        <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-gray-700 font-inter">
          &ldquo;{comment}&rdquo;
        </p>

        <div className="mt-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-inter">
          <ServiceBadgeIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{serviceTitle || "Service"}</span>
        </div>

        <div className="mt-4 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar
              src={client?.avatar}
              name={client?.name}
              size="h-9 w-9"
              ring="ring-2 ring-white shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium text-gray-900 font-poppins">
                  {client?.name || "Customer"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-inter">
                  <ShieldCheckIcon className="h-3 w-3" />
                  Verified
                </span>
              </div>
              <span className="text-xs text-gray-400 font-inter">Client</span>
            </div>
          </div>

          {provider?.name && (
            <div className="mt-3 flex items-center gap-2.5">
              <Avatar
                src={provider?.avatar}
                name={provider?.name}
                size="h-9 w-9"
                ring="ring-2 ring-white shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-inter">Hired</span>
                  {provider?.id ? (
                    <Link
                      to={`/provider/${provider.id}`}
                      className="truncate text-sm font-medium text-gray-900 transition-colors hover:text-emerald-700 font-poppins"
                    >
                      {provider.name}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-gray-900 font-poppins">
                      {provider.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-inter">Service Provider</span>
                <ProviderBadgePills provider={provider} max={2} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-gray-200" />
        ))}
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-5/6 rounded bg-gray-200" />
        <div className="h-3 w-4/6 rounded bg-gray-200" />
      </div>
      <div className="mb-4 h-5 w-1/3 rounded-full bg-gray-100" />
      <div className="flex items-center gap-2.5 border-t border-gray-50 pt-4">
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-2/3 rounded bg-gray-200" />
          <div className="h-2.5 w-1/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function RatingBar({ stars, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm font-inter sm:gap-3">
      <span className="w-4 flex-shrink-0 text-right text-gray-500">{stars}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 flex-shrink-0 text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

export default function AllReviews() {
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState({ avgRating: 0, totalReviews: 0 });
  const [ratingDist, setRatingDist] = React.useState({});
  const [filterRating, setFilterRating] = React.useState(0);
  const [sortBy, setSortBy] = React.useState("newest");

  async function fetchReviews(p = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 12, sort: sortBy });
      if (filterRating) params.set("rating", filterRating);

      const res = await api.get(`/reviews/public/all?${params}`);
      const data = res.data;

      setReviews(data.reviews || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setStats(
        data.stats || {
          avgRating: 0,
          totalReviews: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load public reviews:", err);
      setReviews([]);
      setTotalPages(1);
      setTotal(0);
      setStats({ avgRating: 0, totalReviews: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function fetchDist() {
    try {
      const jobs = [5, 4, 3, 2, 1].map((r) =>
        api
          .get(`/reviews/public/all?rating=${r}&limit=1`)
          .then((res) => [r, res.data.pagination?.total || 0])
      );

      const results = await Promise.all(jobs);
      setRatingDist(Object.fromEntries(results));
    } catch (err) {
      console.error("Failed to load rating distribution:", err);
    }
  }

  React.useEffect(() => {
    setPage(1);
    fetchReviews(1);
  }, [filterRating, sortBy]);

  React.useEffect(() => {
    fetchDist();
  }, []);

  function handlePage(p) {
    setPage(p);
    fetchReviews(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const ratingFilters = [
    { label: "All", value: 0 },
    { label: "5 Stars", value: 5 },
    { label: "4 Stars", value: 4 },
    { label: "3 Stars", value: 3 },
    { label: "2 Stars", value: 2 },
    { label: "1 Star", value: 1 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />

      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs text-emerald-700 font-inter">
                <ShieldCheckIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate sm:whitespace-normal">
                  All reviews are from verified bookings
                </span>
              </div>

              <h1 className="text-3xl font-medium text-gray-900 font-poppins sm:text-4xl">
                Platform Reviews
              </h1>

              <p className="mt-2 max-w-2xl text-gray-500 font-inter">
                Real feedback from real customers across every service category
              </p>
            </div>

            <div className="flex w-full flex-col gap-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5 sm:px-6 md:w-auto md:min-w-[320px] md:flex-row md:items-center md:gap-6 lg:max-w-md">
              <div className="text-center">
                <div className="text-4xl font-semibold text-gray-900 font-poppins sm:text-5xl">
                  {stats.avgRating || "—"}
                </div>
                <div className="mt-1 flex justify-center">
                  <StarRow rating={Math.round(stats.avgRating || 0)} size={18} />
                </div>
                <div className="mt-1 text-xs text-gray-400 font-inter">
                  {Number(stats.totalReviews || 0).toLocaleString()} reviews
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:w-48">
                {[5, 4, 3, 2, 1].map((s) => (
                  <RatingBar
                    key={s}
                    stars={s}
                    count={ratingDist[s] || 0}
                    total={stats.totalReviews || 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
            {ratingFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterRating(f.value)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-inter transition-all ${
                  filterRating === f.value
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.value > 0 && <StarIcon filled size={12} />}
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 font-inter focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-auto"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
          </select>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {!loading && (
          <p className="mb-6 text-sm text-gray-500 font-inter">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {total === 0 ? 0 : (page - 1) * 12 + 1}–{Math.min(page * 12, total)}
            </span>{" "}
            of <span className="font-medium text-gray-700">{total.toLocaleString()}</span>{" "}
            reviews
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          ) : reviews.length > 0 ? (
            reviews.map((r, index) => <ReviewCard key={r.id || r._id || index} review={r} />)
          ) : (
            <div className="col-span-full flex flex-col items-center gap-4 py-16 text-gray-400 sm:py-20">
              <QuoteIcon className="h-12 w-12 opacity-30" />
              <p className="text-center text-lg font-medium font-poppins">No reviews yet</p>
              <p className="text-center text-sm font-inter">
                Be the first to complete a booking and leave a review!
              </p>
              <Link
                to="/services"
                className="mt-2 rounded-full bg-emerald-700 px-6 py-2.5 text-sm text-white font-inter transition-colors hover:bg-emerald-800"
              >
                Browse Services
              </Link>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "..." ? (
                  <span key={`e${i}`} className="px-1 text-sm text-gray-400 font-inter">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePage(item)}
                    className={`h-9 w-9 rounded-lg text-sm font-inter transition-all ${
                      item === page
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => handlePage(page + 1)}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}