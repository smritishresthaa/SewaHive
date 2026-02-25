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
  const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1

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
    } finally {
      setLoading(false);
    }
  }

  const filteredReviews = filter === "all" 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(filter));

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <HiStar
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
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
      1: "Poor"
    };
    return labels[rating] || "";
  };

  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">See what clients are saying about your services</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            {stats && (
              <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Average Rating */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {stats.averageRating}
                    </div>
                    <div className="flex justify-center mb-2">
                      {renderStars(Math.round(stats.averageRating))}
                    </div>
                    <p className="text-sm text-gray-600">
                      Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-3">Rating Distribution</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = stats.ratingDistribution[rating] || 0;
                        const percentage = stats.totalReviews > 0 
                          ? (count / stats.totalReviews) * 100 
                          : 0;
                        
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <button
                              onClick={() => setFilter(rating.toString())}
                              className={`flex items-center gap-1 text-sm font-medium min-w-[60px] hover:text-emerald-600 transition ${
                                filter === rating.toString() ? 'text-emerald-600' : 'text-gray-700'
                              }`}
                            >
                              <span>{rating}</span>
                              <HiStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            </button>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 min-w-[40px] text-right">
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

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filter === "all"
                    ? "bg-brand-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                All Reviews
                {filter === "all" && reviews.length > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {reviews.length}
                  </span>
                )}
              </button>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats?.ratingDistribution[rating] || 0;
                if (count === 0) return null;
                
                return (
                  <button
                    key={rating}
                    onClick={() => setFilter(rating.toString())}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      filter === rating.toString()
                        ? "bg-brand-700 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100 border"
                    }`}
                  >
                    <span>{rating}</span>
                    <HiStar className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {filter === rating.toString() && (
                      <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <p className="text-gray-500 text-lg">No reviews yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filter === "all" 
                    ? "Complete bookings to start receiving reviews from clients"
                    : `No ${filter}-star reviews found`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition"
                  >
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-sm">
                              {review.clientId?.profile?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {review.clientId?.profile?.name || "Anonymous"}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-sm text-gray-600 mt-1">
                          {getRatingLabel(review.rating)}
                        </p>
                      </div>
                    </div>

                    {/* Service Info */}
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Service:</span>{" "}
                        {review.bookingId?.serviceId?.title || "Service"}
                      </p>
                    </div>

                    {/* Review Comment */}
                    {review.comment && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">
                          "{review.comment}"
                        </p>
                      </div>
                    )}

                    {!review.comment && (
                      <p className="text-gray-400 italic text-sm">
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
