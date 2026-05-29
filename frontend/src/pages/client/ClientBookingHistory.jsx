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

const DASHBOARD_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function buildRangeParams(range, fromDate, toDate) {
  const params = {};

  if (range === "custom" && fromDate && toDate) {
    params.range = "custom";
    params.from = fromDate;
    params.to = toDate;
  } else {
    params.range = range;
  }

  return params;
}

function getPaymentBadge(paymentStatus) {
  const normalized = String(paymentStatus || "").toLowerCase();

  const map = {
    pending: { label: "Pending Payment", className: "bg-yellow-100 text-yellow-700" },
    initiated: {
      label: "Payment Initiated",
      className: "bg-blue-100 text-blue-700",
    },
    funds_held: {
      label: "Funds Held Securely",
      className: "bg-blue-100 text-blue-700",
    },
    escrow: {
      label: "Funds Held Securely",
      className: "bg-blue-100 text-blue-700",
    },
    paid: { label: "Payment Secured", className: "bg-emerald-100 text-emerald-700" },
    released: { label: "Payment Released", className: "bg-green-100 text-green-700" },
    refunded: { label: "Refunded", className: "bg-gray-100 text-gray-700" },
    partially_refunded: {
      label: "Partial Refund",
      className: "bg-amber-100 text-amber-700",
    },
    failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  };

  return (
    map[normalized] || {
      label: paymentStatus ? String(paymentStatus).replace(/_/g, " ") : "Unknown",
      className: "bg-gray-100 text-gray-700",
    }
  );
}

