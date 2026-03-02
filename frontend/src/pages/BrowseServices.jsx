import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNavbar from "../components/Navbar/TopNavbar";
import { HiMagnifyingGlass, HiAdjustmentsHorizontal, HiMapPin, HiStar, HiArrowRight } from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";
import ServiceCard from "../components/Service/ServiceCard";

export default function BrowseServices() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, sortBy]);

  // Re-apply text filter whenever searchQuery or allServices change
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
          s.categoryId?.name?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, allServices]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

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

      const res = await api.get(`/services/list?${params}`);
      let servicesData = res.data.services || [];

      // PHASE 5: Filter by provider's approved categories
      // (the API should already do this, but filter on frontend as safeguard)
      const selectedCategoryId = selectedCategory !== "All" ? selectedCategory : null;
      
      // Temporarily Relax Frontend Filter to match Backend
      /*
      if (selectedCategoryId) {
        servicesData = servicesData.filter(service => {
          if (!service.providerId?.providerDetails?.approvedCategories) return false;
          return service.providerId.providerDetails.approvedCategories.some(
            id => id.toString() === selectedCategoryId
          );
        });
      }
      */

      // Apply sorting
      if (sortBy === "price-low") {
        servicesData.sort((a, b) => a.basePrice - b.basePrice);
      } else if (sortBy === "price-high") {
        servicesData.sort((a, b) => b.basePrice - a.basePrice);
      } else if (sortBy === "rating") {
        servicesData.sort((a, b) => b.ratingAvg - a.ratingAvg);
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
        s.categoryId?.name?.toLowerCase().includes(q)
    );
    setServices(filtered);
  }

  function applyPriceFilter() {
    fetchServices().then(() => {
      if (priceRange.min || priceRange.max) {
        const filtered = services.filter((s) => {
          const min = priceRange.min ? Number(priceRange.min) : 0;
          const max = priceRange.max ? Number(priceRange.max) : Infinity;
          return s.basePrice >= min && s.basePrice <= max;
        });
        setServices(filtered);
      }
    });
    setShowFilters(false);
  }

  function handleBookService(serviceId) {
    navigate(`/booking/${serviceId}`);
  }

  function getServiceCategoryMeta(service) {
    const categoryId = service.categoryId?._id || service.categoryId;
    const categoryName = service.category?.name || service.categoryName || service.category;
    const match = categories.find((cat) =>
      cat._id === categoryId || (!categoryId && cat.name === categoryName)
    );

    return {
      name: match?.name || categoryName || "Service",
      icon: match?.icon || "🔧",
    };
  }

  return (
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
            <div className="flex-1 relative">
              <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
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
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
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
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  placeholder="10000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setPriceRange({ min: "", max: "" });
                    setShowFilters(false);
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
                  <span className="text-lg">🏠</span>
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
                    <span className="text-lg">{cat.icon || '📦'}</span>
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
            {loading ? "Loading..." : `${services.length} services found`}
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
              onClick={() => navigate("/client/dashboard")}
              className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View your rank
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
                          {(entry.badges?.includes('Verified Provider') || entry.badges?.includes('verified')) && (
                            <span className="text-emerald-500" title="Verified Provider">✓</span>
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
                      <span>
                        {(entry.metrics?.avgRating || 0).toFixed(1)}
                      </span>
                      <span className="text-gray-400">
                        ({entry.metrics?.reviewCount || 0})
                      </span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span>
                      {entry.metrics?.completedBookings || 0} jobs
                    </span>
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
            {services.map((service) => (
              <ServiceCard 
                key={service._id}
                service={{
                  _id: service._id,
                  title: service.title,
                  description: service.description,
                  categoryName: getServiceCategoryMeta(service).name,
                  categoryIcon: getServiceCategoryMeta(service).icon,
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
                  rating: service.providerId.providerDetails?.rating || { average: 0, count: 0 },
                  completionRate: service.providerId.providerDetails?.metrics?.completionRate || 0,
                  responseTimeMinutes: service.providerId.providerDetails?.metrics?.responseSpeed || 0,
                }}
                onBook={handleBookService}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
