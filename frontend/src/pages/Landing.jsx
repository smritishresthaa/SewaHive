import React from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNavbar from "../components/Navbar/TopNavbar";
import api from "../utils/axios";
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
  FiShield,
  FiStar,
  FiMapPin,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";
import { HiBugAnt } from "react-icons/hi2";

import amazonLogo from "../logos/amazon.png";
import coinbaseLogo from "../logos/coinbase.png";
import googleLogo from "../logos/google.png";
import microsoftLogo from "../logos/microsoft.png";

const leftWorker = new URL("../../hero-left.png", import.meta.url).href;
const rightWorker = new URL("../../hero-right.png", import.meta.url).href;

const FALLBACK_REVIEWS = [
  {
    name: "Sita Sharma",
    loc: "Lalitpur",
    tag: "House Cleaning",
    text: "The cleaner was punctual, thorough, and very professional. My home has never looked this clean.",
  },
  {
    name: "Ramesh Thapa",
    loc: "Bhaktapur",
    tag: "Electrical Work",
    text: "Verified electrician fixed everything in one visit. Great service and transparent pricing!",
  },
  {
    name: "Priya Gurung",
    loc: "Kathmandu",
    tag: "Furniture Assembly",
    text: "Skilled and efficient. The booking process was so simple and hassle-free!",
  },
  {
    name: "Bikram Rai",
    loc: "Pokhara",
    tag: "Home Painting",
    text: "Outstanding painting job — finished on time and my living room looks brand new.",
  },
];

function getProviderBadgeLabel(provider) {
  const badges = Array.isArray(provider?.badges) ? provider.badges : [];
  const lowered = badges.map((b) => String(b).toLowerCase());

  if (provider?.level) return provider.level;
  if (lowered.includes("top-rated") || lowered.includes("top rated")) return "Top Rated";
  if (lowered.includes("pro")) return "Pro";
  if (lowered.includes("verified")) return "Verified";
  if (provider?.isVerified) return "Verified";

  return null;
}

function BadgePill({ label, dark = false }) {
  if (!label) return null;

  const styles = dark
    ? {
        "Top Rated":
          "bg-amber-400/15 text-amber-100 border border-amber-300/30",
        Pro: "bg-blue-400/18 text-blue-50 border border-blue-300/35",
        Verified:
          "bg-emerald-400/18 text-emerald-50 border border-emerald-300/35",
      }
    : {
        "Top Rated": "bg-amber-50 text-amber-700",
        Pro: "bg-blue-50 text-blue-700",
        Verified: "bg-emerald-50 text-emerald-700",
      };

  const cls =
    styles[label] ||
    (dark
      ? "bg-white/10 text-white/90 border border-white/10"
      : "bg-gray-100 text-gray-700");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-inter font-medium ${cls}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 opacity-100"
      >
        <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      {label}
    </span>
  );
}

function MiniAvatar({ src, name, ring = "ring-1 ring-gray-200" }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const [imgError, setImgError] = React.useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`h-8 w-8 flex-shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 font-poppins ${ring}`}
    >
      {initials}
    </div>
  );
}

