import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProviderLayout from "../../layouts/ProviderLayout";
import {
  HiCheck,
  HiXMark,
  HiClock,
  HiMapPin,
  HiCalendarDays,
  HiStar,
  HiExclamationTriangle,
  HiPlay,
} from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import JobTimer from "../../components/UI/JobTimer";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";
import {
  statusMatchesTab,
  normalizeStatusForTab,
} from "../../utils/bookingWorkflow";

export default function ProviderBookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const highlightBookingId = location.state?.highlightBookingId;
  const bookingRefs = useRef({});

  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("requested");
  const [processing, setProcessing] = useState({});
  const [highlightedId, setHighlightedId] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState({});
  const [submittingAdjustment, setSubmittingAdjustment] = useState({});
  const [adjustmentData, setAdjustmentData] = useState({});

  const completionPendingStatuses = [
    "pending-completion",
    "provider_completed",
    "awaiting_client_confirmation",
  ];

  const mapFilterToApiStatus = (filterValue) => {
    return filterValue;
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

    const structured = [
      booking.address?.area,
      booking.address?.city,
      booking.address?.country,
    ]
      .filter(Boolean)
      .join(", ");
    if (structured) return structured;

    const coords = booking.coordinates || booking.location?.coordinates;
    if (coords?.length === 2) {
      const lat = coords[1].toFixed(2);
      const lng = coords[0].toFixed(2);
      return `${lat}°N, ${lng}°E`;
    }

    return "Location not specified";
  }

  useEffect(() => {
    fetchBookings();
    fetchKycStatus();
  }, [filter]);

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
      const apiStatus = mapFilterToApiStatus(filter);
      const params = apiStatus ? `?status=${apiStatus}` : "";
      const res = await api.get(`/bookings/provider-bookings${params}`);
      const fetchedBookings = res.data.bookings || [];
      setBookings(fetchedBookings);

      if (filter === "completed" || filter === "all") {
        const completedBookings = fetchedBookings.filter(
          (b) => b.status === "completed"
        );
        if (completedBookings.length > 0) {
          const reviewsData = {};
          await Promise.all(
            completedBookings.map(async (booking) => {
              try {
                const reviewRes = await api.get(`/reviews/booking/${booking._id}`);
                if (reviewRes.data.review) {
                  reviewsData[booking._id] = reviewRes.data.review;
                }
              } catch (err) {
                // No review
              }
            })
          );
          setReviews(reviewsData);
        } else {
          setReviews({});
        }
      } else {
        setReviews({});
      }
    } catch (err) {
      console.log("Bookings endpoint not available yet:", err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKycStatus() {
    try {
      const res = await api.get("/providers/verification");
      setKycStatus(res.data?.verification || null);
    } catch (err) {
      setKycStatus(null);
    }
  }

  const canAcceptBookings = isKycApproved(
    normalizeKycStatus(kycStatus?.status)
  );

  async function handleAccept(bookingId, type) {
    setProcessing((prev) => ({ ...prev, [bookingId]: true }));
    try {
      if (type === "emergency") {
        await api.post(`/bookings/provider-accept/${bookingId}`);
        toast.success("Emergency booking accepted!");
      } else {
        await api.post(`/bookings/accept/${bookingId}`);
        toast.success("Booking accepted");
      }
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept booking");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleReject(bookingId, type) {
    setProcessing((prev) => ({ ...prev, [bookingId]: true }));
    try {
      if (type === "emergency") {
        await api.post(`/bookings/provider-reject/${bookingId}`);
        toast.success("Emergency request declined");
      } else {
        await api.post(`/bookings/reject/${bookingId}`);
        toast.success("Booking rejected");
      }

      setBookings((prev) => prev.filter((booking) => booking._id !== bookingId));

      setReviews((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });

      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject booking");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleStart(bookingId) {
    setProcessing((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await api.patch(`/bookings/${bookingId}/start`);
      toast.success("Job started!");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start job");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleComplete(booking) {
    if (booking?.pricing?.adjustment?.status === "pending_client_approval") {
      toast.error("Cannot complete: waiting for client approval for additional charges.");
      return;
    }

    const bookingId = booking?._id;
    if (!bookingId) return;

    setProcessing((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const res = await api.post(`/payment/escrow/provider-mark-complete`, {
        bookingId,
      });
      toast.success(
        res.data.message || "Job marked as complete! Awaiting client confirmation..."
      );
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark job as complete");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  function toggleAdjustmentForm(booking) {
    const bookingId = booking?._id;
    if (!bookingId) return;

    const currentlyOpen = !!showAdjustmentForm[bookingId];
    const estimatedExtra = Number(booking?.pricing?.extraTimeCost || 0);
    const currentApprovedTotal = Number(
      booking?.pricing?.finalApprovedPrice || booking?.totalAmount || 0
    );
    const defaultProposed = Number((currentApprovedTotal + estimatedExtra).toFixed(2));

    setShowAdjustmentForm((prev) => ({ ...prev, [bookingId]: !currentlyOpen }));

    if (!currentlyOpen && !adjustmentData[bookingId]) {
      setAdjustmentData((prev) => ({
        ...prev,
        [bookingId]: {
          proposedPrice: defaultProposed > 0 ? String(defaultProposed) : "",
          reason: "",
          attachments: [],
        },
      }));
    }
  }

  function updateAdjustmentData(bookingId, patch) {
    setAdjustmentData((prev) => ({
      ...prev,
      [bookingId]: {
        proposedPrice: prev?.[bookingId]?.proposedPrice || "",
        reason: prev?.[bookingId]?.reason || "",
        attachments: prev?.[bookingId]?.attachments || [],
        ...patch,
      },
    }));
  }

  async function handleSubmitAdjustedQuote(booking) {
    const bookingId = booking?._id;
    if (!bookingId) return;

    const payload = adjustmentData?.[bookingId] || {};
    const proposedPrice = Number(payload.proposedPrice || 0);
    const reason = String(payload.reason || "").trim();

    if (!proposedPrice || proposedPrice <= 0) {
      toast.error("Please enter a valid adjusted total price");
      return;
    }

    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    setSubmittingAdjustment((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const formData = new FormData();
      formData.append("proposedPrice", String(proposedPrice));
      formData.append("reason", reason);
      (payload.attachments || []).forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await api.post(`/bookings/${bookingId}/propose-adjusted-quote`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.data?.warning) {
        toast(res.data.warning);
      } else {
        toast.success("Additional charge request sent to client");
      }

      setShowAdjustmentForm((prev) => ({ ...prev, [bookingId]: false }));
      setAdjustmentData((prev) => ({
        ...prev,
        [bookingId]: { proposedPrice: "", reason: "", attachments: [] },
      }));
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to request additional charges");
    } finally {
      setSubmittingAdjustment((prev) => ({ ...prev, [bookingId]: false }));
    }
  }

  async function handleTimerAction(action, bookingId, totalMinutes = 0) {
    try {
      setProcessing((prev) => ({ ...prev, [bookingId]: true }));
      if (action === "start") {
        await api.post(`/bookings/${bookingId}/timer/start`);
      } else if (action === "pause") {
        await api.post(`/bookings/${bookingId}/timer/pause`, { totalMinutes });
      } else if (action === "reset") {
        await api.post(`/bookings/${bookingId}/timer/reset`);
      }
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Timer action failed");
    } finally {
      setProcessing((prev) => ({ ...prev, [bookingId]: false }));
    }
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

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <HiStar
            key={star}
            className={`h-4 w-4 ${
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

  const tabs = [
    { value: "requested", label: "Requested" },
    { value: "pending_payment", label: "Awaiting Payment" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_progress", label: "In Progress" },
    { value: "completion_pending", label: "Completion Pending" },
    { value: "completed", label: "Completed" },
    { value: "disputed", label: "Disputed" },
    { value: "all", label: "All" },
  ];

  return (
    <ProviderLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
            <p className="mt-1 text-gray-600">Manage client booking requests</p>
          </div>
        </div>

        {!canAcceptBookings && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <HiExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              KYC approval required to accept or reject bookings. Complete KYC to
              unlock these actions.
            </span>
          </div>
        )}

        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
                  filter === tab.value
                    ? "bg-emerald-600 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border bg-white py-20 text-center">
            <p className="text-lg text-gray-500">No bookings found</p>
            <p className="mt-2 text-sm text-gray-400">
              {filter === "requested"
                ? "New requests will appear here"
                : "Try changing the filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                ref={(el) => (bookingRefs.current[booking._id] = el)}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6 ${
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
                      {getStatusBadge(booking.status)}
                      {booking.type === "emergency" && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                          ⚡ Emergency
                        </span>
                      )}
                    </div>

                    {booking.notes && (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="mb-1 text-sm font-semibold text-emerald-900">
                          📋 Client Requirements:
                        </p>
                        <p className="text-sm text-emerald-800">{booking.notes}</p>
                      </div>
                    )}

                    <div className="mb-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <HiMapPin className="text-lg text-emerald-600" />
                        <span className="break-words">{formatLocationLabel(booking)}</span>
                      </div>

                      {!!String(booking.landmark || "").trim() && (
                        <div className="flex items-center gap-2">
                          <span className="text-base text-emerald-600">🏢</span>
                          <span className="break-words">
                            Landmark: {String(booking.landmark).trim()}
                          </span>
                        </div>
                      )}

                      {booking.type === "normal" && booking.schedule?.date && (
                        <>
                          <div className="flex items-center gap-2">
                            <HiCalendarDays className="text-emerald-600" />
                            <span>{new Date(booking.schedule.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HiClock className="text-emerald-600" />
                            <span>{booking.schedule.slot}</span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="font-medium">Client:</span>
                        <span className="break-words">
                          {booking.clientId?.profile?.name || booking.clientId?.email}
                        </span>
                      </div>
                    </div>

                    {booking.location?.coordinates?.length === 2 && (
                      <div className="mb-4">
                        <a
                          href={`https://www.google.com/maps?q=${booking.location.coordinates[1]},${booking.location.coordinates[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 sm:w-auto"
                        >
                          <HiMapPin className="text-lg" />
                          View Exact Location on Map
                        </a>
                        <p className="mt-1 break-all text-xs text-gray-500">
                          Coordinates: {booking.location.coordinates[1].toFixed(6)},{" "}
                          {booking.location.coordinates[0].toFixed(6)}
                        </p>
                      </div>
                    )}

                    {booking.status === "in-progress" && (
                      <JobTimer booking={booking} onTimerChange={handleTimerAction} />
                    )}

                    {booking.status === "in-progress" &&
                      booking.pricing?.adjustment?.status === "pending_client_approval" && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm font-semibold text-amber-900">
                            Additional Charge Request Pending
                          </p>
                          <p className="mt-1 text-xs text-amber-800">
                            Waiting for client approval before job completion.
                          </p>
                          <p className="mt-2 text-xs text-amber-700">
                            Proposed total: NPR{" "}
                            {Number(
                              booking?.pricing?.adjustment?.proposedPrice || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}

                    {booking.notes && (
                      <div className="mb-4 rounded-lg bg-gray-50 p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes: </span>
                          {booking.notes}
                        </p>
                      </div>
                    )}

                    {booking.status === "completed" && reviews[booking._id] && (
                      <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                              <HiStar className="h-4 w-4 text-yellow-500" /> Client Review
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              From:{" "}
                              {reviews[booking._id].clientId?.profile?.name || "Client"}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            {renderStars(reviews[booking._id].rating)}
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {reviews[booking._id].rating}/5 -{" "}
                              {getRatingLabel(reviews[booking._id].rating)}
                            </p>
                          </div>
                        </div>
                        {reviews[booking._id].comment && (
                          <p className="mt-2 break-words text-sm italic text-gray-700">
                            "{reviews[booking._id].comment}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-semibold text-gray-900">
                        Total: NPR {booking.totalAmount}
                      </span>
                      {booking.emergencyFee > 0 && (
                        <span className="text-orange-600">
                          (includes NPR {booking.emergencyFee} emergency fee)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 xl:min-w-[220px] xl:w-auto">
                    <button
                      onClick={() => navigate(`/provider/bookings/${booking._id}`)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      View Details
                    </button>

                    {statusMatchesTab(booking.status, "requested") && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAccept(booking._id, booking.type)}
                          disabled={processing[booking._id] || !canAcceptBookings}
                          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <HiCheck className="text-lg" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(booking._id, booking.type)}
                          disabled={processing[booking._id] || !canAcceptBookings}
                          className="flex items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <HiXMark className="text-lg" />
                          Reject
                        </button>
                        {!canAcceptBookings && (
                          <p className="text-center text-xs text-amber-700">
                            KYC approval required to respond.
                          </p>
                        )}
                      </div>
                    )}

                    {booking.status === "accepted" && (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-center">
                          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-yellow-800">
                            <HiClock className="h-4 w-4" /> Awaiting Client Payment
                          </p>
                          <p className="mt-1 text-xs text-yellow-700">
                            Job can start after payment is secured and booking is
                            confirmed
                          </p>
                        </div>
                      </div>
                    )}

                    {(booking.status === "confirmed" ||
                      booking.status === "provider_en_route") && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleStart(booking._id)}
                          disabled={processing[booking._id]}
                          className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <HiPlay className="h-4 w-4" /> Start Job
                        </button>
                      </div>
                    )}

                    {booking.status === "in-progress" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleAdjustmentForm(booking)}
                          disabled={
                            processing[booking._id] ||
                            booking.pricing?.adjustment?.status ===
                              "pending_client_approval"
                          }
                          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {showAdjustmentForm[booking._id]
                            ? "Hide Additional Charges"
                            : "Request Additional Charges"}
                        </button>

                        <button
                          onClick={() => handleComplete(booking)}
                          disabled={processing[booking._id]}
                          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Mark Job Completed
                        </button>

                        {booking.pricing?.adjustment?.status ===
                        "pending_client_approval" ? (
                          <p className="text-center text-xs text-amber-700">
                            Cannot complete: waiting for client approval for
                            additional charges.
                          </p>
                        ) : (
                          <p className="text-center text-xs text-gray-500">
                            Client will confirm to release payment
                          </p>
                        )}
                      </div>
                    )}

                    {(completionPendingStatuses.includes(booking.status) ||
                      normalizeStatusForTab(booking.status) ===
                        "completion_pending") && (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-center">
                          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-yellow-800">
                            <HiClock className="h-4 w-4" /> Awaiting Client
                          </p>
                          <p className="mt-1 text-xs text-yellow-700">
                            Waiting for client to confirm and release payment
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {booking.status === "in-progress" &&
                  showAdjustmentForm[booking._id] && (
                    <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Request Additional Charges
                      </h4>
                      <p className="mt-1 text-xs text-gray-600">
                        Final price increases require explicit client approval.
                      </p>

                      <div className="mt-3 space-y-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={adjustmentData?.[booking._id]?.proposedPrice || ""}
                          onChange={(e) =>
                            updateAdjustmentData(booking._id, {
                              proposedPrice: e.target.value,
                            })
                          }
                          placeholder="Requested new total price (NPR)"
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />

                        <textarea
                          value={adjustmentData?.[booking._id]?.reason || ""}
                          onChange={(e) =>
                            updateAdjustmentData(booking._id, {
                              reason: e.target.value,
                            })
                          }
                          placeholder="Reason for additional charges"
                          rows={3}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />

                        <input
                          type="file"
                          multiple
                          onChange={(e) =>
                            updateAdjustmentData(booking._id, {
                              attachments: Array.from(e.target.files || []),
                            })
                          }
                          className="w-full text-sm"
                        />

                        <button
                          onClick={() => handleSubmitAdjustedQuote(booking)}
                          disabled={!!submittingAdjustment[booking._id]}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {submittingAdjustment[booking._id]
                            ? "Submitting..."
                            : "Send Adjusted Quote"}
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}