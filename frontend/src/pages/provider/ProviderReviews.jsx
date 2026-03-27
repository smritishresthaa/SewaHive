import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiStar } from "react-icons/hi";
import api from "../../utils/axios";
import toast from "react-hot-toast";

export default function ProviderReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/provider/${user.id}`);
      setReviews(res.data.reviews);
      setStats(res.data.stats);
    } catch (err) {
      console.log("Reviews endpoint not available yet:", err.message);
      setReviews([]);
      setStats({ total: 0, average: 0, breakdown: {} });
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  const filteredReviews =
    filter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(filter));

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <HiStar
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingLabel = (rating) => {
    const labels = {
      5: "Excellent",
      4: "Very Good",
      3: "Good",
      2: "Fair",
      1: "Poor",
    };
    return labels[rating] || "";
  };

  return (
    <ProviderLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Reviews</h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            See what clients are saying about your services
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
          </div>
        ) : (
          <>
            {stats && (
              <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <div className="mb-2 text-4xl font-bold text-gray-900 sm:text-5xl">
                      {stats.averageRating}
                    </div>
                    <div className="mb-2 flex justify-center">
                      {renderStars(Math.round(stats.averageRating))}
                    </div>
                    <p className="text-sm text-gray-600">
                      Based on {stats.totalReviews} review
                      {stats.totalReviews !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="mb-3 font-semibold text-gray-900">Rating Distribution</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = stats.ratingDistribution[rating] || 0;
                        const percentage =
                          stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

                        return (
                          <div key={rating} className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={() => setFilter(rating.toString())}
                              className={`flex min-w-[60px] items-center gap-1 text-sm font-medium transition hover:text-emerald-600 ${
                                filter === rating.toString() ? "text-emerald-600" : "text-gray-700"
                              }`}
                            >
                              <span>{rating}</span>
                              <HiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </button>

                            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full bg-yellow-400 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            <span className="min-w-[40px] flex-shrink-0 text-right text-sm text-gray-600">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="-mx-1 mb-6 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
              <button
                onClick={() => setFilter("all")}
                className={`inline-flex flex-shrink-0 items-center rounded-lg px-4 py-2 font-medium whitespace-nowrap transition-colors ${
                  filter === "all"
                    ? "bg-brand-700 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                All Reviews
                {filter === "all" && reviews.length > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {reviews.length}
                  </span>
                )}
              </button>

              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats?.ratingDistribution?.[rating] || 0;
                if (count === 0) return null;

                return (
                  <button
                    key={rating}
                    onClick={() => setFilter(rating.toString())}
                    className={`inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-4 py-2 font-medium whitespace-nowrap transition-colors ${
                      filter === rating.toString()
                        ? "bg-brand-700 text-white"
                        : "border bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>{rating}</span>
                    <HiStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {filter === rating.toString() && (
                      <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredReviews.length === 0 ? (
              <div className="rounded-2xl border bg-white py-16 text-center sm:py-20">
                <p className="text-lg text-gray-500">No reviews yet</p>
                <p className="mt-2 text-sm text-gray-400">
                  {filter === "all"
                    ? "Complete bookings to start receiving reviews from clients"
                    : `No ${filter}-star reviews found`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <div
                    key={review._id}
                    className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6"
                  >
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <span className="text-sm font-semibold text-emerald-700">
                              {review.clientId?.profile?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-gray-900">
                              {review.clientId?.profile?.name || "Anonymous"}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        {renderStars(review.rating)}
                        <p className="mt-1 text-sm text-gray-600">
                          {getRatingLabel(review.rating)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 border-b pb-3">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Service:</span>{" "}
                        <span className="break-words">
                          {review.bookingId?.serviceId?.title || "Service"}
                        </span>
                      </p>
                    </div>

                    {review.comment ? (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="break-words leading-relaxed text-gray-700">
                          "{review.comment}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm italic text-gray-400">
                        No written feedback provided
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProviderLayout>
  );
}