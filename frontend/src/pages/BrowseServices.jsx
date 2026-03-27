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
      setLoadingCategories(true);
      const res = await api.get("/categories");
      const categoryList = res.data.data || [];
      setCategories(categoryList);
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
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Browse Services
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            Find the perfect service provider for your needs
          </p>
        </div>

        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative flex items-center min-w-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <HiMagnifyingGlass className="text-xl text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for services..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 focus:border-transparent focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-6"
            >
              <HiAdjustmentsHorizontal className="text-xl" />
              Filters
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-500 sm:px-6"
            >
              <option value="relevance">Sort by: Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>

            <button
              onClick={handleSearch}
              className="rounded-xl bg-brand-700 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-800 sm:px-8"
            >
              Search
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Min Price (NPR)
                </label>
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, min: e.target.value })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Max Price (NPR)
                </label>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) =>
                    setPriceRange({ ...priceRange, max: e.target.value })
                  }
                  placeholder="10000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setPriceRange({ min: "", max: "" });
                    setShowFilters(false);
                    setServices(allServices);
                  }}
                  className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  onClick={applyPriceFilter}
                  className="rounded-lg bg-brand-700 px-6 py-2 text-white transition-colors hover:bg-brand-800"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          {loadingCategories ? (
            <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 font-medium transition-all sm:px-6 ${
                    selectedCategory === "All"
                      ? "bg-green-600 text-white shadow-lg"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FiHome className="h-5 w-5" />
                  All Services
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 font-medium transition-all sm:px-6 ${
                      selectedCategory === cat._id
                        ? "bg-green-600 text-white shadow-lg"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <CategoryIcon
                      iconKey={cat.iconKey}
                      categoryName={cat.name}
                      className="h-5 w-5"
                    />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600 sm:text-base">
            {loading
              ? "Loading..."
              : `${services.length} service${services.length === 1 ? "" : "s"} found${
                  selectedCategoryObject ? ` in ${selectedCategoryObject.name}` : ""
                }`}
          </p>
        </div>

        <div className="mb-8 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                Top Providers (Last 30 Days)
              </h2>
              <p className="text-sm text-gray-600">
                Ranked by completed bookings, ratings, and response time
              </p>
            </div>
            <button
              onClick={() => navigate("/client/leaderboard")}
              className="flex items-center gap-1 text-sm font-medium text-brand-700 transition-all hover:gap-2"
            >
              View full leaderboard
              <HiArrowRight />
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              Leaderboard data will appear here once rankings are generated.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leaderboard.slice(0, 6).map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-xl border p-4 transition-all hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                        {entry.providerId?.profile?.name
                          ? entry.providerId.profile.name.charAt(0).toUpperCase()
                          : "P"}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-semibold text-gray-900">
                          <span className="truncate">
                            {entry.providerId?.profile?.name || "Provider"}
                          </span>
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
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                        Score {Math.round(entry.scores?.totalScore || entry.points || 0)}
                      </span>
                      {entry.trustScore > 0 && (
                        <span className="text-[10px] text-gray-500">
                          Trust: {entry.trustScore}/100
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <HiStar className="text-yellow-500" />
                      <span>{(entry.metrics?.avgRating || 0).toFixed(1)}</span>
                      <span className="text-gray-400">
                        ({entry.metrics?.reviewCount || 0})
                      </span>
                    </div>
                    <span className="hidden text-gray-300 sm:inline">•</span>
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

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm sm:p-12">
            <div className="mb-4 text-6xl">🔍</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              No services found
            </h2>
            <p className="text-gray-600">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}