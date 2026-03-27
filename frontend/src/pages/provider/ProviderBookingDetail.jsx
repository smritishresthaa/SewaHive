import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiArrowLeft,
  HiCalendar,
  HiClock,
  HiMapPin,
  HiPhone,
  HiEnvelope,
  HiCalendarDays,
} from "react-icons/hi2";
import ProviderLayout from "../../layouts/ProviderLayout";
import DisputeModal from "../../components/DisputeModal";
import ProviderNavigationPanel from "../../components/tracking/ProviderNavigationPanel";
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

  async function handleSubmitQuote() {
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

      toast.success("Quote submitted for admin review");
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
        toast(res.data.warning);
      } else {
        toast.success("Additional charge request sent to client");
      }

      setShowAdjustmentForm(false);
      setAdjustmentData({ proposedPrice: "", reason: "", attachments: [] });
      fetchBooking();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to request additional charges"
      );
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

  async function handleMarkEnRoute() {
    try {
      setProcessingAction(true);
      await api.patch(`/bookings/${bookingId}/en-route`);
      toast.success("You are on the way. Client has been notified.");
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark as on the way");
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

      if (booking?.type === "emergency") {
        await api.post(`/bookings/provider-accept/${bookingId}`);
        toast.success("Emergency booking accepted");
      } else {
        await api.post(`/bookings/accept/${bookingId}`);
        toast.success("Booking accepted");
      }

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

      if (booking?.type === "emergency") {
        await api.post(`/bookings/provider-reject/${bookingId}`);
        toast.success("Emergency request declined");
      } else {
        await api.post(`/bookings/reject/${bookingId}`);
        toast.success("Booking rejected");
      }

      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject booking");
    } finally {
      setProcessingAction(false);
    }
  }

  async function handleDownloadCalendar() {
    try {
      const response = await api.get(`/bookings/${bookingId}/calendar`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const serviceName = (booking.serviceId?.title || "service")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const date = new Date(
        booking.scheduledAt || booking.createdAt
      ).toISOString().split("T")[0];
      link.download = `sewahive-${serviceName}-${date}.ics`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Calendar event downloaded");
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
    dispute?.status?.replace(/_/g, " ") ||
    (booking?.status === "disputed" ? "disputed" : "");
  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const isRange = pricingType === PRICING_TYPES.RANGE;
  const isQuote = pricingType === PRICING_TYPES.QUOTE;
  const canOpenChat = new Set([
    "requested",
    "accepted",
    "pending_payment",
    "confirmed",
    "provider_en_route",
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-700 border-t-transparent" />
        </div>
      </ProviderLayout>
    );
  }

  if (!booking) {
    return (
      <ProviderLayout>
        <div className="mx-auto max-w-4xl py-16 text-center">
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start gap-3">
          <button
            onClick={() => navigate("/provider/bookings")}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <HiArrowLeft className="text-gray-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="break-all text-sm text-gray-600">
              Booking #{booking._id?.slice(-6)}
            </p>
          </div>
        </div>

        {showDisputeBanner && (
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-900">
              Booking Under Dispute
            </p>
            <p className="mt-1 text-xs text-yellow-800">
              This dispute is being reviewed. We will notify both parties of updates.
            </p>
            <p className="mt-2 text-xs text-yellow-700">Status: {disputeStatusLabel}</p>
          </div>
        )}

        <ProviderNavigationPanel booking={booking} onStatusChange={fetchBooking} />

        <div className="mb-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Client Details</h3>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {booking.clientId?.profile?.avatarUrl ? (
              <img
                src={booking.clientId.profile.avatarUrl}
                alt={booking.clientId?.profile?.name || "Client"}
                className="h-16 w-16 rounded-full border-2 border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xl font-bold text-white">
                {(booking.clientId?.profile?.name || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="mb-2 break-words text-lg font-semibold text-gray-900">
                {booking.clientId?.profile?.name || booking.clientId?.email || "Client"}
              </h4>
              {booking.clientId?.phone && (
                <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
                  <HiPhone className="text-gray-400" />
                  <a
                    href={`tel:${booking.clientId.phone}`}
                    className="break-all hover:text-emerald-600"
                  >
                    {booking.clientId.phone}
                  </a>
                </div>
              )}
              {booking.clientId?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiEnvelope className="text-gray-400" />
                  <a
                    href={`mailto:${booking.clientId.email}`}
                    className="break-all hover:text-emerald-600"
                  >
                    {booking.clientId.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <h2 className="break-words text-xl font-semibold text-gray-900">
                {booking.serviceId?.title || "Service"}
              </h2>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiCalendar className="text-gray-400" />
                <span>
                  {booking.scheduledAt
                    ? new Date(booking.scheduledAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : booking.schedule?.date
                    ? new Date(booking.schedule.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : booking.requestedAt
                    ? new Date(booking.requestedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Date not scheduled"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiClock className="text-gray-400" />
                <span>
                  {booking.scheduledAt
                    ? new Date(booking.scheduledAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : booking.schedule?.slot
                    ? booking.schedule.slot
                    : booking.scheduledTime
                    ? booking.scheduledTime
                    : "Flexible (Time not set)"}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-600">
                <HiMapPin className="mt-0.5 flex-shrink-0 text-gray-400" />
                <div className="flex flex-col">
                  {booking.landmark && (
                    <span className="font-medium text-gray-800">{booking.landmark}</span>
                  )}
                  <span className="break-words text-gray-600">
                    {booking.addressText ||
                      [booking.address?.area, booking.address?.city, booking.address?.country]
                        .filter(Boolean)
                        .join(", ") ||
                      "Location not specified"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left lg:text-right">
              <p className="break-words text-2xl font-bold text-gray-900">
                NPR {booking.totalAmount?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Status: {booking.status?.replace(/_/g, " ")}
              </p>
              {booking.pricing?.adjustment?.status === "pending_client_approval" && (
                <p className="mt-1 text-xs text-amber-700">
                  Waiting for client approval on additional charges
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                {isRange ? "Minimum Service Fee" : "Base Price"}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                NPR{" "}
                {Number(
                  booking.pricing?.basePrice ||
                    booking.pricing?.basePriceAtBooking ||
                    booking.price ||
                    0
                ).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                {isRange ? "Estimated Extra Charges" : "Estimated Extra Time Cost"}
              </p>
              <p className="text-sm font-semibold text-indigo-700">
                NPR {Number(booking.pricing?.extraTimeCost || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Current Approved Total</p>
              <p className="text-sm font-semibold text-gray-900">
                NPR{" "}
                {Number(
                  booking.pricing?.finalApprovedPrice || booking.totalAmount || 0
                ).toLocaleString()}
              </p>
            </div>
          </div>

          {isQuote && booking.status === "quote_requested" && (
            <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-purple-900">
                Client Requested a Quote
              </h3>
              {booking.quote?.quoteMessage && (
                <p className="mb-3 text-sm italic text-purple-700">
                  "{booking.quote.quoteMessage}"
                </p>
              )}
              <button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                {showQuoteForm ? "Hide Quote Form" : "Submit Quote"}
              </button>
            </div>
          )}

          {isQuote &&
            booking.quote &&
            ["sent", "pending_admin_review", "approved", "rejected"].includes(
              booking.quote.status
            ) && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-blue-900">
                  Quote Status
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-blue-800">
                    Status:{" "}
                    <span className="font-medium">
                      {booking.quote.status?.replace(/_/g, " ")}
                    </span>
                  </p>
                  {booking.quote.quotedPrice && (
                    <p className="text-blue-800">
                      Your Quote:{" "}
                      <span className="font-bold">
                        NPR {booking.quote.quotedPrice.toLocaleString()}
                      </span>
                    </p>
                  )}
                  {booking.quote.approvedPrice && (
                    <p className="text-green-800">
                      Approved Price:{" "}
                      <span className="font-bold">
                        NPR {booking.quote.approvedPrice.toLocaleString()}
                      </span>
                    </p>
                  )}
                  {booking.quote.rejectionReason && (
                    <p className="mt-2 text-red-700">
                      Rejection Reason: {booking.quote.rejectionReason}
                    </p>
                  )}
                  {booking.quote.adminComment && (
                    <p className="mt-2 text-gray-700">
                      Admin Note: {booking.quote.adminComment}
                    </p>
                  )}
                </div>
              </div>
            )}

          {isRange && booking.pricing?.adjustment?.status === "pending_client_approval" && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-amber-900">
                Additional Charge Request Pending
              </h3>
              <p className="text-sm text-amber-800">
                Proposed: NPR{" "}
                {Number(
                  booking.pricing.adjustment.proposedPrice || 0
                ).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Reason:{" "}
                {booking.pricing.adjustment.adjustedQuoteReason ||
                  booking.pricing.adjustment.reason}
              </p>
            </div>
          )}

          {isQuote && showQuoteForm && booking.status === "quote_requested" && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Submit Your Quote</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quoted Price (NPR) *
                  </label>
                  <input
                    type="number"
                    value={quoteData.quotedPrice}
                    onChange={(e) =>
                      setQuoteData({ ...quoteData, quotedPrice: e.target.value })
                    }
                    placeholder="Enter your quoted price"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quote Message (optional)
                  </label>
                  <textarea
                    value={quoteData.quoteMessage}
                    onChange={(e) =>
                      setQuoteData({ ...quoteData, quoteMessage: e.target.value })
                    }
                    placeholder="Explain your pricing or any additional details..."
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {quoteData.quoteMessage.length}/500 characters
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleSubmitQuote}
                    disabled={submittingQuote}
                    className={`rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 ${
                      submittingQuote ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    {submittingQuote ? "Submitting..." : "Submit Quote for Review"}
                  </button>
                  <button
                    onClick={() => setShowQuoteForm(false)}
                    disabled={submittingQuote}
                    className={`rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 ${
                      submittingQuote ? "cursor-not-allowed opacity-50" : ""
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
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={processingAction}
                  className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}

            {isRange && booking.status === "in-progress" && (
              <button
                onClick={() => setShowAdjustmentForm((prev) => !prev)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {showAdjustmentForm ? "Hide Additional Charges" : "Request Additional Charges"}
              </button>
            )}

            {["confirmed", "accepted"].includes(booking.status) && (
              <button
                onClick={handleMarkEnRoute}
                disabled={processingAction}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                I'm On The Way
              </button>
            )}

            {["confirmed", "accepted", "provider_en_route"].includes(booking.status) && (
              <button
                onClick={handleStartJob}
                disabled={processingAction || (isQuote && booking.paymentStatus !== "funds_held")}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Start Job
              </button>
            )}

            {booking.status === "in-progress" && (
              <button
                onClick={handleMarkComplete}
                disabled={
                  processingAction ||
                  (isRange &&
                    booking.pricing?.adjustment?.status === "pending_client_approval")
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Mark Completed
              </button>
            )}

            {canRaiseDispute && !showDisputeBanner && (
              <button
                onClick={() => setDisputeModalOpen(true)}
                className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
              >
                Raise Dispute
              </button>
            )}

            {canOpenChat && (
              <button
                onClick={() => navigate(`/provider/bookings/${booking._id}/chat`)}
                className="relative rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Chat
                {chatUnreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                )}
              </button>
            )}

            {[
              "confirmed",
              "accepted",
              "provider_en_route",
              "in-progress",
              "provider_completed",
              "awaiting_client_confirmation",
              "completed",
            ].includes(booking.status) && (
              <button
                onClick={handleDownloadCalendar}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <HiCalendarDays className="h-4 w-4" />
                Add to Calendar
              </button>
            )}

            {dispute &&
              dispute.status === "resolved" &&
              dispute.resolutionDetails?.reason && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                  {dispute.resolutionDetails.reason}
                </div>
              )}
          </div>

          {isRange && showAdjustmentForm && booking.status === "in-progress" && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <h3 className="mb-1 font-semibold text-gray-900">
                Request Additional Charges
              </h3>
              <p className="mb-3 text-xs text-gray-600">
                Final price increases require explicit client approval.
              </p>
              <div className="space-y-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustmentData.proposedPrice}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      proposedPrice: e.target.value,
                    }))
                  }
                  placeholder="Requested new total price (NPR)"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <textarea
                  value={adjustmentData.reason}
                  onChange={(e) =>
                    setAdjustmentData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Reason for additional charges"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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