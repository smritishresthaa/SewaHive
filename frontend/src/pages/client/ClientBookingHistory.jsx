import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClientLayout from "../../layouts/ClientLayout";
import {
  HiMapPin,
  HiCalendar,
  HiClock,
  HiCheckCircle,
  HiPencilSquare,
  HiBolt,
} from "react-icons/hi2";
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
      const needsPayment =
        booking.paymentStatus === "pending" || booking.paymentStatus === "initiated";
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
      const parts = booking.addressText
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
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

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (
      highlightBookingId &&
      bookings.length > 0 &&
      bookingRefs.current[highlightBookingId]
    ) {
      setTimeout(() => {
        bookingRefs.current[highlightBookingId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setHighlightedId(highlightBookingId);
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
      console.log(
        `[ClientBookingHistory] Received: ${upcomingCount} upcoming, ${pastCount} past`
      );

      let allBookings = [...(res.data.bookings || []), ...(pastRes.data.bookings || [])];
      console.log(`[ClientBookingHistory] Total bookings in state: ${allBookings.length}`);

      const statusCounts = {};
      allBookings.forEach((b) => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      console.log("[ClientBookingHistory] Status breakdown:", statusCounts);

      setBookings(allBookings);

      const completedBookingIds = allBookings
        .filter((b) => b.status === "completed")
        .map((b) => b._id);

      if (completedBookingIds.length > 0) {
        const reviewChecks = await Promise.all(
          completedBookingIds.map((id) =>
            api
              .get(`/reviews/booking/${id}`)
              .catch(() => ({ data: { hasReviewed: false } }))
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
      await api.post(`/payment/escrow/confirm-completion`, {
        bookingId,
      });
      toast.success("Payment released to provider!");
      fetchBookings();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to confirm completion"
      );
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setProcessing({ ...processing, [bookingId]: true });
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: "Cancelled by client",
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

  function handleReviewSubmitted() {
    setReviewedBookings((prev) => new Set([...prev, selectedBooking._id]));
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
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
          styles[normalized] || styles[status] || "bg-gray-100"
        }`}
      >
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
    const needsPayment =
      booking.paymentStatus === "pending" || booking.paymentStatus === "initiated";
    const pricingType = resolvePricingType(booking);
    const isQuote = pricingType === PRICING_TYPES.QUOTE;
    const normalizedStatus = normalizeStatusForTab(booking.status);

    if (
      booking.status === "pending_payment" ||
      booking.status === "quote_accepted" ||
      (needsPayment && (booking.status === "accepted" || booking.status === "confirmed"))
    ) {
      return (
        <div className="flex min-w-0 flex-col gap-2 sm:min-w-[200px]">
          <button
            onClick={() => (window.location.href = `/payment/confirm/${booking._id}`)}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            {isQuote ? "Pay Now" : "Complete Payment"}
          </button>
          <button
            onClick={() => handleCancel(booking._id)}
            disabled={isProcessing}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (normalizedStatus === "completion_pending") {
      return (
        <div className="flex min-w-0 flex-col gap-2 sm:min-w-[200px]">
          <button
            onClick={() => handleConfirmCompletion(booking._id)}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
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
            className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50"
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
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
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
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
        );

      case "in-progress":
        return (
          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <HiClock className="h-4 w-4" /> Service in progress...
          </span>
        );

      case "pending-completion":
      case "provider_completed":
      case "awaiting_client_confirmation":
      case "completion_pending":
        return (
          <div className="flex min-w-0 flex-col gap-2 sm:min-w-[200px]">
            <button
              onClick={() => handleConfirmCompletion(booking._id)}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Confirm & Release Payment
            </button>
          </div>
        );

      case "completed": {
        const hasReviewed = reviewedBookings.has(booking._id);
        const paymentReleased =
          booking.paymentStatus === "released" || booking.paymentStatus === "paid";

        return (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {paymentReleased && (
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-green-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Payment Released</span>
              </div>
            )}
            {hasReviewed ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <HiCheckCircle className="h-4 w-4" />
                <span>Review Submitted</span>
              </div>
            ) : (
              <button
                onClick={() => handleLeaveReview(booking)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Leave Review
              </button>
            )}
          </div>
        );
      }

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

  const filteredBookings = bookings.filter((b) => matchesFilter(b, filter));

  return (
    <ClientLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="mt-1 text-gray-600">Manage your service bookings</p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {filterTabs.map((tab) => {
              const count =
                tab.value === "all"
                  ? bookings.length
                  : bookings.filter((b) => matchesFilter(b, tab.value)).length;

              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                    filter === tab.value
                      ? "bg-brand-700 text-white"
                      : "border bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                  {filter === tab.value && count > 0 && (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border bg-white py-20 text-center">
            <p className="text-lg text-gray-500">No bookings found</p>
            <p className="mt-2 text-sm text-gray-400">
              {filter === "all"
                ? "You haven't made any bookings yet"
                : "No bookings in this tab"}
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border bg-white py-20 text-center">
            <p className="text-lg text-gray-500">No bookings in this tab</p>
            <p className="mt-2 text-sm text-gray-400">
              Try another status filter
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                ref={(el) => (bookingRefs.current[booking._id] = el)}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6 ${
                  highlightedId === booking._id
                    ? "ring-4 ring-emerald-500 ring-opacity-50 shadow-xl"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="break-words text-lg font-semibold text-gray-900">
                        {booking.serviceId?.title || "Service"}
                      </h3>
                      {getStatusBadge(booking.status)}
                      {booking.type === "emergency" && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                          <HiBolt className="h-3.5 w-3.5" /> Emergency
                        </span>
                      )}
                    </div>

                    {booking.status === "pending_payment" && (
                      <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-yellow-800">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Payment Required
                        </p>
                        <p className="text-xs text-yellow-700">
                          Complete your payment to confirm this booking. Your payment
                          will be held securely in escrow until service completion.
                        </p>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                          <HiPencilSquare className="h-4 w-4" /> Details:
                        </p>
                        <p className="text-sm text-gray-600">{booking.notes}</p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm text-gray-600">
                      {(booking.providerId?.profile?.name || booking.providerId?.email) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">Provider:</span>
                          <span className="break-words">
                            {booking.providerId?.profile?.name ||
                              booking.providerId?.email}
                          </span>
                          {getProviderPrimaryCategory(booking) && (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                              {getProviderPrimaryCategory(booking)}
                            </span>
                          )}
                          {booking.providerId?.kycStatus === "approved" && (
                            <span className="flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                              <HiCheckCircle className="h-3.5 w-3.5" /> Verified
                            </span>
                          )}
                          {booking.providerId?.providerDetails?.badges &&
                            booking.providerId.providerDetails.badges !== "none" &&
                            booking.providerId.providerDetails.badges.length > 0 && (
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                {Array.isArray(booking.providerId.providerDetails.badges)
                                  ? booking.providerId.providerDetails.badges.join(", ")
                                  : String(
                                      booking.providerId.providerDetails.badges
                                    ).replace(/-/g, " ")}
                              </span>
                            )}
                        </div>
                      )}

                      {booking.paymentStatus && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">Payment:</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              booking.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : booking.paymentStatus === "escrow"
                                ? "bg-blue-100 text-blue-700"
                                : booking.paymentStatus === "released"
                                ? "bg-green-100 text-green-700"
                                : booking.paymentStatus === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : booking.paymentStatus === "initiated"
                                ? "bg-blue-100 text-blue-700"
                                : booking.paymentStatus === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {booking.paymentStatus === "paid"
                              ? "Payment Secured"
                              : booking.paymentStatus === "escrow"
                              ? "Funds Held Securely"
                              : booking.paymentStatus === "released"
                              ? "Payment Released"
                              : booking.paymentStatus === "pending"
                              ? "Pending Payment"
                              : booking.paymentStatus === "initiated"
                              ? "Payment Initiated"
                              : booking.paymentStatus === "failed"
                              ? "Failed"
                              : booking.paymentStatus}
                          </span>
                        </div>
                      )}

                      {(booking.paymentStatus === "paid" ||
                        booking.paymentStatus === "escrow") &&
                        (booking.status === "confirmed" ||
                          booking.status === "provider_en_route" ||
                          booking.status === "in-progress" ||
                          booking.status === "pending-completion") && (
                          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="flex items-start gap-2 text-xs text-blue-800">
                              <svg
                                className="mt-0.5 h-4 w-4 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>
                                <strong>Protected Payment:</strong> Your payment of NPR{" "}
                                {booking.totalAmount?.toLocaleString()} is held securely.
                                {booking.status === "pending-completion"
                                  ? " Provider has completed the job. Please confirm to release payment."
                                  : " Funds will be released after you confirm service completion."}
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

                      <div className="flex flex-wrap items-center gap-2">
                        <HiMapPin className="text-lg text-gray-400" />
                        <span>{formatLocationLabel(booking)}</span>
                        {booking.distanceKm && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                            {Number(booking.distanceKm).toFixed(1)}km away
                          </span>
                        )}
                      </div>

                      {booking.landmark && (
                        <div className="flex items-center gap-2 font-medium text-emerald-700">
                          <HiMapPin className="h-4 w-4 text-emerald-700" />
                          <span>Landmark: {booking.landmark}</span>
                        </div>
                      )}

                      {booking.type === "normal" && booking.schedule?.date && (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <HiCalendar className="font-semibold text-emerald-600" />
                            <span className="font-semibold text-gray-900">
                              {new Date(booking.schedule.date).toLocaleDateString()}
                            </span>
                          </div>
                          {booking.schedule?.slot && (
                            <div className="flex items-center gap-2">
                              <HiClock className="font-semibold text-emerald-600" />
                              <span className="font-semibold text-gray-900">
                                {booking.schedule.slot}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {booking.scheduledAt && !booking.schedule?.date && (
                        <div className="flex items-center gap-2">
                          <HiCalendar className="text-emerald-600" />
                          <span>
                            {new Date(booking.scheduledAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <HiClock className="text-gray-400" />
                        <span>
                          Created {new Date(booking.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
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

                  {/* Right */}
                  <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[220px] xl:items-end">
                    <button
                      onClick={() => navigate(`/client/bookings/${booking._id}`)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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