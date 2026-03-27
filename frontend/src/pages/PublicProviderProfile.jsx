import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNavbar from "../components/Navbar/TopNavbar";
import {
  HiStar,
  HiMapPin,
  HiCheckCircle,
  HiClock,
  HiBolt,
} from "react-icons/hi2";
import api from "../utils/axios";

export default function PublicProviderProfile() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  async function fetchProvider() {
    try {
      setLoading(true);
      const res = await api.get(`/providers/public/${providerId}`);
      setProvider(res.data);
    } catch (err) {
      console.error("Failed to load provider:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleBookService(serviceId) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/booking/${serviceId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex h-96 items-center justify-center px-4">
          <div className="text-center text-gray-500">Provider not found</div>
        </div>
      </div>
    );
  }

  const ratingAverage =
    typeof provider.rating?.average === "number" ? provider.rating.average : 0;
  const ratingCount =
    typeof provider.rating?.count === "number" ? provider.rating.count : 0;
  const responseMinutes =
    typeof provider.responseTimeMinutes === "number"
      ? Math.round(provider.responseTimeMinutes)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header Card */}
        <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <img
              src={provider.avatar || "https://via.placeholder.com/120"}
              alt={provider.name}
              className="mx-auto h-24 w-24 rounded-full object-cover sm:mx-0 sm:h-32 sm:w-32"
            />

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                  {provider.name}
                </h1>
                {provider.isVerified && (
                  <HiCheckCircle
                    className="text-2xl text-emerald-500"
                    title="Verified Provider"
                  />
                )}
              </div>

              {provider.bio && (
                <p className="mb-4 break-words text-gray-600">{provider.bio}</p>
              )}

              {/* Trust Signals */}
              <div className="mb-4 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
                <div className="text-sm">
                  <p className="text-gray-600">Rating</p>
                  <div className="flex items-center gap-1">
                    <HiStar className="text-yellow-500" />
                    <span className="font-bold">{ratingAverage.toFixed(1)}</span>
                    <span className="text-gray-500">({ratingCount})</span>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-gray-600">Jobs Completed</p>
                  <p className="text-lg font-bold">{provider.completedJobs}</p>
                </div>

                <div className="text-sm">
                  <p className="text-gray-600">Response Time</p>
                  <div className="flex items-center gap-1">
                    <HiClock className="text-blue-500" />
                    <span className="font-bold">{responseMinutes}m</span>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-gray-600">Repeat Clients</p>
                  <p className="font-bold">{provider.repeatClients}</p>
                </div>
              </div>

              {/* Badges */}
              {provider.badges?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {provider.badges.map((badge, i) => {
                    let style = "bg-gray-100 text-gray-700 border-gray-200";
                    let icon = "🛡️";
                    let label = badge;

                    if (badge === "verified" || badge === "Verified Provider") {
                      style =
                        "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20";
                      icon = "✅";
                      label = "Verified Provider";
                    } else if (badge === "pro" || badge === "Pro Provider") {
                      style =
                        "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20";
                      icon = "💠";
                      label = "Pro Provider";
                    } else if (badge === "top-rated" || badge === "Top Rated") {
                      style =
                        "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20";
                      icon = "🏆";
                      label = "Top Rated";
                    }

                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm sm:px-4 sm:text-sm ${style}`}
                      >
                        <span className="text-base sm:text-lg">{icon}</span>
                        <span className="break-words">{label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-bold">Specializations</h2>
          <div className="flex flex-wrap gap-3">
            {provider.approvedCategories?.length > 0 ? (
              provider.approvedCategories.map((cat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 font-medium text-brand-700"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="break-words">{cat.name}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No specializations listed</p>
            )}
          </div>
        </div>

        {/* About */}
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-xl font-bold">About</h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <p className="text-sm text-gray-600">Experience</p>
                <p className="font-semibold">
                  {provider.yearsOfExperience} years in the field
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trust Score</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-brand-700"
                      style={{ width: `${provider.trustScore}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">
                    {provider.trustScore}/100
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="font-semibold">
                  {Math.round(provider.completionRate)}%
                </p>
              </div>
            </div>
          </div>

          {provider.specializations?.length > 0 && (
            <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-xl font-bold">Specializations</h2>
              <div className="space-y-2">
                {provider.specializations.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-700">
                    <span className="h-2 w-2 rounded-full bg-brand-700" />
                    <span className="break-words">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Portfolio */}
        {provider.portfolio?.length > 0 && (
          <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-xl font-bold">Portfolio</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {provider.portfolio.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-40 overflow-hidden rounded-lg bg-gray-100 transition-all hover:shadow-lg"
                >
                  <img
                    src={item.url}
                    alt="Portfolio item"
                    className="h-full w-full object-cover transition-transform hover:scale-110"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Services Offered */}
        {provider.services?.length > 0 && (
          <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-6 text-xl font-bold">Services Offered</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {provider.services.map((service) => (
                <div
                  key={service._id}
                  className="overflow-hidden rounded-lg border transition-all hover:shadow-lg"
                >
                  {service.image && (
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-32 w-full object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="mb-1 text-xs text-gray-600">{service.category}</p>
                    <h3 className="mb-1 line-clamp-2 text-sm font-bold">
                      {service.title}
                    </h3>
                    <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-bold">NPR {service.price}</p>
                      <button
                        onClick={() => handleBookService(service._id)}
                        className="rounded bg-brand-700 px-3 py-1 text-sm text-white transition-colors hover:bg-brand-800"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {provider.recentReviews?.length > 0 && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-6 text-xl font-bold">Recent Reviews</h2>
            <div className="space-y-4">
              {provider.recentReviews.map((review) => (
                <div key={review._id} className="border-b pb-4 last:border-b-0">
                  <div className="mb-2 flex items-start gap-3">
                    <img
                      src={review.clientAvatar || "https://via.placeholder.com/40"}
                      alt={review.clientName}
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">
                        {review.clientName}
                      </p>
                      <div className="flex items-center gap-1 text-sm">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HiStar
                            key={i}
                            className={
                              i < review.rating ? "text-yellow-500" : "text-gray-300"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="break-words text-sm text-gray-600">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}