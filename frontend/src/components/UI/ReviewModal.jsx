import { useState } from "react";
import { HiXMark, HiStar } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";

export default function ReviewModal({ booking, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/reviews", {
        bookingId: booking._id,
        rating,
        comment: comment.trim(),
      });
      
      toast.success("Review submitted successfully!");
      onReviewSubmitted(res.data.review);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Leave a Review</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Close review modal"
          >
            <HiXMark className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-6">
          {/* Service Info */}
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Service</p>
            <p className="font-semibold text-gray-900 break-words">
              {booking.serviceId?.title || "Service"}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">Provider</p>
            <p className="font-medium text-gray-900 break-words">
              {booking.providerId?.profile?.name || "Provider"}
            </p>
          </div>

          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Rate your experience <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 justify-center py-2 sm:py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <HiStar
                    className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs sm:text-sm text-gray-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your feedback <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience with this provider..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
