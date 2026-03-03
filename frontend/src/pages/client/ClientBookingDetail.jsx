import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HiArrowLeft, HiCalendar, HiClock, HiMapPin, HiCalendarDays, HiCheckBadge, HiStar, HiPhone, HiEnvelope } from "react-icons/hi2";
import ClientLayout from "../../layouts/ClientLayout";
import DisputeModal from "../../components/DisputeModal";
import ClientLiveTracking from "../../components/tracking/ClientLiveTracking";
import { connectChatSocket, releaseChatSocket } from "../../utils/chatSocket";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { PRICING_TYPES, resolvePricingType } from "../../utils/bookingWorkflow";

export default function ClientBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const [respondingAdjustment, setRespondingAdjustment] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  /* ── Live tracking state (lifted from ClientLiveTracking) ── */
  const [providerPos, setProviderPos] = useState(null);
  const [trackingLastUpdate, setTrackingLastUpdate] = useState(null);
  const [trackingConnected, setTrackingConnected] = useState(false);
  const trackingSocketRef = useRef(null);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  /* ── Seed provider position from persisted booking data ── */
  useEffect(() => {
    if (booking?.providerLiveLocation?.lat && booking?.providerLiveLocation?.lng) {
      setProviderPos({
        lat: booking.providerLiveLocation.lat,
        lng: booking.providerLiveLocation.lng,
        heading: booking.providerLiveLocation.heading,
        speed: booking.providerLiveLocation.speed,
      });
      setTrackingLastUpdate(booking.providerLiveLocation.updatedAt || Date.now());
    }
  }, [booking?.providerLiveLocation?.lat, booking?.providerLiveLocation?.lng]);

  /* ── Silent refetch (no loading spinner) for socket-triggered updates ── */
  const silentRefetch = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setBooking(res.data.booking);
    } catch (_) {
      // silently ignore — user can manually refresh if needed
    }
  }, [bookingId]);

  /* ── Real-time tracking socket ── */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !bookingId) return;

    const socket = connectChatSocket(token);
    trackingSocketRef.current = socket;

    function onConnect() {
      setTrackingConnected(true);
      socket.emit("join_tracking", { bookingId });
    }

    function onDisconnect() {
      setTrackingConnected(false);
    }

    function onStatusChanged(data) {
      if (String(data.bookingId) === String(bookingId)) {
        silentRefetch();
      }
    }

    function onLiveLocation(data) {
      if (String(data.bookingId) !== String(bookingId)) return;
      setProviderPos({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
      });
      setTrackingLastUpdate(data.timestamp || Date.now());
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("booking_status_changed", onStatusChanged);
    socket.on("live_location", onLiveLocation);

    // Handle already-connected socket (socket.io-client may reuse Manager)
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("booking_status_changed", onStatusChanged);
      socket.off("live_location", onLiveLocation);
      releaseChatSocket();
      trackingSocketRef.current = null;
      setTrackingConnected(false);
    };
  }, [bookingId, silentRefetch]);

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

  async function handleConfirmCompletion() {
    try {
      await api.post(`/payment/escrow/confirm-completion`, { bookingId });
      toast.success("Payment released to provider!");
      fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to confirm completion");
    }
  }

  // PHASE 2B: Download calendar file
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

      toast.success("Calendar event downloaded!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download calendar");
    }
  }

  // PHASE 2C: Request quote
  async function handleRequestQuote() {
    if (!quoteMessage.trim() && quoteMessage.length > 500) {
      toast.error("Please provide a valid message (max 500 characters)");
      return;
    }
    
    try {
      setRequestingQuote(true);
      await api.post(`/bookings/${bookingId}/request-quote`, {
        message: quoteMessage,
      });
      toast.success("Quote request sent to provider!");
      setShowQuoteRequest(false);
      setQuoteMessage("");
      fetchBooking();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to request quote";
      const suggestion = err?.response?.data?.suggestion;
      toast.error(suggestion ? `${errorMsg}. ${suggestion}` : errorMsg);
    } finally {
      setRequestingQuote(false);
    }
  }

  // PHASE 2C: Accept approved quote
  async function handleAcceptQuote() {
    try {
      setAcceptingQuote(true);
      await api.post(`/bookings/${bookingId}/accept-quote`);
      toast.success("Quote accepted! Proceeding to payment...");
      navigate(`/payment/confirm/${bookingId}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept quote");
    } finally {
      setAcceptingQuote(false);
    }
  }

  async function handleAdjustedQuoteResponse(action) {
    try {
      setRespondingAdjustment(true);
      const res = await api.post(`/bookings/${bookingId}/respond-adjusted-quote`, { action });
      if (action === "accept") {
        const due = Number(res?.data?.amountDue || 0);
        toast.success(
          due > 0
            ? `Additional charges approved. Additional NPR ${due} escrow payment required.`
            : "Additional charges approved"
        );
      } else {
        toast.success("Additional charges rejected");
      }
      await fetchBooking();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update additional charge request");
    } finally {
      setRespondingAdjustment(false);
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
  const isDisputed = booking?.status === "disputed" || showDisputeBanner;
  const canConfirmCompletion = new Set([
    "provider_completed",
    "awaiting_client_confirmation",
    "pending-completion",
  ]).has(booking?.status);
  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const isFixed = pricingType === PRICING_TYPES.FIXED;
  const isRange = pricingType === PRICING_TYPES.RANGE;
  const isQuote = pricingType === PRICING_TYPES.QUOTE;
  const canPayNow =
    booking?.status === "pending_payment" &&
    (!isQuote || booking?.quote?.status === "accepted");
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
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  if (!booking) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-600">Booking not found</p>
          <button
            onClick={() => navigate("/client/bookings")}
            className="mt-4 text-emerald-600 hover:text-emerald-700"
          >
            Back to bookings
          </button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/client/bookings")}
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
              Your dispute is being reviewed. We will notify you of updates.
            </p>
            <p className="text-xs text-yellow-700 mt-2">Status: {disputeStatusLabel}</p>
          </div>
        )}

        {/* Live Tracking Map — shows when provider is en route */}
        <ClientLiveTracking
          booking={booking}
          providerPos={providerPos}
          lastUpdate={trackingLastUpdate}
          isConnected={trackingConnected}
        />

        {/* Provider Info Card */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Details</h3>
          <div className="flex items-start gap-4">
            {booking.providerId?.profile?.avatarUrl ? (
              <img
                src={booking.providerId.profile.avatarUrl}
                alt={booking.providerId?.profile?.name || "Provider"}
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xl font-bold">
                {(booking.providerId?.profile?.name || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-lg font-semibold text-gray-900">
                  {booking.providerId?.profile?.name || booking.providerId?.email || "Provider"}
                </h4>
                {(booking.providerId?.kycStatus === "approved" || 
                  booking.providerId?.providerDetails?.badges?.includes("verified")) && (
                  <HiCheckBadge className="text-emerald-500 text-xl" title="Verified Provider" />
                )}
              </div>
              {booking.providerId?.providerDetails?.rating?.average > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <HiStar className="text-yellow-500 text-sm" />
                  <span className="text-sm font-medium text-gray-700">
                    {booking.providerId.providerDetails.rating.average.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({booking.providerId.providerDetails.rating.count} reviews)
                  </span>
                </div>
              )}
              {booking.providerId?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <HiPhone className="text-gray-400" />
                  <span>{booking.providerId.phone}</span>
                </div>
              )}
              {booking.providerId?.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiEnvelope className="text-gray-400" />
                  <span>{booking.providerId.email}</span>
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
              {Number(booking.pricing?.additionalEscrowRequired || 0) > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Additional escrow due: NPR {Number(booking.pricing?.additionalEscrowRequired || 0).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {(isFixed || isRange) && (
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">{isRange ? "Minimum Service Fee" : "Base Price"}</p>
                <p className="text-sm font-semibold text-gray-900">
                  NPR {Number(booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || booking.price || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Escrow Held</p>
                <p className="text-sm font-semibold text-indigo-700">
                  NPR {Number(booking.pricing?.escrowHeldAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Approved Total</p>
                <p className="text-sm font-semibold text-gray-900">
                  NPR {Number(booking.pricing?.finalApprovedPrice || booking.totalAmount || 0).toLocaleString()}
                </p>
              </div>
              {isRange && (
                <>
                  {Number(booking.pricing?.includedHours || 0) > 0 && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Included Hours</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {Number(booking.pricing?.includedHours || 0).toFixed(2)} hrs
                      </p>
                    </div>
                  )}
                  {Number(booking.pricing?.hourlyRate || 0) > 0 && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Extra Hourly Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        NPR {Number(booking.pricing?.hourlyRate || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Approved Extra Charges</p>
                    <p className="text-sm font-semibold text-gray-900">
                      NPR {Number(booking.pricing?.approvedAdjustmentsTotal || 0).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {isQuote && booking.quote && booking.quote.status !== "none" && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">Quote Timeline</h3>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800">
                  Status: <span className="font-medium">{booking.quote.status?.replace(/_/g, " ")}</span>
                </p>
                {booking.quote.quotedPrice && (
                  <p className="text-blue-800">
                    Quoted Price: <span className="font-bold">NPR {booking.quote.quotedPrice.toLocaleString()}</span>
                  </p>
                )}
                {booking.quote.approvedPrice && (
                  <p className="text-green-800">
                    Approved Price: <span className="font-bold">NPR {booking.quote.approvedPrice.toLocaleString()}</span>
                  </p>
                )}
                {booking.quote.quoteMessage && (
                  <p className="text-blue-700 italic mt-2">"{booking.quote.quoteMessage}"</p>
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
              <h3 className="font-semibold text-amber-900 text-sm mb-2">Additional Charge Approval Required</h3>
              <p className="text-sm text-amber-800">
                Provider proposed: <span className="font-bold">NPR {Number(booking.pricing.adjustment.proposedPrice || 0).toLocaleString()}</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Base price: NPR {Number(booking.pricing.adjustment.basePrice || booking.pricing?.basePrice || booking.pricing?.basePriceAtBooking || booking.price || 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700">
                Extra time cost: NPR {Number(booking.pricing.adjustment.extraTimeCost || booking.pricing?.extraTimeCost || 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700 mt-1">Reason: {booking.pricing.adjustment.adjustedQuoteReason || booking.pricing.adjustment.reason}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAdjustedQuoteResponse("accept")}
                  disabled={respondingAdjustment}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50"
                >
                  Accept Additional Charges
                </button>
                <button
                  onClick={() => handleAdjustedQuoteResponse("reject")}
                  disabled={respondingAdjustment}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canPayNow && (
              <button
                onClick={() => navigate(`/payment/confirm/${booking._id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                {isQuote ? "Pay Now" : isRange ? "Pay Base Escrow" : "Pay Now"}
              </button>
            )}

            {isQuote && ["requested", "pending_payment", "quote_rejected", "quote_requested"].includes(booking.status) &&
              ["none", "rejected"].includes(booking.quote?.status || "none") && (
              <button
                onClick={() => setShowQuoteRequest(!showQuoteRequest)}
                disabled={requestingQuote}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestingQuote ? "Requesting..." : "Request Quote"}
              </button>
            )}

            {isQuote && ["sent", "approved"].includes(booking.quote?.status) && ["quote_sent", "quote_accepted", "pending_payment"].includes(booking.status) && (
              <button
                onClick={handleAcceptQuote}
                disabled={acceptingQuote}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptingQuote ? "Processing..." : "Accept Quote & Proceed to Payment"}
              </button>
            )}

            {Number(booking.pricing?.additionalEscrowRequired || 0) > 0 && (
              <button
                onClick={() => navigate(`/payment/confirm/${booking._id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                Pay Additional Escrow
              </button>
            )}

            {canConfirmCompletion && (
              <button
                onClick={handleConfirmCompletion}
                disabled={isDisputed}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Completion & Release Payment
              </button>
            )}

            {isDisputed && (
              <div className="px-4 py-2 rounded-lg border border-yellow-200 bg-yellow-50 text-xs text-yellow-800">
                Completion is disabled while this booking is under dispute.
              </div>
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
                onClick={() => navigate(`/client/bookings/${booking._id}/chat`)}
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

            {/* PHASE 2B: Add to Calendar button */}
            {["confirmed", "accepted", "provider_en_route", "in-progress", "pending-completion", "completed"].includes(booking.status) && (
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

          {isQuote && showQuoteRequest && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-3">Request a Quote</h3>
              <textarea
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
                placeholder="Describe your requirements or add any special notes for the provider..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">{quoteMessage.length}/500 characters</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRequestQuote}
                  disabled={requestingQuote}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestingQuote ? "Sending..." : "Send Quote Request"}
                </button>
                <button
                  onClick={() => setShowQuoteRequest(false)}
                  disabled={requestingQuote}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
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
    </ClientLayout>
  );
}
