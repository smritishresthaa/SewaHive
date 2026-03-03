import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiCheck, HiXMark, HiClock, HiMapPin, HiCalendarDays, HiStar, HiExclamationTriangle, HiPlay } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import JobTimer from "../../components/UI/JobTimer";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";
import { statusMatchesTab, normalizeStatusForTab } from "../../utils/bookingWorkflow";

export default function ProviderBookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const highlightBookingId = location.state?.highlightBookingId;
  const bookingRefs = useRef({});
  
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState({}); // Store reviews by bookingId
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("requested");
  const [processing, setProcessing] = useState({});
  const [highlightedId, setHighlightedId] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState({});
  const [submittingAdjustment, setSubmittingAdjustment] = useState({});
  const [adjustmentData, setAdjustmentData] = useState({});

  const completionPendingStatuses = ["pending-completion", "provider_completed", "awaiting_client_confirmation"];

  const mapFilterToApiStatus = (filterValue) => {
    // Backend now uses getStatusesForTab() to handle canonical tab names
    // Just pass through the filter value directly
    return filterValue;
  };

  function formatLocationLabel(booking) {
    // Try addressText first (new booking location picker format)
    if (booking.addressText) {
      const parts = booking.addressText.split(",").map((p) => p.trim()).filter(Boolean);
      const short = parts.slice(0, 3).join(", ");
      return short || booking.addressText;
    }
    
    // Try landmark (cute/easy to remember)
    if (booking.landmark) return booking.landmark;
    
    // Try structured address (country/city/area)
    const structured = [booking.address?.area, booking.address?.city, booking.address?.country]
      .filter(Boolean)
      .join(", ");
    if (structured) return structured;
    
    // Try coordinates (direct or nested)
    const coords = booking.coordinates || booking.location?.coordinates;
    if (coords?.length === 2) {
      // Format as: "27.64°N, 85.37°E" with landmark hint
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
      const apiStatus = mapFilterToApiStatus(filter);
      const params = apiStatus ? `?status=${apiStatus}` : "";
      const res = await api.get(`/bookings/provider-bookings${params}`);
      const fetchedBookings = res.data.bookings || [];
      setBookings(fetchedBookings);
      
      // Fetch reviews for completed bookings
      if (filter === "completed" || filter === "all") {
        const completedBookings = fetchedBookings.filter(b => b.status === "completed");
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
                // No review for this booking yet
              }
            })
          );
          setReviews(reviewsData);
        }
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

  const canAcceptBookings = isKycApproved(normalizeKycStatus(kycStatus?.status));

  async function handleAccept(bookingId, type) {
    setProcessing({ ...processing, [bookingId]: true });
    try {
      if (type === "emergency") {
        await api.post(`/bookings/provider-accept/${bookingId}`);
        toast.success("Emergency booking accepted!");
      } else {
        // For normal bookings, we need a separate accept endpoint
        await api.post(`/bookings/accept/${bookingId}`);
        toast.success("Booking accepted");
      }
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept booking");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  async function handleReject(bookingId, type) {
    setProcessing({ ...processing, [bookingId]: true });
    try {
      if (type === "emergency") {
        await api.post(`/bookings/provider-reject/${bookingId}`);
        toast.success("Emergency request declined");
      } else {
        await api.post(`/bookings/reject/${bookingId}`);
        toast.success("Booking rejected");
      }
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject booking");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  async function handleStart(bookingId) {
    setProcessing({ ...processing, [bookingId]: true });
    try {
      await api.patch(`/bookings/${bookingId}/start`);
      toast.success("Job started!");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start job");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  async function handleComplete(booking) {
    if (booking?.pricing?.adjustment?.status === "pending_client_approval") {
      toast.error("Cannot complete: waiting for client approval for additional charges.");
      return;
    }

    const bookingId = booking?._id;
    if (!bookingId) return;

    setProcessing({ ...processing, [bookingId]: true });
    try {
      // Use the escrow endpoint for proper payment escrow handling
      const res = await api.post(`/payment/escrow/provider-mark-complete`, {
        bookingId
      });
      toast.success(res.data.message || "Job marked as complete! Awaiting client confirmation...");
      fetchBookings();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark job as complete");
    } finally {
      setProcessing({ ...processing, [bookingId]: false });
    }
  }

  function toggleAdjustmentForm(booking) {
    const bookingId = booking?._id;
    if (!bookingId) return;

    const currentlyOpen = !!showAdjustmentForm[bookingId];
    const estimatedExtra = Number(booking?.pricing?.extraTimeCost || 0);
    const currentApprovedTotal = Number(booking?.pricing?.finalApprovedPrice || booking?.totalAmount || 0);
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
      setProcessing({ ...processing, [bookingId]: true });
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
      setProcessing({ ...processing, [bookingId]: false });
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${styles[normalized] || styles[status] || "bg-gray-100"}`}>
        {normalized === 'pending_payment'
          ? 'Awaiting Payment'
          : normalized === 'completion_pending'
          ? 'Completion Pending'
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
            className={`w-4 h-4 ${
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
            <p className="text-gray-600 mt-1">Manage client booking requests</p>
          </div>
        </div>

        {!canAcceptBookings && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <HiExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            KYC approval required to accept or reject bookings. Complete KYC to unlock these actions.
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: "requested", label: "Requested" },
            { value: "pending_payment", label: "Awaiting Payment" },
            { value: "confirmed", label: "Confirmed" },
            { value: "in_progress", label: "In Progress" },
            { value: "completion_pending", label: "Completion Pending" },
            { value: "completed", label: "Completed" },
            { value: "disputed", label: "Disputed" },
            { value: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <p className="text-gray-500 text-lg">No bookings found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filter === "requested" ? "New requests will appear here" : "Try changing the filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div 
                key={booking._id} 
                ref={(el) => (bookingRefs.current[booking._id] = el)}
                className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all ${
                  highlightedId === booking._id 
                    ? "ring-4 ring-emerald-500 ring-opacity-50 shadow-xl" 
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.serviceId?.title || "Service"}
                      </h3>
                      {getStatusBadge(booking.status)}
                      {booking.type === "emergency" && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1">
                          ⚡ Emergency
                        </span>
                      )}
                    </div>

                    {/* Show client's booking notes/requirements */}
                    {booking.notes && (
                      <div className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-900 font-semibold mb-1">📋 Client Requirements:</p>
                        <p className="text-sm text-emerald-800">{booking.notes}</p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <HiMapPin className="text-emerald-600 text-lg" />
                        <span>
                          {formatLocationLabel(booking)}
                        </span>
                      </div>

                      {!!String(booking.landmark || "").trim() && (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 text-base">🏢</span>
                          <span>
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
                        <span>{booking.clientId?.profile?.name || booking.clientId?.email}</span>
                      </div>
                    </div>

                    {/* Location Map Button */}
                    {booking.location?.coordinates?.length === 2 && (
                      <div className="mb-4">
                        <a
                          href={`https://www.google.com/maps?q=${booking.location.coordinates[1]},${booking.location.coordinates[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <HiMapPin className="text-lg" />
                          View Exact Location on Map
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Coordinates: {booking.location.coordinates[1].toFixed(6)}, {booking.location.coordinates[0].toFixed(6)}
                        </p>
                      </div>
                    )}

                    {/* Timer for in-progress bookings */}
                    {booking.status === "in-progress" && (
                      <JobTimer booking={booking} onTimerChange={handleTimerAction} />
                    )}

                    {booking.status === "in-progress" && booking.pricing?.adjustment?.status === "pending_client_approval" && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-900">Additional Charge Request Pending</p>
                        <p className="text-xs text-amber-800 mt-1">
                          Waiting for client approval before job completion.
                        </p>
                        <p className="text-xs text-amber-700 mt-2">
                          Proposed total: NPR {Number(booking?.pricing?.adjustment?.proposedPrice || 0).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes: </span>
                          {booking.notes}
                        </p>
                      </div>
                    )}

                    {/* Display Review if this is a completed booking */}
                    {booking.status === "completed" && reviews[booking._id] && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1"><HiStar className="w-4 h-4 text-yellow-500" /> Client Review</p>
                            <p className="text-xs text-gray-600 mt-1">
                              From: {reviews[booking._id].clientId?.profile?.name || "Client"}
                            </p>
                          </div>
                          <div className="text-right">
                            {renderStars(reviews[booking._id].rating)}
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {reviews[booking._id].rating}/5 - {getRatingLabel(reviews[booking._id].rating)}
                            </p>
                          </div>
                        </div>
                        {reviews[booking._id].comment && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            "{reviews[booking._id].comment}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
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

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <button
                      onClick={() => navigate(`/provider/bookings/${booking._id}`)}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition"
                    >
                      View Details
                    </button>

                    {statusMatchesTab(booking.status, "requested") && (
                      <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleAccept(booking._id, booking.type)}
                        disabled={processing[booking._id] || !canAcceptBookings}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <HiCheck className="text-lg" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(booking._id, booking.type)}
                        disabled={processing[booking._id] || !canAcceptBookings}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <HiXMark className="text-lg" />
                        Reject
                      </button>
                      {!canAcceptBookings && (
                        <p className="text-xs text-amber-700 text-center">
                          KYC approval required to respond.
                        </p>
                      )}
                      </div>
                    )}

                    {booking.status === "accepted" && (
                      <div className="flex flex-col gap-2">
                        <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                          <p className="text-sm font-semibold text-yellow-800 flex items-center justify-center gap-1"><HiClock className="w-4 h-4" /> Awaiting Client Payment</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Job can start after payment is secured and booking is confirmed
                          </p>
                        </div>
                      </div>
                    )}

                    {(booking.status === "confirmed" || booking.status === "provider_en_route") && (
                      <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleStart(booking._id)}
                        disabled={processing[booking._id]}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        <HiPlay className="w-4 h-4" /> Start Job
                      </button>
                      </div>
                    )}

                    {booking.status === "in-progress" && (
                      <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleAdjustmentForm(booking)}
                        disabled={processing[booking._id] || booking.pricing?.adjustment?.status === "pending_client_approval"}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        {showAdjustmentForm[booking._id] ? "Hide Additional Charges" : "Request Additional Charges"}
                      </button>

                      <button
                        onClick={() => handleComplete(booking)}
                        disabled={processing[booking._id]}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Mark Job Completed
                      </button>
                      {booking.pricing?.adjustment?.status === "pending_client_approval" ? (
                        <p className="text-xs text-amber-700 text-center">
                          Cannot complete: waiting for client approval for additional charges.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 text-center">
                          Client will confirm to release payment
                        </p>
                      )}
                      </div>
                    )}

                    {(completionPendingStatuses.includes(booking.status) || normalizeStatusForTab(booking.status) === "completion_pending") && (
                      <div className="flex flex-col gap-2">
                      <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                        <p className="text-sm font-semibold text-yellow-800 flex items-center justify-center gap-1"><HiClock className="w-4 h-4" /> Awaiting Client</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Waiting for client to confirm and release payment
                        </p>
                      </div>
                      </div>
                    )}
                  </div>
                </div>

                {booking.status === "in-progress" && showAdjustmentForm[booking._id] && (
                  <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-900">Request Additional Charges</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Final price increases require explicit client approval.
                    </p>

                    <div className="mt-3 space-y-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={adjustmentData?.[booking._id]?.proposedPrice || ""}
                        onChange={(e) => updateAdjustmentData(booking._id, { proposedPrice: e.target.value })}
                        placeholder="Requested new total price (NPR)"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />

                      <textarea
                        value={adjustmentData?.[booking._id]?.reason || ""}
                        onChange={(e) => updateAdjustmentData(booking._id, { reason: e.target.value })}
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {submittingAdjustment[booking._id] ? "Submitting..." : "Send Adjusted Quote"}
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
