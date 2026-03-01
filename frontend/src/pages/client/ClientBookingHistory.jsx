import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClientLayout from "../../layouts/ClientLayout";
import { HiMapPin, HiCalendar, HiClock } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import ReviewModal from "../../components/UI/ReviewModal";
import {
  statusMatchesTab,
  normalizeStatusForTab,
  isCompletionPendingStatus,
  resolvePricingType,
  PRICING_TYPES,
} from "../../utils/bookingWorkflow";

export default function ClientBookingHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const highlightBookingId = location.state?.highlightBookingId;
  const bookingRefs = useRef({});
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [processing, setProcessing] = useState({});
  const [highlightedId, setHighlightedId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewedBookings, setReviewedBookings] = useState(new Set());

  const matchesFilter = (booking, filterValue) => {
    if (filterValue === "all") return true;

    if (filterValue === "pending_payment") {
      const needsPayment = booking.paymentStatus === "pending" || booking.paymentStatus === "initiated";
      if (booking.status === "pending_payment") return true;
      if (normalizeStatusForTab(booking.status) === "pending_payment") return true;
      return booking.status === "accepted" && needsPayment;
    }

    if (filterValue === "in_progress") {
      return booking.status === "in-progress";
    }

    if (filterValue === "completion_pending") {
      return isCompletionPendingStatus(booking.status);
    }

    if (filterValue === "requested") {
      return statusMatchesTab(booking.status, "requested");
    }

    if (filterValue === "confirmed") {
      return statusMatchesTab(booking.status, "confirmed");
    }

    if (filterValue === "completed") {
      return statusMatchesTab(booking.status, "completed");
    }

    if (filterValue === "disputed") {
      return statusMatchesTab(booking.status, "disputed");
    }

    return statusMatchesTab(booking.status, filterValue);
  };

  function formatLocationLabel(booking) {
    if (booking.addressText) {
      const parts = booking.addressText.split(",").map((p) => p.trim()).filter(Boolean);
      const short = parts.slice(0, 3).join(", ");
      return short || booking.addressText;
    }
    if (booking.landmark) return booking.landmark;
    const structured = [booking.address?.area, booking.address?.city, booking.address?.country]
      .filter(Boolean)
      .join(", ");
    if (structured) return structured;
    if (booking.location?.coordinates?.length === 2) {
      return `Lat ${booking.location.coordinates[1].toFixed(4)}, Lng ${booking.location.coordinates[0].toFixed(4)}`;
    }
    return "Location not specified";
  }

  function getProviderPrimaryCategory(booking) {
    return (
      booking.providerId?.providerDetails?.categories?.[0] ||
      booking.serviceId?.category ||
      ""
    );
  }

  // Initial fetch on page load only (manual refresh button handles subsequent reloads)
  useEffect(() => {
    console.log("[ClientBookingHistory] Component mounted - fetching bookings");
    fetchBookings();
  }, []);

  // Scroll to and highlight booking from notification
  useEffect(() => {
    if (highlightBookingId && bookings.length > 0 && bookingRefs.current[highlightBookingId]) {
      setTimeout(() => {
        bookingRefs.current[highlightBookingId]?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
        setHighlightedId(highlightBookingId);
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedId(null), 3000);
      }, 100);
    }
  }, [highlightBookingId, bookings]);

  async function fetchBookings() {
    try {
      setLoading(true);
      console.log("[ClientBookingHistory] Fetching bookings...");
      const res = await api.get(`/bookings/upcoming`);
      const pastRes = await api.get(`/bookings/past`);
      
      const upcomingCount = res.data.bookings?.length || 0;
      const pastCount = pastRes.data.bookings?.length || 0;
      console.log(`[ClientBookingHistory] Received: ${upcomingCount} upcoming, ${pastCount} past`);
      
      // Store ALL bookings in state - filtering happens in render
      let allBookings = [...(res.data.bookings || []), ...(pastRes.data.bookings || [])];
      console.log(`[ClientBookingHistory] Total bookings in state: ${allBookings.length}`);
      
      // DEBUG: Log all statuses
      const statusCounts = {};
      allBookings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      console.log("[ClientBookingHistory] Status breakdown:", statusCounts);
      console.log("[ClientBookingHistory] First 3 bookings:", allBookings.slice(0, 3).map(b => ({ 
        id: b._id, 
        title: b.serviceId?.title || 'N/A',
        status: b.status, 
        createdAt: b.requestedAt,
        paymentStatus: b.paymentStatus
      })));
      
      setBookings(allBookings);
      
      // Check which completed bookings have been reviewed
      const completedBookingIds = allBookings
        .filter(b => b.status === "completed")
        .map(b => b._id);
      
      if (completedBookingIds.length > 0) {
        const reviewChecks = await Promise.all(
          completedBookingIds.map(id => 
            api.get(`/reviews/booking/${id}`).catch(() => ({ data: { hasReviewed: false } }))
          )
        );
        
        const reviewed = new Set();
        reviewChecks.forEach((res, idx) => {
          if (res.data.hasReviewed) {
            reviewed.add(completedBookingIds[idx]);
          }
        });
        setReviewedBookings(reviewed);
      }
    } catch (err) {
      console.error("[ClientBookingHistory] Failed to fetch bookings:", err);
      // Set empty array instead of showing error
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCompletion(bookingId) {
    const isProcessing = processing[bookingId];
    if (isProcessing) return;

    setProcessing({ ...processing, [bookingId]: true });
    try {
      // Use the escrow endpoint for proper payment release
      await api.post(`/payment/escrow/confirm-completion`, {
        bookingId
      });
      toast.success("Payment released to provider! ✅");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to confirm completion");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    setProcessing({ ...processing, [bookingId]: true });
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: "Cancelled by client"
      });
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  function handleLeaveReview(booking) {
    setSelectedBooking(booking);
    setReviewModalOpen(true);
  }

  function handleReviewSubmitted(review) {
    setReviewedBookings(prev => new Set([...prev, selectedBooking._id]));
    setSelectedBooking(null);
  }

  const getStatusBadge = (status) => {
    const normalized = normalizeStatusForTab(status);
    const styles = {
      pending_payment: "bg-yellow-100 text-yellow-700",
      requested: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      confirmed: "bg-emerald-100 text-emerald-700",
      provider_en_route: "bg-teal-100 text-teal-700",
      "in-progress": "bg-purple-100 text-purple-700",
      in_progress: "bg-purple-100 text-purple-700",
      "pending-completion": "bg-yellow-100 text-yellow-700",
      completion_pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      rejected: "bg-orange-100 text-orange-700",
      disputed: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${styles[normalized] || styles[status] || "bg-gray-100"}`}>
        {normalized === "pending_payment"
          ? "Awaiting Payment"
          : normalized === "completion_pending"
          ? "Completion Pending"
          : normalized.replace(/_/g, " ")}
      </span>
    );
  };

  const getActionButtons = (booking) => {
    const isProcessing = processing[booking._id];
    const needsPayment = booking.paymentStatus === 'pending' || booking.paymentStatus === 'initiated';
    const pricingType = resolvePricingType(booking);
    const isQuote = pricingType === PRICING_TYPES.QUOTE;
    const normalizedStatus = normalizeStatusForTab(booking.status);

    // Show payment button if booking is pending_payment
    if (
      booking.status === 'pending_payment' ||
      booking.status === 'quote_accepted' ||
      (needsPayment && (booking.status === 'accepted' || booking.status === 'confirmed'))
    ) {
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <button
            onClick={() => window.location.href = `/payment/confirm/${booking._id}`}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            {isQuote ? "Pay Now" : "Complete Payment"}
          </button>
          <button
            onClick={() => handleCancel(booking._id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (normalizedStatus === "completion_pending") {
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <button
            onClick={() => handleConfirmCompletion(booking._id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Confirm & Release Payment
          </button>
        </div>
      );
    }

    switch (booking.status) {
      case "requested":
      case "quote_requested":
      case "quote_sent":
      case "quote_pending_admin_review":
        return (
          <button
            onClick={() => handleCancel(booking._id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
        );
      
      case "accepted":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleCancel(booking._id)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        );
      
      case "confirmed":
        return (
          <button
            onClick={() => handleCancel(booking._id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
        );
      
      case "in-progress":
        return (
          <span className="text-sm text-gray-600 font-medium">
            ⏳ Service in progress...
          </span>
        );
      
      case "pending-completion":
      case "provider_completed":
      case "awaiting_client_confirmation":
      case "completion_pending":
        return (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <button
              onClick={() => handleConfirmCompletion(booking._id)}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Confirm & Release Payment
            </button>
          </div>
        );
      
      case "completed":
        const hasReviewed = reviewedBookings.has(booking._id);
        const paymentReleased = booking.paymentStatus === 'released' || booking.paymentStatus === 'paid';
        
        return (
          <div className="flex flex-col gap-2 items-end">
            {paymentReleased && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Payment Released \u2714</span>
              </div>
            )}
            {hasReviewed ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <span>\u2713</span>
                <span>Review Submitted</span>
              </div>
            ) : (
              <button 
                onClick={() => handleLeaveReview(booking)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm transition"
              >
                Leave Review
              </button>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const filterTabs = [
    { value: "all", label: "All" },
    { value: "requested", label: "Requested" },
    { value: "pending_payment", label: "Awaiting Payment" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_progress", label: "In Progress" },
    { value: "completion_pending", label: "Completion Pending" },
    { value: "completed", label: "Completed" },
    { value: "disputed", label: "Disputed" },
  ];

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600 mt-1">Manage your service bookings</p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 font-medium text-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filterTabs.map((tab) => {
            let count;
            if (tab.value === "all") {
              count = bookings.length;
            } else {
              count = bookings.filter((b) => matchesFilter(b, tab.value)).length;
            }
              
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filter === tab.value
                    ? "bg-brand-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {tab.label}
                {filter === tab.value && count > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <p className="text-gray-500 text-lg">No bookings found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filter === "all" ? "You haven't made any bookings yet" : "No bookings in this tab"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings
              .filter((b) => matchesFilter(b, filter))
              .map((booking) => (
              <div
                key={booking._id}
                ref={(el) => (bookingRefs.current[booking._id] = el)}
                className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all ${
                  highlightedId === booking._id 
                    ? "ring-4 ring-emerald-500 ring-opacity-50 shadow-xl" 
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: Booking Info */}
                  <div className="flex-1 min-w-[300px]">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.serviceId?.title || "Service"}
                      </h3>
                      {getStatusBadge(booking.status)}
                      {booking.type === "emergency" && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          ⚡ Emergency
                        </span>
                      )}
                    </div>

                    {/* Pending Payment Notice */}
                    {booking.status === 'pending_payment' && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 font-semibold mb-1 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Payment Required
                        </p>
                        <p className="text-xs text-yellow-700">
                          Complete your payment to confirm this booking. Your payment will be held securely in escrow until service completion.
                        </p>
                      </div>
                    )}

                    {/* Show booking notes/description */}
                    {booking.notes && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 font-medium mb-1">📝 Details:</p>
                        <p className="text-sm text-gray-600">{booking.notes}</p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm text-gray-600">
                      {(booking.providerId?.profile?.name || booking.providerId?.email) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">Provider:</span>
                          <span>{booking.providerId?.profile?.name || booking.providerId?.email}</span>
                          {getProviderPrimaryCategory(booking) && (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                              {getProviderPrimaryCategory(booking)}
                            </span>
                          )}
                          {booking.providerId?.kycStatus === "approved" && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                              ✓ Verified
                            </span>
                          )}
                          {booking.providerId?.providerDetails?.badges && booking.providerId.providerDetails.badges !== "none" && booking.providerId.providerDetails.badges.length > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {Array.isArray(booking.providerId.providerDetails.badges)
                                ? booking.providerId.providerDetails.badges.join(", ")
                                : String(booking.providerId.providerDetails.badges).replace(/-/g, " ")}
                            </span>
                          )}
                        </div>
                      )}
                      {booking.paymentStatus && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Payment:</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            booking.paymentStatus === 'paid' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : booking.paymentStatus === 'escrow'
                              ? 'bg-blue-100 text-blue-700'
                              : booking.paymentStatus === 'released'
                              ? 'bg-green-100 text-green-700'
                              : booking.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : booking.paymentStatus === 'initiated'
                              ? 'bg-blue-100 text-blue-700'
                              : booking.paymentStatus === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.paymentStatus === 'paid' ? '🔒 Payment Secured' : 
                             booking.paymentStatus === 'escrow' ? '🔒 Funds Held Securely' :
                             booking.paymentStatus === 'released' ? '✅ Payment Released' :
                             booking.paymentStatus === 'pending' ? '⏳ Pending Payment' :
                             booking.paymentStatus === 'initiated' ? '💳 Payment Initiated' :
                             booking.paymentStatus === 'failed' ? '✗ Failed' :
                             booking.paymentStatus}
                          </span>
                        </div>
                      )}
                      
                      {/* Payment Escrow Info Card */}
                      {(booking.paymentStatus === 'paid' || booking.paymentStatus === 'escrow') && 
                       (booking.status === 'confirmed' || booking.status === 'provider_en_route' || booking.status === 'in-progress' || booking.status === 'pending-completion') && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>
                              <strong>Protected Payment:</strong> Your payment of NPR {booking.totalAmount?.toLocaleString()} is held securely. 
                              {booking.status === 'pending-completion' 
                                ? 'Provider has completed the job. Please confirm to release payment.' 
                                : 'Funds will be released after you confirm service completion.'}
                            </span>
                          </p>
                        </div>
                      )}
                      {booking.providerId?.phone && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Phone:</span>
                          <span>{booking.providerId.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <HiMapPin className="text-gray-400 text-lg" />
                        <span>{formatLocationLabel(booking)}</span>
                        {booking.distanceKm && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {Number(booking.distanceKm).toFixed(1)}km away
                          </span>
                        )}
                      </div>
                      
                      {/* EXPLICIT LANDMARK DISPLAY */}
                      {booking.landmark && (
                        <div className="flex items-center gap-2 text-emerald-700 font-medium">
                          <span>📍</span>
                          <span>Landmark: {booking.landmark}</span>
                        </div>
                      )}
                      
                      {/* SCHEDULED DATE & TIME - Match provider display */}
                      {booking.type === "normal" && booking.schedule?.date && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <HiCalendar className="text-emerald-600 font-semibold" />
                            <span className="font-semibold text-gray-900">
                              {new Date(booking.schedule.date).toLocaleDateString()}
                            </span>
                          </div>
                          {booking.schedule?.slot && (
                            <div className="flex items-center gap-2">
                              <HiClock className="text-emerald-600 font-semibold" />
                              <span className="font-semibold text-gray-900">
                                {booking.schedule.slot}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* FALLBACK: Show scheduled time if available */}
                      {booking.scheduledAt && !booking.schedule?.date && (
                        <div className="flex items-center gap-2">
                          <HiCalendar className="text-emerald-600" />
                          <span>{new Date(booking.scheduledAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {/* CREATED DATE - Secondary info */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <HiClock className="text-gray-400" />
                        <span>Created {new Date(booking.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        NPR {booking.totalAmount?.toLocaleString()}
                      </span>
                      {booking.emergencyFee > 0 && (
                        <span className="text-xs text-orange-600">
                          +{booking.emergencyFee} emergency fee
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <button
                      onClick={() => navigate(`/client/bookings/${booking._id}`)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition"
                    >
                      View Details
                    </button>
                    {getActionButtons(booking)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedBooking && (
        <ReviewModal
          booking={selectedBooking}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedBooking(null);
          }}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </ClientLayout>
  );
}