function isEscrowProtected(paymentStatus) {
  const normalized = String(paymentStatus || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  return ["paid", "escrow", "funds_held", "released"].includes(normalized);
}

function getStatusMessage(booking) {
  const normalized = normalizeStatusForTab(booking?.status);
  const total = Number(booking?.totalAmount || 0);

  if (booking?.paymentStatus === "refunded") {
    if (normalized === "expired") {
      return `This booking request expired because the provider did not respond in time. NPR ${total.toLocaleString()} was refunded.`;
    }
    if (normalized === "no_show" || booking?.status === "no-show") {
      return `This booking was marked as no-show because the provider did not start on time. NPR ${total.toLocaleString()} was refunded.`;
    }
    if (normalized === "rejected") {
      return `The provider rejected this booking and your payment was refunded.`;
    }
  }

  if (booking?.paymentStatus === "partially_refunded") {
    return "This booking was partially refunded after dispute resolution.";
  }

  return null;
}

export default function ClientBookingHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingRefs = useRef({});

  const queryParams = new URLSearchParams(location.search);
  const stateInitialFilter = location.state?.initialFilter;
  const queryInitialFilter = queryParams.get("filter");
  const highlightBookingId =
    location.state?.highlightBookingId || queryParams.get("bookingId");

  const resolvedInitialFilter = stateInitialFilter || queryInitialFilter || "all";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(resolvedInitialFilter);
  const [processing, setProcessing] = useState({});
  const [highlightedId, setHighlightedId] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewedBookings, setReviewedBookings] = useState(new Set());

  const [selectedRange, setSelectedRange] = useState("month");
  const [appliedRange, setAppliedRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  const matchesFilter = (booking, filterValue) => {
    const normalized = normalizeStatusForTab(booking.status);

    if (filterValue === "all") return true;

        if (filterValue === "pending_payment") {
      const needsPayment =
        booking.paymentStatus === "pending" || booking.paymentStatus === "initiated";

      if (isEscrowProtected(booking.paymentStatus)) return false;

      if (booking.status === "pending_payment") return true;
      if (normalized === "pending_payment") return true;

      return booking.status === "accepted" && needsPayment;
    }

    if (filterValue === "in_progress") {
      return normalized === "in_progress";
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

  function formatDateTimeLocalValue(dateInput) {
    if (!dateInput) return "";
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function openRescheduleModal(booking) {
    setRescheduleBooking(booking);
    setRescheduleError("");

    const initialDateTime =
      formatDateTimeLocalValue(booking?.scheduledAt) ||
      formatDateTimeLocalValue(booking?.schedule?.date);

    setRescheduleDateTime(initialDateTime);
    setRescheduleModalOpen(true);
  }

  function closeRescheduleModal() {
    if (rescheduleBooking?._id && processing[rescheduleBooking._id]) return;

    setRescheduleModalOpen(false);
    setRescheduleBooking(null);
    setRescheduleDateTime("");
    setRescheduleError("");
  }

  useEffect(() => {
    setFilter(resolvedInitialFilter);
  }, [resolvedInitialFilter]);

  useEffect(() => {
    if (selectedRange !== "custom") {
      setAppliedRange(selectedRange);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchBookings(appliedRange, appliedCustomFrom, appliedCustomTo);

    const iv = setInterval(() => {
      if (!document.hidden) {
        fetchBookings(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    }, 30000);

    const vis = () => {
      if (!document.hidden) {
        fetchBookings(appliedRange, appliedCustomFrom, appliedCustomTo);
      }
    };

    document.addEventListener("visibilitychange", vis);

    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedRange, appliedCustomFrom, appliedCustomTo]);

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

  useEffect(() => {
    if (!rescheduleModalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeRescheduleModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [rescheduleModalOpen, rescheduleBooking, processing]);

  async function fetchBookings(
    range = appliedRange,
    fromDate = appliedCustomFrom,
    toDate = appliedCustomTo
  ) {
    try {
      setLoading(true);

      const params = buildRangeParams(range, fromDate, toDate);

      const [res, pastRes] = await Promise.all([
        api.get(`/bookings/upcoming`, { params }),
        api.get(`/bookings/past`, { params }),
      ]);

      const allBookings = [
        ...(res.data.bookings || []),
        ...(pastRes.data.bookings || []),
      ];

      setBookings(allBookings);

      const completedBookingIds = allBookings
        .filter((b) => normalizeStatusForTab(b.status) === "completed")
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
        reviewChecks.forEach((resItem, idx) => {
          if (resItem.data.hasReviewed) {
            reviewed.add(completedBookingIds[idx]);
          }
        });

        setReviewedBookings(reviewed);
      } else {
        setReviewedBookings(new Set());
      }
    } catch (err) {
      console.error("[ClientBookingHistory] Failed to fetch bookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  function handleRangeSelect(rangeValue) {
    setSelectedRange(rangeValue);

    if (rangeValue !== "custom") {
      setAppliedRange(rangeValue);
    }
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;

    setAppliedCustomFrom(customFrom);
    setAppliedCustomTo(customTo);
    setAppliedRange("custom");
  }

  function handleResetCustomRange() {
    setCustomFrom("");
    setCustomTo("");
    setAppliedCustomFrom("");
    setAppliedCustomTo("");
    setSelectedRange("month");
    setAppliedRange("month");
  }

  async function handleConfirmCompletion(bookingId) {
    const isProcessing = processing[bookingId];
    if (isProcessing) return;

    setProcessing((prev) => ({ ...prev, [bookingId]: true }));

    try {
      await api.post(`/payment/escrow/confirm-completion`, {
        bookingId,
      });
      toast.success("Payment released to provider");
      fetchBookings();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to confirm completion"
      );
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleCancel(bookingId) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    setProcessing((prev) => ({ ...prev, [bookingId]: true }));

    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: "Cancelled by client",
      });
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleReschedule(bookingId) {
    const inputValue = String(rescheduleDateTime || "").trim();

    if (!inputValue) {
      setRescheduleError("Please select a new schedule date and time.");
      return;
    }

    setRescheduleError("");
    setProcessing((prev) => ({ ...prev, [bookingId]: true }));

    try {
      const iso = new Date(inputValue);
      if (Number.isNaN(iso.getTime())) {
        setRescheduleError("Please enter a valid date and time.");
        return;
      }

      await api.patch(`/bookings/${bookingId}/reschedule`, {
        scheduledAt: iso.toISOString(),
      });

      toast.success("Booking rescheduled successfully");
      closeRescheduleModal();
      fetchBookings();
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to reschedule booking";
      setRescheduleError(message);
      toast.error(message);
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
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
      in_progress: "bg-purple-100 text-purple-700",
      completion_pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      rejected: "bg-orange-100 text-orange-700",
      disputed: "bg-yellow-100 text-yellow-700",
      expired: "bg-slate-100 text-slate-700",
      no_show: "bg-red-100 text-red-700",
    };

    const labelMap = {
      pending_payment: "Awaiting Payment",
      completion_pending: "Completion Pending",
      in_progress: "In Progress",
      no_show: "No Show",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
          styles[normalized] || "bg-gray-100 text-gray-700"
        }`}
      >
        {labelMap[normalized] || normalized.replace(/_/g, " ")}
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

    const hasEscrowHeld = ["funds_held", "paid", "released"].includes(
      String(booking.paymentStatus || "").toLowerCase()
    );

    const hasAdditionalEscrowDue =
      Number(booking.pricing?.additionalEscrowRequired || 0) > 0;

    if (
      !hasEscrowHeld &&
      (
        booking.status === "pending_payment" ||
        booking.status === "quote_accepted" ||
        hasAdditionalEscrowDue ||
        (needsPayment && (booking.status === "accepted" || booking.status === "confirmed"))
      )
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

          <div className="flex gap-2">
            <button
              onClick={() => openRescheduleModal(booking)}
              disabled={isProcessing}
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              Reschedule
            </button>
            <button
              onClick={() => handleCancel(booking._id)}
              disabled={isProcessing}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
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

    if (normalizedStatus === "expired") {
      return <span className="text-sm font-medium text-slate-600">Request expired</span>;
    }

    if (normalizedStatus === "rejected") {
      return (
        <span className="text-sm font-medium text-orange-600">
          Rejected by provider
        </span>
      );
    }

    if (normalizedStatus === "no_show" || booking.status === "no-show") {
      return (
        <span className="text-sm font-medium text-red-600">
          Provider no-show recorded
        </span>
      );
    }

    switch (booking.status) {
      case "requested":
      case "quote_requested":
      case "quote_sent":
      case "quote_pending_admin_review":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => openRescheduleModal(booking)}
              disabled={isProcessing}
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              Reschedule
            </button>
            <button
              onClick={() => handleCancel(booking._id)}
              disabled={isProcessing}
              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
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
          <div className="flex gap-2">
            <button
              onClick={() => openRescheduleModal(booking)}
              disabled={isProcessing}
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              Reschedule
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

      case "in-progress":
        return (
          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <HiClock className="h-4 w-4" /> Service in progress
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="mt-1 text-gray-600">Manage your service bookings</p>
          </div>

          <button
            onClick={() => fetchBookings()}
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

        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {DASHBOARD_RANGES.map((item) => {
              const active = selectedRange === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleRangeSelect(item.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {selectedRange === "custom" && (
            <div className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-end lg:w-auto">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyCustomRange}
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={handleResetCustomRange}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
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
            <p className="mt-2 text-sm text-gray-400">Try another status filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const normalizedStatus = normalizeStatusForTab(booking.status);
              const statusMessage = getStatusMessage(booking);

              return (
                <div
                  key={booking._id}
                  ref={(el) => {
                    bookingRefs.current[booking._id] = el;
                  }}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6 ${
                    highlightedId === booking._id
                      ? "ring-4 ring-emerald-500 ring-opacity-50 shadow-xl"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h3 className="break-words text-lg font-semibold text-gray-900">
                          {booking.serviceId?.title || "Service"}
                        </h3>

                        {getStatusBadge(
                          isEscrowProtected(booking.paymentStatus) &&
                            booking.status === "pending_payment"
                            ? "confirmed"
                            : booking.status
                        )}

                        {booking.type === "emergency" && (
                          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                            <HiBolt className="h-3.5 w-3.5" /> Emergency
                          </span>
                        )}
                      </div>

                      {booking.status === "pending_payment" && !isEscrowProtected(booking.paymentStatus) && (
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

                      {statusMessage && (
                        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm text-slate-700">{statusMessage}</p>
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
                                  {Array.isArray(
                                    booking.providerId.providerDetails.badges
                                  )
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
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${getPaymentBadge(booking.paymentStatus).className}`}
                            >
                              {getPaymentBadge(booking.paymentStatus).label}
                            </span>
                          </div>
                        )}

                        {isEscrowProtected(booking.paymentStatus) &&
                          (normalizedStatus === "confirmed" ||
                            booking.status === "provider_en_route" ||
                            normalizedStatus === "in_progress" ||
                            normalizedStatus === "completion_pending") && (
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
                                  {Number(booking.totalAmount || 0).toLocaleString()} is
                                  held securely.
                                  {normalizedStatus === "completion_pending"
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
                            Created{" "}
                            {new Date(
                              booking.requestedAt || booking.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          NPR {Number(booking.totalAmount || 0).toLocaleString()}
                        </span>
                        {booking.emergencyFee > 0 && (
                          <span className="text-xs text-orange-600">
                            +{booking.emergencyFee} emergency fee
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 xl:min-w-[220px] xl:w-auto xl:items-end">
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
              );
            })}
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

      {rescheduleModalOpen && rescheduleBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Reschedule Booking
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Select a new date and time for{" "}
                <span className="font-medium text-gray-900">
                  {rescheduleBooking.serviceId?.title || "this booking"}
                </span>
                .
              </p>
            </div>

            <div className="space-y-4 px-5 py-4 sm:px-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  New schedule date & time
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleDateTime}
                  onChange={(e) => {
                    setRescheduleDateTime(e.target.value);
                    if (rescheduleError) setRescheduleError("");
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-gray-700 outline-none transition ${
                    rescheduleError
                      ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                      : "border-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  }`}
                />
                {rescheduleError && (
                  <p className="mt-2 text-sm text-red-600">{rescheduleError}</p>
                )}
              </div>

              {(rescheduleBooking.schedule?.date || rescheduleBooking.scheduledAt) && (
                <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Current schedule:{" "}
                  <span className="font-medium text-gray-800">
                    {new Date(
                      rescheduleBooking.scheduledAt ||
                        rescheduleBooking.schedule?.date
                    ).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeRescheduleModal}
                disabled={processing[rescheduleBooking._id]}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReschedule(rescheduleBooking._id)}
                disabled={processing[rescheduleBooking._id]}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing[rescheduleBooking._id] ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}