function ReviewCardMini({ review }) {
  const { client, provider, rating, comment, serviceTitle } = review;
  const providerBadge = getProviderBadgeLabel(provider);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className={`h-1 w-full ${rating === 5 ? "bg-emerald-400" : "bg-amber-400"}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={i < rating ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={i < rating ? 0 : 1.5}
            >
              <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
            </svg>
          ))}
        </div>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-700 font-inter">
          &ldquo;{comment}&rdquo;
        </p>

        <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-inter">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3 w-3 flex-shrink-0"
          >
            <path d="M8 1l1.5 4.5H14l-3.6 2.6 1.4 4.4L8 9.8l-3.8 2.7 1.4-4.4L2 5.5h4.5L8 1z" />
          </svg>
          {serviceTitle}
        </div>

        <div className="mt-4 space-y-2.5 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2">
            <MiniAvatar
              src={client?.avatar}
              name={client?.name}
              ring="ring-2 ring-white shadow-sm"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs font-poppins font-semibold text-gray-900">
                  {client?.name || "Verified User"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-inter font-medium text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 opacity-100"
                  >
                    <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Verified
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-inter">Client</span>
            </div>
          </div>

          {provider?.name && (
            <div className="flex items-center gap-2">
              <MiniAvatar
                src={provider?.avatar}
                name={provider?.name}
                ring="ring-2 ring-white shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-gray-400 font-inter">Hired</span>
                  {provider?.id ? (
                    <Link
                      to={`/provider/${provider.id}`}
                      className="truncate text-xs font-poppins font-semibold text-gray-900 transition-colors hover:text-emerald-700"
                    >
                      {provider.name}
                    </Link>
                  ) : (
                    <span className="truncate text-xs font-poppins font-semibold text-gray-900">
                      {provider.name}
                    </span>
                  )}
                  <BadgePill label={providerBadge} />
                </div>
                <span className="text-[10px] text-gray-400 font-inter">Provider</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FallbackReviewCard({ review }) {
  const { name, loc, tag, text } = review;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="h-1 w-full bg-emerald-400" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
            </svg>
          ))}
        </div>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-700 font-inter">
          &ldquo;{text}&rdquo;
        </p>
        <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-inter">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3 w-3 flex-shrink-0"
          >
            <path d="M8 1l1.5 4.5H14l-3.6 2.6 1.4 4.4L8 9.8l-3.8 2.7 1.4-4.4L2 5.5h4.5L8 1z" />
          </svg>
          {tag}
        </div>
        <div className="mt-4 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 ring-2 ring-white shadow-sm font-poppins">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-xs font-poppins font-semibold text-gray-900">
                  {name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-inter font-medium text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 opacity-100"
                  >
                    <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Verified
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-inter">{loc}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryIcon({ iconKey, categoryName }) {
  const normalized = (iconKey || categoryName || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");

  const baseClass = "w-[18px] h-[18px] flex-shrink-0";

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
  return <Icon className={baseClass} />;
}

export default function Landing() {
  const navigate = useNavigate();
  const [activeCategoryId, setActiveCategoryId] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [realReviews, setRealReviews] = React.useState([]);
  const [loadingReviews, setLoadingReviews] = React.useState(true);
  const [counts, setCounts] = React.useState({
    services: 0,
    providers: 0,
    customers: 0,
  });

  const [categories, setCategories] = React.useState([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = React.useState({});
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  const [popularServices, setPopularServices] = React.useState([]);
  const [loadingPopular, setLoadingPopular] = React.useState(true);

  const statsRef = React.useRef(null);
  const stepsRef = React.useRef(null);

  function handleSearch() {
    const q = searchQuery.trim();
    navigate(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  }

  React.useEffect(() => {
    api
      .get("/reviews/public/top")
      .then((res) => {
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.reviews)
          ? res.data.reviews
          : [];

        const normalized = raw.map((review) => ({
          id: review.id || review._id,
          rating: Number(review.rating || 0),
          comment: review.comment || "",
          createdAt: review.createdAt,
          serviceTitle: review.serviceTitle || "Home Service",
          client: {
            id: review.client?.id || null,
            name: review.client?.name || "Verified User",
            avatar: review.client?.avatar || "",
          },
          provider: {
            id: review.provider?.id || null,
            name: review.provider?.name || "Service Provider",
            avatar: review.provider?.avatar || "",
            badges: Array.isArray(review.provider?.badges) ? review.provider.badges : [],
            level: review.provider?.level || null,
            isVerified: Boolean(review.provider?.isVerified),
          },
        }));

        setRealReviews(normalized);
      })
      .catch(() => setRealReviews([]))
      .finally(() => setLoadingReviews(false));
  }, []);

  React.useEffect(() => {
    async function fetchCategoriesAndSubcategories() {
      try {
        const catRes = await api.get("/categories");
        const cats = catRes.data?.data || [];
        setCategories(cats);

        if (cats.length > 0) {
          setActiveCategoryId((prev) => prev || cats[0]._id);
        }

        const subMap = {};
        await Promise.all(
          cats.map(async (cat) => {
            try {
              const subRes = await api.get(`/categories/subcategories?categoryId=${cat._id}`);
              const subs = subRes.data?.data || [];
              subMap[cat._id] = subs;
            } catch (err) {
              console.error(`Failed to fetch subcategories for ${cat.name}:`, err);
              subMap[cat._id] = [];
            }
          })
        );

        setSubcategoriesByCategory(subMap);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategoriesAndSubcategories();
  }, []);

  React.useEffect(() => {
    api
      .get("/services/popular")
      .then((res) => setPopularServices(res.data?.services || []))
      .catch(() => setPopularServices([]))
      .finally(() => setLoadingPopular(false));
  }, []);

  React.useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("animate");
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          const duration = 1200;

          function step(now) {
            const p = Math.min(1, (now - start) / duration);
            setCounts({
              services: Math.round(200 * p),
              providers: Math.round(1500 * p),
              customers: Math.round(10000 * p),
            });
            if (p < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  const activeCategory = categories.find((c) => c._id === activeCategoryId);
  const activeSubcategories = subcategoriesByCategory[activeCategoryId] || [];
  const featuredReview = realReviews[0] || null;
  const gridReviews = realReviews.slice(1, 5);

  return (
    <div className="min-h-screen bg-white">
      <TopNavbar />

      <section className="relative flex min-h-[88vh] w-full items-center overflow-hidden bg-[#164f2b] text-white sm:min-h-[90vh]">
        <img
          src={leftWorker}
          alt=""
          className="pointer-events-none absolute bottom-0 left-0 hidden w-[280px] opacity-90 sm:block md:w-[360px] lg:w-[430px] xl:w-[480px]"
        />
        <img
          src={rightWorker}
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 hidden w-[280px] opacity-90 sm:block md:w-[360px] lg:w-[430px] xl:w-[480px]"
        />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-20">
          <div className="inline-block rounded-full bg-green-200 px-4 py-2 text-xs text-green-800 font-inter sm:px-5 sm:text-sm">
            Hire skilled professionals in just a few clicks
          </div>

          <h1 className="mt-6 text-3xl font-poppins font-medium leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Serving made simple
            <br />
            with Sewa Hive
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-white/90 font-inter sm:text-lg">
            Connecting you with skilled professionals for all your home and personal needs.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-col rounded-[28px] bg-[#1a5b35]/80 p-2 shadow-lg sm:mt-10 sm:flex-row sm:items-center sm:rounded-full">
            <span className="hidden pl-5 pr-3 text-white/80 sm:block">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/70 font-inter sm:px-2"
              placeholder="Find the perfect service you need"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="mt-2 rounded-full bg-[#2fae5e] px-5 py-3 text-white font-inter font-medium shadow transition-colors hover:bg-[#27a04f] sm:ml-2 sm:mt-0 sm:px-6"
            >
              Search
            </button>
          </div>

          <div className="mt-10 text-sm text-white/80 font-inter sm:mt-12">
            Trusted by top companies
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 opacity-95 sm:gap-x-6">
            <div className="flex h-12 w-24 items-center justify-center sm:w-28 md:w-32">
              <img src={amazonLogo} alt="Amazon" className="max-h-16 object-contain sm:max-h-20 md:max-h-24" />
            </div>
            <div className="flex h-12 w-24 items-center justify-center sm:w-28 md:w-32">
              <img src={coinbaseLogo} alt="Coinbase" className="max-h-10 object-contain sm:max-h-12" />
            </div>
            <div className="flex h-12 w-24 items-center justify-center sm:w-28 md:w-32">
              <img src={googleLogo} alt="Google" className="max-h-10 object-contain sm:max-h-12" />
            </div>
            <div className="flex h-12 w-24 items-center justify-center sm:w-28 md:w-32">
              <img src={microsoftLogo} alt="Microsoft" className="max-h-20 object-contain sm:max-h-24 md:max-h-28" />
            </div>
          </div>
        </div>
      </section>

      <section id="about" ref={statsRef} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="mx-auto max-w-4xl text-center text-base text-gray-800 font-inter sm:text-lg md:text-xl">
          Sewa Hive connects you with trusted and verified professionals, ensuring top-quality
          and dependable service every time. Our platform offers a seamless experience through an
          intuitive, user-friendly interface and a simple booking process designed for convenience.
          Your satisfaction is our highest priority — supported by dedicated assistance and a
          guaranteed service promise.
        </p>

        <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-3 md:gap-8">
          {[
            { key: "services", label: "Services", icon: "check", suffix: "+" },
            { key: "providers", label: "Service Providers", icon: "shield", suffix: "+" },
            { key: "customers", label: "Happy Customers", icon: "star", suffix: "+" },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-white p-6 text-center shadow-md transition hover:shadow-lg sm:p-8"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1c6c3b] text-white shadow sm:h-16 sm:w-16">
                {item.icon === "check" && (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                {item.icon === "shield" && (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                  </svg>
                )}
                {item.icon === "star" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                  </svg>
                )}
              </div>
              <div className="mt-5 text-3xl tracking-tight text-gray-900 font-inter sm:text-4xl">
                {counts[item.key].toLocaleString()}
                {item.suffix}
              </div>
              <div className="mt-2 text-base font-medium text-gray-600 font-inter sm:text-lg">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-100 px-4 py-1 text-sm text-brand-700 font-inter">
            Why Choose SewaHive
          </span>
          <h2 className="mt-4 text-3xl font-poppins font-medium sm:text-4xl">Our Top Features</h2>
          <p className="mt-2 text-gray-600 font-inter">
            Everything you need to find and hire the perfect professional for your task
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Secure & Safe",
              desc: "All payments are processed securely with buyer protection and encrypted transactions",
              badge: "100% Secure",
              badgeColor: "bg-green-100 text-green-800",
              hoverBg: "hover:bg-green-50",
              icon: "shield",
            },
            {
              title: "Top Rated Pros",
              desc: "Browse verified reviews and ratings from real customers to make informed decisions",
              badge: "4.8+ Avg Rating",
              badgeColor: "bg-yellow-100 text-yellow-800",
              hoverBg: "hover:bg-yellow-50",
              icon: "star",
            },
            {
              title: "Local Experts",
              desc: "Find trusted professionals in your neighborhood who understand local needs",
              badge: "All Major Cities",
              badgeColor: "bg-pink-100 text-pink-800",
              hoverBg: "hover:bg-pink-50",
              icon: "pin",
            },
            {
              title: "Flexible Scheduling",
              desc: "Book for today or schedule for later at your convenience, 24/7 availability",
              badge: "Same Day Service",
              badgeColor: "bg-blue-100 text-blue-800",
              hoverBg: "hover:bg-blue-50",
              icon: "calendar",
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] ${f.hoverBg}`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${
                  f.icon === "shield"
                    ? "bg-green-100 text-green-700 group-hover:bg-green-200"
                    : f.icon === "star"
                    ? "bg-yellow-100 text-yellow-700 group-hover:bg-yellow-200"
                    : f.icon === "pin"
                    ? "bg-pink-100 text-pink-700 group-hover:bg-pink-200"
                    : "bg-blue-100 text-blue-700 group-hover:bg-blue-200"
                }`}
              >
                {f.icon === "shield" && <FiShield className="h-5 w-5" />}
                {f.icon === "star" && <FiStar className="h-5 w-5" />}
                {f.icon === "pin" && <FiMapPin className="h-5 w-5" />}
                {f.icon === "calendar" && <FiCalendar className="h-5 w-5" />}
              </div>

              <div className="mt-4 text-lg font-poppins font-medium text-gray-900">{f.title}</div>

              <p className="mt-2 text-sm leading-relaxed text-gray-600 font-inter">{f.desc}</p>

              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-inter ${f.badgeColor}`}
              >
                <FiCheck className="h-3.5 w-3.5 opacity-100" />
                <span>{f.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl font-poppins font-medium sm:text-4xl">
            Pros for every project in
          </h2>
          <div className="mt-1 text-3xl font-poppins font-medium text-brand-700 sm:text-4xl">
            Your Area
          </div>
        </div>

        {loadingCategories ? (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              ))}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="h-44 animate-pulse bg-gray-200" />
                  <div className="p-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : categories.length > 0 ? (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 text-sm font-inter sm:gap-x-8">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setActiveCategoryId(cat._id)}
                  className={`relative flex items-center gap-2 pb-2 ${
                    activeCategoryId === cat._id ? "text-brand-700" : "text-gray-600"
                  }`}
                >
                  <CategoryIcon iconKey={cat?.iconKey} categoryName={cat?.name} />
                  <span className="font-inter">{cat.name}</span>
                  {activeCategoryId === cat._id && (
                    <span className="absolute left-0 right-0 mx-auto mt-7 h-[2px] w-12 bg-brand-700" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {activeSubcategories.length > 0 ? (
                activeSubcategories.map((sub, i) => (
                  <div
                    key={sub._id || i}
                    onClick={() =>
                      navigate(
                        `/services?category=${encodeURIComponent(
                          activeCategory?.name || ""
                        )}&subcategory=${encodeURIComponent(sub.name)}`
                      )
                    }
                    className="service-card cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-2 hover:shadow-md"
                  >
                    {sub.image ? (
                      <div
                        className="image-zoom h-56 bg-gray-200 sm:h-64"
                        style={{
                          backgroundImage: `url(${sub.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    ) : activeCategory?.image ? (
                      <div
                        className="image-zoom h-56 bg-gray-200 sm:h-64"
                        style={{
                          backgroundImage: `url(${activeCategory.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-gray-100 sm:h-64">
                        <CategoryIcon
                          iconKey={activeCategory?.iconKey}
                          categoryName={activeCategory?.name}
                        />
                      </div>
                    )}

                    <div className="p-4 text-center">
                      <div className="text-lg font-medium font-inter">{sub.name}</div>
                      {sub.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {sub.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-400 font-inter">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="mx-auto mb-3"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  No subcategories in this category yet
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-10 py-8 text-center text-gray-400 font-inter">
            No categories available
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div ref={stepsRef} className="grid items-start gap-10 md:grid-cols-2">
          <div className="fade-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-3xl font-poppins font-medium sm:text-4xl md:text-5xl">
              Step-by-Step Guide to Getting Your Task Done with Ease
            </h2>
            <p className="mt-4 max-w-xl text-gray-600 font-inter">
              Discover how easy it is to find the right professional for your everyday needs.
              Follow these three simple steps to connect with trusted experts and get your tasks
              done quickly, safely, and hassle-free.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                n: "1",
                t: "Choose Your Service",
                d: "Browse through Sewa Hive's wide range of service categories and pick the one that suits your needs.",
              },
              {
                n: "2",
                t: "Book a Service Provider",
                d: "Select from our trusted, verified professionals. Check their ratings and book your preferred expert.",
              },
              {
                n: "3",
                t: "Get It Done",
                d: "Sit back and relax while our professional completes the task with care and precision.",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="step-pop grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white"
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  {step.n}
                </div>

                <div
                  className="step-slide min-w-0"
                  style={{ animationDelay: `${0.25 + i * 0.15}s` }}
                >
                  <div className="text-lg font-poppins font-medium">{step.t}</div>
                  <p className="mt-1 text-sm text-gray-600 font-inter md:text-base">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl font-poppins font-medium">Discover Most Popular Services</h2>
          <p className="mt-2 text-sm text-gray-600 font-inter">
            Explore the services our customers love the most
          </p>
        </div>

        {loadingPopular ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="h-40 animate-pulse bg-gray-200" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : popularServices.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popularServices.map((svc, i) => (
              <div
                key={svc._id || i}
                onClick={() => navigate(`/services?q=${encodeURIComponent(svc.title)}`)}
                className="popular-card cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-2 hover:shadow-md"
              >
                <div className="relative">
                  {svc.image ? (
                    <div
                      className="h-40 bg-gray-200"
                      style={{
                        backgroundImage: `url(${svc.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gray-100">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}

                  {svc.ratingAvg > 0 && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-brand-700 px-2 py-1 text-xs text-white">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="flex-shrink-0"
                      >
                        <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                      </svg>
                      {svc.ratingAvg.toFixed(1)}
                    </div>
                  )}

                  {svc.provider?.badges?.length > 0 && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-amber-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                      </svg>
                      {svc.provider.badges[0]}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="font-poppins font-medium">{svc.title}</div>
                  <div className="mt-2 space-y-1 text-sm text-gray-600 font-inter">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-brand-700"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                      </svg>
                      <span>{svc.ratingCount || 0} reviews</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-brand-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 7V3m8 4V3M3 11h18" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 16l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
                      </svg>
                      <span>{svc.bookingsCount || 0} bookings</span>
                    </div>

                    {svc.basePrice > 0 && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-brand-700"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="15" cy="12" r="2" />
                        </svg>
                        <span>From NPR {svc.basePrice.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {svc.provider && (
                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                      {svc.provider.avatar ? (
                        <img
                          src={svc.provider.avatar}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-500">
                          {(svc.provider.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-xs text-gray-500 font-inter">
                        {svc.provider.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 py-8 text-center text-gray-400 font-inter">
            No popular services available yet
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2 text-white font-inter transition-colors hover:bg-brand-800"
          >
            Browse All Services <span>›</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl font-poppins font-medium">What our customers are saying</h2>
          <p className="mt-2 text-sm text-gray-600 font-inter">
            Real stories from satisfied customers across Nepal
          </p>
        </div>

        {loadingReviews ? (
          <div className="mt-8 animate-pulse rounded-2xl bg-[#1c6c3b] p-6 shadow sm:p-8 md:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white/20" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-3 w-3 rounded-sm bg-white/20" />
                  ))}
                </div>
                <div className="h-4 w-full rounded bg-white/20" />
                <div className="h-4 w-5/6 rounded bg-white/20" />
                <div className="h-4 w-3/4 rounded bg-white/20" />
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="h-3 w-24 rounded bg-white/20" />
                  <div className="h-3 w-32 rounded bg-white/20" />
                </div>
              </div>
            </div>
          </div>
        ) : featuredReview ? (
          <div className="mt-8 rounded-2xl bg-[#1c6c3b] p-6 text-white shadow sm:p-8 md:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <MiniAvatar
                src={featuredReview.client?.avatar}
                name={featuredReview.client?.name}
                ring="ring-2 ring-white/30"
              />

              <div className="flex-1">
                <div className="mb-3 flex items-center gap-1 text-green-300">
                  {Array.from({ length: featuredReview.rating }).map((_, i) => (
                    <svg
                      key={i}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="flex-shrink-0"
                    >
                      <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                    </svg>
                  ))}
                </div>

                <blockquote className="text-base leading-relaxed font-inter sm:text-lg">
                  &ldquo;{featuredReview.comment}&rdquo;
                </blockquote>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-poppins font-medium">
                    {featuredReview.client?.name}
                  </span>
                  <span className="text-white/80 font-inter">
                    Used {featuredReview.serviceTitle}
                  </span>

                  {featuredReview.provider?.name && (
                    <span className="flex flex-wrap items-center gap-2 text-white/70 font-inter">
                      <span>
                        • Hired{" "}
                        {featuredReview.provider?.id ? (
                          <Link
                            to={`/provider/${featuredReview.provider.id}`}
                            className="underline underline-offset-2 transition-colors hover:text-white"
                          >
                            {featuredReview.provider.name}
                          </Link>
                        ) : (
                          featuredReview.provider.name
                        )}
                      </span>
                      <BadgePill label={getProviderBadgeLabel(featuredReview.provider)} dark />
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/95 font-inter font-medium">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-100"
                    >
                      <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    Verified Customer
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-[#1c6c3b] p-6 text-white shadow sm:p-8 md:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-white/20">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white/80">
                  <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8C16.8 4.53 14.67 2.4 12 2.4s-4.8 2.13-4.8 4.8c0 2.67 2.13 4.8 4.8 4.8zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-1 text-green-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="flex-shrink-0"
                    >
                      <path d="M12 17.3l6.18 3.64-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.67-1.64 7.03L12 17.3z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed font-inter sm:text-lg">
                  <span className="font-poppins font-medium">
                    SewaHive has completely transformed how I manage home maintenance.
                  </span>{" "}
                  I hired a plumber for an emergency repair… they arrived within 2 hours!
                  Affordable, fast, reliable — now I use SewaHive for everything.
                </blockquote>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-poppins font-medium">Rajesh Maharjan</span>
                  <span className="text-white/80 font-inter">
                    Kathmandu • Used Plumbing Service
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/95 font-inter font-medium">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-100"
                    >
                      <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    Verified Customer
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {loadingReviews ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <div key={si} className="h-3 w-3 rounded-sm bg-gray-200" />
                  ))}
                </div>
                <div className="mb-4 space-y-2">
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-5/6 rounded bg-gray-200" />
                  <div className="h-3 w-4/6 rounded bg-gray-200" />
                </div>
                <div className="mb-4 h-5 w-1/3 rounded-full bg-gray-100" />
                <div className="space-y-2 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-2/3 rounded bg-gray-200" />
                      <div className="h-2 w-1/3 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-1/2 rounded bg-gray-200" />
                      <div className="h-2 w-1/4 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : gridReviews.length > 0 ? (
            gridReviews.map((r, i) => <ReviewCardMini key={r.id || i} review={r} />)
          ) : (
            FALLBACK_REVIEWS.map((r, i) => <FallbackReviewCard key={i} review={r} />)
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 rounded-full border border-brand-700 px-6 py-2.5 text-sm text-brand-700 font-inter transition-all hover:bg-brand-700 hover:text-white"
          >
            Read All Reviews
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      <section className="bg-[#164f2b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-10">
          <div>
            <h3 className="text-3xl font-poppins font-medium">Ready to Start?</h3>
            <p className="mt-3 text-white/90 font-inter">
              Join thousands of satisfied customers who trust SewaHive for their home service needs.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-full bg-white px-5 py-2 text-center text-[#164f2b] font-inter transition-all hover:-translate-y-1 hover:shadow-md"
              >
                Get Started
              </Link>
              <Link
                to="/provider/signup"
                className="rounded-full border border-white px-5 py-2 text-center text-white font-inter transition-colors hover:bg-white/10"
              >
                Become a Tasker
              </Link>
            </div>
          </div>
          <div>
            <div
              className="h-48 rounded-2xl bg-cover bg-center md:h-64"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop)",
              }}
            />
          </div>
        </div>

        <footer className="bg-white text-gray-800">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 md:grid-cols-3 lg:grid-cols-5">
            <div>
              <div className="font-poppins font-medium">SewaHive</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#about" className="hover:text-brand-700">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Press
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-poppins font-medium">Community</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Taskers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Customers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Events
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Referrals
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-poppins font-medium">Support</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Safety
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-poppins font-medium">Discover</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#categories" className="hover:text-brand-700">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Projects
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Reviews
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Locations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-poppins font-medium">Hire on SewaHive</div>
              <ul className="mt-3 space-y-2 text-sm font-inter">
                <li>
                  <a href="#categories" className="hover:text-brand-700">
                    Browse Services
                  </a>
                </li>
                <li>
                  <Link to="/provider/signup" className="hover:text-brand-700">
                    Become Provider
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700">
                    Business
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t">
            <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-gray-600 font-inter sm:px-6">
              © 2024 SewaHive Inc. All rights reserved.
            </div>
            <div className="pb-10 text-center text-xs font-inter">
              <a href="/admin" className="text-brand-700">
                Admin Portal
              </a>
            </div>
          </div>
        </footer>
      </section>

      <button className="fixed bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-black text-lg text-white shadow">
        ?
      </button>
    </div>
  );
}