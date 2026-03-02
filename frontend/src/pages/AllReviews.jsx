import React from "react";
import { Link } from "react-router-dom";
import TopNavbar from "../components/Navbar/TopNavbar";
import api from "../utils/axios";

// ── Reusable SVG icons ─────────────────────────────────────────────────────────
function StarIcon({ filled = true, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
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

// ── Stars renderer ─────────────────────────────────────────────────────────────
function StarRow({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} filled={i < rating} size={size} />
      ))}
    </div>
  );
}

// ── Avatar with fallback ───────────────────────────────────────────────────────
function Avatar({ src, name, size = "h-10 w-10", ring = "ring-2 ring-gray-200" }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        className={`${size} rounded-full object-cover ${ring} flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full bg-gray-100 ${ring} flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-500 font-poppins`}>
      {initials || <UserIcon className="w-4 h-4 text-gray-400" />}
    </div>
  );
}

// ── Single review card ─────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const { client, provider, rating, comment, serviceTitle, createdAt } = review;
  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      {/* Top accent bar per rating */}
      <div className={`h-1 w-full ${rating === 5 ? "bg-emerald-400" : "bg-amber-400"}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Stars + date row */}
        <div className="flex items-center justify-between mb-3">
          <StarRow rating={rating} />
          <span className="text-xs text-gray-400 font-inter">{date}</span>
        </div>

        {/* Comment */}
        <p className="text-sm text-gray-700 font-inter leading-relaxed flex-1 line-clamp-4">
          &ldquo;{comment}&rdquo;
        </p>

        {/* Service tag */}
        <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-inter w-fit">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3">
            <path d="M8 1l1.5 4.5H14l-3.6 2.6 1.4 4.4L8 9.8l-3.8 2.7 1.4-4.4L2 5.5h4.5L8 1z" />
          </svg>
          {serviceTitle}
        </div>

        {/* Divider */}
        <div className="mt-4 pt-4 border-t border-gray-50">
          {/* Client row */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Avatar src={client.avatar} name={client.name} size="h-9 w-9" ring="ring-2 ring-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-poppins font-medium text-gray-900 truncate">{client.name}</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-inter">
                  <ShieldCheckIcon />
                  Verified
                </span>
              </div>
              <span className="text-xs text-gray-400 font-inter">Client</span>
            </div>
          </div>

          {/* Provider row */}
          {provider?.name && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="relative">
                <Avatar src={provider.avatar} name={provider.name} size="h-9 w-9" ring="ring-2 ring-white shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-inter">Hired</span>
                  {provider.id ? (
                    <Link
                      to={`/provider/${provider.id}`}
                      className="text-sm font-poppins font-medium text-gray-900 hover:text-emerald-700 transition-colors truncate"
                    >
                      {provider.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-poppins font-medium text-gray-900 truncate">{provider.name}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-inter">Service Provider</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-3 rounded-sm bg-gray-200" />
        ))}
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="h-5 bg-gray-100 rounded-full w-1/3 mb-4" />
      <div className="pt-4 border-t border-gray-50 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ── Rating breakdown bar ───────────────────────────────────────────────────────
function RatingBar({ stars, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm font-inter">
      <span className="w-4 text-gray-500 text-right">{stars}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-gray-400 text-xs">{pct}%</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
      setStats(data.stats || { avgRating: 0, totalReviews: 0 });
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Also fetch rating distribution (all counts regardless of filter) ──
  async function fetchDist() {
    try {
      const jobs = [5, 4, 3, 2, 1].map((r) =>
        api.get(`/reviews/public/all?rating=${r}&limit=1`).then((res) => [r, res.data.pagination?.total || 0])
      );
      const results = await Promise.all(jobs);
      setRatingDist(Object.fromEntries(results));
    } catch {
      /* ignore */
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

      {/* ── Hero header ── */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Left: title */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-inter mb-3">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                All reviews are from verified bookings
              </div>
              <h1 className="text-4xl font-poppins font-medium text-gray-900">
                Platform Reviews
              </h1>
              <p className="mt-2 text-gray-500 font-inter">
                Real feedback from real customers across every service category
              </p>
            </div>

            {/* Right: aggregate score card */}
            <div className="flex items-center gap-6 bg-gray-50 rounded-2xl px-8 py-5 border border-gray-100">
              <div className="text-center">
                <div className="text-5xl font-poppins font-semibold text-gray-900">{stats.avgRating || "—"}</div>
                <StarRow rating={Math.round(stats.avgRating)} size={18} />
                <div className="mt-1 text-xs text-gray-400 font-inter">{stats.totalReviews.toLocaleString()} reviews</div>
              </div>
              <div className="hidden md:flex flex-col gap-1.5 w-40">
                {[5, 4, 3, 2, 1].map((s) => (
                  <RatingBar key={s} stars={s} count={ratingDist[s] || 0} total={stats.totalReviews} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Filter + sort bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
          {/* Rating filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {ratingFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterRating(f.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-inter transition-all ${
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

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm font-inter border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Result count */}
        {!loading && (
          <p className="text-sm text-gray-500 font-inter mb-6">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {(page - 1) * 12 + 1}–{Math.min(page * 12, total)}
            </span>{" "}
            of <span className="font-medium text-gray-700">{total.toLocaleString()}</span> reviews
          </p>
        )}

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : reviews.length > 0
            ? reviews.map((r) => <ReviewCard key={r.id} review={r} />)
            : (
              <div className="col-span-full py-20 flex flex-col items-center gap-4 text-gray-400">
                <QuoteIcon className="w-12 h-12 opacity-30" />
                <p className="font-poppins font-medium text-lg">No reviews yet</p>
                <p className="font-inter text-sm">Be the first to complete a booking and leave a review!</p>
                <Link to="/services" className="mt-2 bg-emerald-700 text-white px-6 py-2.5 rounded-full font-inter text-sm hover:bg-emerald-800 transition-colors">
                  Browse Services
                </Link>
              </div>
            )}
        </div>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page === 1}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
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
                  <span key={`e${i}`} className="px-1 text-gray-400 font-inter text-sm">…</span>
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
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
