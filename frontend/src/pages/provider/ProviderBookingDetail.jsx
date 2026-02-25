import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiArrowLeft, HiCalendar, HiClock, HiMapPin, HiPhone, HiEnvelope, HiUser, HiCalendarDays } from "react-icons/hi2";
import ProviderLayout from "../../layouts/ProviderLayout";
import DisputeModal from "../../components/DisputeModal";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { PRICING_TYPES, resolvePricingType } from "../../utils/bookingWorkflow";

export default function ProviderBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quotedPrice: "",
    quoteMessage: "",
  });
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [adjustmentData, setAdjustmentData] = useState({
    proposedPrice: "",
    reason: "",
    attachments: [],
  });

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  async function fetchBooking() {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data.booking);
      await Promise.all([fetchDispute(), fetchChatMeta()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChatMeta() {
    try {
      const res = await api.get(`/chat/booking/${bookingId}?limit=1`);
      setChatUnreadCount(Number(res?.data?.unreadCount || 0));
    } catch (err) {
      setChatUnreadCount(0);
    }
  }

  async function fetchDispute() {
    try {
      const res = await api.get(`/disputes/booking/${bookingId}`);
      setDispute(res.data.dispute || null);
    } catch (err) {
      setDispute(null);
    }
  }

  // PHASE 2C: Submit quote
  async function handleSubmitQuote() {
    // Validation
    if (!quoteData.quotedPrice || quoteData.quotedPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    if (parseFloat(quoteData.quotedPrice) > 1000000) {
      toast.error("Price seems too high. Please verify.");
      return;
    }

    if (quoteData.quoteMessage && quoteData.quoteMessage.length > 500) {
      toast.error("Message is too long (max 500 characters)");
      return;
    }

    try {
      setSubmittingQuote(true);
      await api.post(`/bookings/${bookingId}/send-quote`, {
        quotedPrice: parseFloat(quoteData.quotedPrice),
        quoteMessage: quoteData.quoteMessage,
      });
      
      toast.success("Quote submitted for admin review!");
      setShowQuoteForm(false);
      setQuoteData({ quotedPrice: "", quoteMessage: "" });
      fetchBooking();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to submit quote";
      const reason = err?.response?.data?.reason;
      toast.error(reason ? `${errorMsg}. ${reason}` : errorMsg);
    } finally {
      setSubmittingQuote(false);
    }
  }

  async function handleSubmitAdjustedQuote() {
    if (!adjustmentData.proposedPrice || Number(adjustmentData.proposedPrice) <= 0) {
      toast.error("Please enter a valid adjusted price");
      return;
    }

    if (!String(adjustmentData.reason || "").trim()) {
      toast.error("Reason is required");
      return;
    }

    try {
      setSubmittingAdjustment(true);
      const formData = new FormData();
      formData.append("proposedPrice", String(adjustmentData.proposedPrice));
      formData.append("reason", adjustmentData.reason);
      adjustmentData.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await api.post(`/bookings/${bookingId}/propose-adjusted-quote`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.data?.warning) {
        toast(res.data.warning, { icon: "⚠️" });
      } else {
        toast.success("Additional charge request sent to client");
      }

      setShowAdjustmentForm(false);
      setAdjustmentData({ proposedPrice: "", reason: "", attachments: [] });
      fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to request additional charges");
    } finally {
      setSubmittingAdjustment(false);
    }
  }

  async function handleStartJob() {
    try {
      setProcessingAction(true);
      await api.patch(`/bookings/${bookingId}/start`);
      toast.success("Job started");
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start job");
    } finally {
      setProcessingAction(false);
    }
  }

  async function handleMarkComplete() {
    try {
      setProcessingAction(true);
      const res = await api.post(`/payment/escrow/provider-mark-complete`, { bookingId });
      toast.success(res?.data?.message || "Marked complete");
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark complete");
    } finally {
      setProcessingAction(false);
    }
  }

  async function handleAcceptRequest() {
    try {
      setProcessingAction(true);
      await api.post(`/bookings/accept/${bookingId}`);
      toast.success("Booking accepted");
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept booking");
    } finally {
      setProcessingAction(false);
    }
  }

  async function handleRejectRequest() {
    try {
      setProcessingAction(true);
      await api.post(`/bookings/reject/${bookingId}`);
      toast.success("Booking rejected");
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject booking");
    } finally {
      setProcessingAction(false);
    }
  }

  // Download calendar event
  async function handleDownloadCalendar() {
    try {
      const response = await api.get(`/bookings/${bookingId}/calendar`, {
        responseType: "blob",
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Generate filename
      const serviceName = (booking.serviceId?.title || "service")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const date = new Date(booking.scheduledAt || booking.createdAt).toISOString().split("T")[0];
      link.download = `sewahive-${serviceName}-${date}.ics`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("📅 Calendar event downloaded!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download calendar");
    }
  }

  const canRaiseDispute = useMemo(() => {
    if (!booking) return false;
    const eligibleStatuses = new Set([
      "in-progress",
      "pending-completion",
      "provider_completed",
      "awaiting_client_confirmation",
    ]);
    return eligibleStatuses.has(booking.status);
  }, [booking]);

  const showDisputeBanner =
    booking?.status === "disputed" ||
    (!!dispute && ["opened", "under_review"].includes(dispute.status));
  const disputeStatusLabel =
    dispute?.status?.replace(/_/g, " ") || (booking?.status === "disputed" ? "disputed" : "");
  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const isRange = pricingType === PRICING_TYPES.RANGE;
  const isQuote = pricingType === PRICING_TYPES.QUOTE;
  const canOpenChat = new Set([
    "requested",
    "accepted",
    "pending_payment",
    "confirmed",
    "in-progress",
    "pending-completion",
    "provider_completed",
    "awaiting_client_confirmation",
    "completed",
    "disputed",
    "quote_requested",
    "quote_sent",
    "quote_pending_admin_review",
    "quote_accepted",
  ]).has(booking?.status);

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
        </div>
      </ProviderLayout>
    );
  }

  if (!booking) {
    return (
      <ProviderLayout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-600">Booking not found</p>
          <button
            onClick={() => navigate("/provider/bookings")}
            className="mt-4 text-emerald-600 hover:text-emerald-700"
          >
            Back to bookings
          </button>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/provider/bookings")}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <HiArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-sm text-gray-600">Booking #{booking._id?.slice(-6)}</p>
          </div>
        </div>

        {showDisputeBanner && (
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-900">Booking Under Dispute</p>
            <p className="text-xs text-yellow-800 mt-1">
              This dispute is being reviewed. We will notify both parties of updates.
            </p>
            <p className="text-xs text-yellow-700 mt-2">Status: {disputeStatusLabel}</p>
          </div>
        )}

        {/* Client Info Card */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
          <div className="flex items-start gap-4">
            {booking.clientId?.profile?.avatarUrl ? (
              <img
                src={booking.clientId.profile.avatarUrl}
                alt={booking.clientId?.profile?.name || "Client"}
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {(booking.clientId?.profile?.name || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {booking.clientId?.profile?.name || booking.clientId?.email || "Client"}
              </h4>
              {booking.clientId?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <HiPhone className="text-gray-400" />
                  <a href={`tel:${booking.clientId.phone}`} className="hover:text-emerald-600">
                    {booking.clientId.phone}
                  </a>
                </div>
              )}
              {booking.clientId?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiEnvelope className="text-gray-400" />
                  <a href={`mailto:${booking.clientId.email}`} className="hover:text-emerald-600">
                    {booking.clientId.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {booking.serviceId?.title || "Service"}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiCalendar className="text-gray-400" />
                <span>
                  {booking.scheduledAt
                    ? new Date(booking.scheduledAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : booking.schedule?.date
                    ? new Date(booking.schedule.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : booking.requestedAt
                    ? new Date(booking.requestedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : "Date not scheduled"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiClock className="text-gray-400" />
                <span>
                  {booking.scheduledAt
                    ? new Date(booking.scheduledAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : booking.schedule?.slot
                    ? booking.schedule.slot
                    : booking.scheduledTime
                    ? booking.scheduledTime
                    : "Flexible (Time not set)"}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <HiMapPin className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  {booking.landmark && (
                    <span className="font-medium text-gray-800">{booking.landmark}</span>
                  )}
                  <span className="text-gray-600">
                    {booking.addressText || 
                     [booking.address?.area, booking.address?.city, booking.address?.country]
                       .filter(Boolean)
                       .join(", ") || 
                     "Location not specified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">NPR {booking.totalAmount?.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Status: {booking.status?.replace(/_/g, " ")}</p>
              {booking.pricing?.adjustment?.status === "pending_client_approval" && (
                <p className="text-xs text-amber-700 mt-1">Waiting for client approval on additional charges</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{isRange ? "Minimum Service Fee" : "Base Price"}</p>
              <p className="text-sm font-semibold text-gray-900">
                NPR {Number(booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || booking.price || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{isRange ? "Estimated Extra Charges" : "Estimated Extra Time Cost"}</p>
              <p className="text-sm font-semibold text-indigo-700">
                NPR {Number(booking.pricing?.extraTimeCost || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Current Approved Total</p>
              <p className="text-sm font-semibold text-gray-900">
                NPR {Number(booking.pricing?.finalApprovedPrice || booking.totalAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {isQuote && booking.status === "quote_requested" && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 text-sm mb-2">📝 Client Requested a Quote</h3>
              {booking.quote?.quoteMessage && (
                <p className="text-purple-700 text-sm italic mb-3">"{booking.quote.quoteMessage}"</p>
              )}
              <button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                {showQuoteForm ? "Hide Quote Form" : "Submit Quote"}
              </button>
            </div>
          )}

          {isQuote && booking.quote && ["sent", "pending_admin_review", "approved", "rejected"].includes(booking.quote.status) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">Quote Status</h3>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800">
                  Status: <span className="font-medium">{booking.quote.status?.replace(/_/g, " ")}</span>
                </p>
                {booking.quote.quotedPrice && (
                  <p className="text-blue-800">
                    Your Quote: <span className="font-bold">NPR {booking.quote.quotedPrice.toLocaleString()}</span>
                  </p>
                )}
                {booking.quote.approvedPrice && (
                  <p className="text-green-800">
                    Approved Price: <span className="font-bold">NPR {booking.quote.approvedPrice.toLocaleString()}</span>
                  </p>
                )}
                {booking.quote.rejectionReason && (
                  <p className="text-red-700 mt-2">
                    Rejection Reason: {booking.quote.rejectionReason}
                  </p>
                )}
                {booking.quote.adminComment && (
                  <p className="text-gray-700 mt-2">
                    Admin Note: {booking.quote.adminComment}
                  </p>
                )}
              </div>
            </div>
          )}

          {isRange && booking.pricing?.adjustment?.status === "pending_client_approval" && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 text-sm mb-2">Additional Charge Request Pending</h3>
              <p className="text-sm text-amber-800">
                Proposed: NPR {Number(booking.pricing.adjustment.proposedPrice || 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700 mt-1">Reason: {booking.pricing.adjustment.adjustedQuoteReason || booking.pricing.adjustment.reason}</p>
            </div>
          )}

          {isQuote && showQuoteForm && booking.status === "quote_requested" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-3">Submit Your Quote</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quoted Price (NPR) *
                  </label>
                  <input
                    type="number"
                    value={quoteData.quotedPrice}
                    onChange={(e) => setQuoteData({ ...quoteData, quotedPrice: e.target.value })}
                    placeholder="Enter your quoted price"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quote Message (optional)
                  </label>
                  <textarea
                    value={quoteData.quoteMessage}
                    onChange={(e) => setQuoteData({ ...quoteData, quoteMessage: e.target.value })}
                    placeholder="Explain your pricing or any additional details..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {quoteData.quoteMessage.length}/500 characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitQuote}
                    disabled={submittingQuote}
                    className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium ${
                      submittingQuote ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {submittingQuote ? 'Submitting...' : 'Submit Quote for Review'}
                  </button>
                  <button
                    onClick={() => setShowQuoteForm(false)}
                    disabled={submittingQuote}
                    className={`px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium ${
                      submittingQuote ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!isQuote && booking.status === "requested" && (
              <>
                <button
                  onClick={handleAcceptRequest}
                  disabled={processingAction}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={processingAction}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}

            {isRange && booking.status === "in-progress" && (
              <button
                onClick={() => setShowAdjustmentForm((prev) => !prev)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                {showAdjustmentForm ? "Hide Additional Charges" : "Request Additional Charges"}
              </button>
            )}

            {["confirmed", "accepted"].includes(booking.status) && (
              <button
                onClick={handleStartJob}
                disabled={processingAction || (isQuote && booking.paymentStatus !== "funds_held")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50"
              >
                Start Job
              </button>
            )}

            {booking.status === "in-progress" && (
              <button
                onClick={handleMarkComplete}
                disabled={processingAction || (isRange && booking.pricing?.adjustment?.status === "pending_client_approval")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50"
              >
                Mark Completed
              </button>
            )}

            {canRaiseDispute && !showDisputeBanner && (
              <button
                onClick={() => setDisputeModalOpen(true)}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium text-sm"
              >
                Raise Dispute
              </button>
            )}

            {canOpenChat && (
              <button
                onClick={() => navigate(`/provider/bookings/${booking._id}/chat`)}
                className="relative px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                Chat
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                )}
              </button>
            )}

            {["confirmed", "accepted", "in-progress", "provider_completed", "awaiting_client_confirmation", "completed"].includes(booking.status) && (
              <button
                onClick={handleDownloadCalendar}
                className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium text-sm flex items-center gap-2"
              >
                <HiCalendarDays className="w-4 h-4" />
                Add to Calendar
              </button>
            )}

            {dispute && dispute.status === "resolved" && dispute.resolutionDetails?.reason && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                ✔ {dispute.resolutionDetails.reason}
              </div>
            )}
          </div>

          {isRange && showAdjustmentForm && booking.status === "in-progress" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-1">Request Additional Charges</h3>
              <p className="text-xs text-gray-600 mb-3">
                Final price increases require explicit client approval.
              </p>
              <div className="space-y-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustmentData.proposedPrice}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({ ...prev, proposedPrice: e.target.value }))
                  }
                  placeholder="Requested new total price (NPR)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <textarea
                  value={adjustmentData.reason}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Reason for additional charges"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      attachments: Array.from(e.target.files || []),
                    }))
                  }
                  className="w-full text-sm"
                />
                <button
                  onClick={handleSubmitAdjustedQuote}
                  disabled={submittingAdjustment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                >
                  {submittingAdjustment ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </div>
          )}
        </div>

        {disputeModalOpen && (
          <DisputeModal
            booking={booking}
            onClose={() => setDisputeModalOpen(false)}
            onDisputeSubmitted={() => {
              setDisputeModalOpen(false);
              fetchBooking();
            }}
          />
        )}
      </div>
    </ProviderLayout>
  );
}
