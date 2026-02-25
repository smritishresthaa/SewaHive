import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiArrowLeft,
  HiPaperAirplane,
  HiChatBubbleLeftRight,
  HiChevronDown,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import ClientLayout from "../../layouts/ClientLayout";
import ProviderLayout from "../../layouts/ProviderLayout";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import { connectChatSocket } from "../../utils/chatSocket";
import { PRICING_TYPES, resolvePricingType } from "../../utils/bookingWorkflow";

function formatClock(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateHeading(value) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function BookingChat() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({ hasMore: false, nextBefore: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  const Layout = user?.role === "provider" ? ProviderLayout : ClientLayout;
  const selfId = String(user?._id || user?.id || "");

  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const showPricingGuidance =
    pricingType === PRICING_TYPES.RANGE || pricingType === PRICING_TYPES.QUOTE;

  const backRoute =
    user?.role === "provider"
      ? `/provider/bookings/${bookingId}`
      : `/client/bookings/${bookingId}`;

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  async function fetchInitialChat() {
    try {
      setLoading(true);
      const [bookingRes, chatRes] = await Promise.all([
        api.get(`/bookings/${bookingId}`),
        api.get(`/chat/booking/${bookingId}?limit=30`),
      ]);

      setBooking(bookingRes.data.booking);
      setMessages(chatRes.data.messages || []);
      setPagination(chatRes.data.pagination || { hasMore: false, nextBefore: null });

      await api.post(`/chat/booking/${bookingId}/read`);
      try {
        await api.post(`/chat/booking/${bookingId}/read-notifications`);
      } catch (_) {
        // no-op
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load chat");
      navigate(backRoute);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 0);
    }
  }

  async function loadOlderMessages() {
    if (!pagination?.hasMore || !messages.length || loadingMore) return;

    const oldest = messages[0]?.createdAt;
    if (!oldest) return;

    try {
      setLoadingMore(true);
      const listNode = listRef.current;
      const previousHeight = listNode?.scrollHeight || 0;

      const res = await api.get(
        `/chat/booking/${bookingId}?limit=30&before=${encodeURIComponent(oldest)}`
      );
      const older = res.data.messages || [];

      setMessages((prev) => [...older, ...prev]);
      setPagination(res.data.pagination || { hasMore: false, nextBefore: null });

      setTimeout(() => {
        if (!listNode) return;
        const newHeight = listNode.scrollHeight;
        listNode.scrollTop = Math.max(0, newHeight - previousHeight);
      }, 0);
    } catch (err) {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  }

  async function sendViaRestFallback(payloadText) {
    const res = await api.post(`/chat/booking/${bookingId}/message`, {
      text: payloadText,
    });
    return res.data.message;
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    try {
      const socket = socketRef.current;
      let createdMessage = null;

      if (socket?.connected) {
        createdMessage = await new Promise((resolve, reject) => {
          socket.emit(
            "send_message",
            { bookingId, text: trimmed },
            (response) => {
              if (response?.ok && response?.message) {
                resolve(response.message);
                return;
              }
              reject(new Error(response?.error?.message || "Failed to send message"));
            }
          );
        });
      } else {
        createdMessage = await sendViaRestFallback(trimmed);
      }

      setMessages((prev) => [...prev, createdMessage]);
      setNewMessageCount(0);
      setTimeout(() => scrollToBottom(true), 0);
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Message not sent");
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    fetchInitialChat();
  }, [bookingId]);

  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_booking_chat", { bookingId });
    });

    socket.on("new_message", async (incoming) => {
      if (String(incoming?.bookingId) !== String(bookingId)) return;
      setMessages((prev) => [...prev, incoming]);

      const mine = String(incoming?.senderId) === selfId;
      if (!mine) {
        try {
          await api.post(`/chat/booking/${bookingId}/read`);
        } catch (_) {
          // no-op
        }
      }

      if (isNearBottom) {
        setTimeout(() => scrollToBottom(true), 0);
      } else if (!mine) {
        setNewMessageCount((prev) => prev + 1);
      }
    });

    socket.on("messages_read", ({ bookingId: payloadBookingId, userId: readerId }) => {
      if (String(payloadBookingId) !== String(bookingId)) return;
      if (String(readerId) === selfId) return;

      setMessages((prev) =>
        prev.map((message) => {
          if (String(message.senderId) === selfId) {
            return { ...message, status: "read" };
          }
          return message;
        })
      );
    });

    return () => {
      socket.off("connect");
      socket.off("new_message");
      socket.off("messages_read");
      socket.disconnect();
    };
  }, [bookingId, selfId, isNearBottom, user]);

  useEffect(() => {
    if (isNearBottom) {
      setNewMessageCount(0);
    }
  }, [isNearBottom]);

  function handleListScroll() {
    const node = listRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsNearBottom(distanceFromBottom < 120);
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 z-10 mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(backRoute)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <HiArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Booking Chat</h1>
                <p className="text-sm text-gray-600">
                  {booking?.serviceId?.title || "Service"} • #{booking?._id?.slice(-6)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {String(booking?.status || "").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {booking?.scheduledAt && (
              <p className="text-xs text-gray-500">
                {new Date(booking.scheduledAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {showPricingGuidance && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              For pricing changes, use "Request Additional Charges" so it is recorded and approved.
            </div>
          )}

          {booking?.status === "disputed" && (
            <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Dispute in progress — messages are recorded.
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div
            ref={listRef}
            onScroll={handleListScroll}
            className="h-[60vh] overflow-y-auto px-4 py-4"
          >
            {pagination?.hasMore && (
              <div className="mb-4 text-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}

            {!messages.length && (
              <div className="flex h-full items-center justify-center text-center text-gray-500">
                <div>
                  <HiChatBubbleLeftRight className="mx-auto mb-2 h-7 w-7 text-gray-400" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">Ask about timing, location, or details. Keep it professional.</p>
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const shouldShowDate = !previous || !isSameDay(previous.createdAt, message.createdAt);
              const mine = String(message.senderId) === selfId;

              return (
                <div key={message._id || `${message.createdAt}-${index}`}>
                  {shouldShowDate && (
                    <div className="my-4 text-center text-xs text-gray-500">
                      {formatDateHeading(message.createdAt)}
                    </div>
                  )}

                  <div className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-emerald-600 text-white"
                          : "border bg-gray-50 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          mine ? "text-emerald-100" : "text-gray-500"
                        }`}
                      >
                        {formatClock(message.createdAt)}
                        {mine && message.status === "read" ? " • Read" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3">
            {!isNearBottom && newMessageCount > 0 && (
              <button
                onClick={() => {
                  scrollToBottom(true);
                  setNewMessageCount(0);
                }}
                className="mb-2 inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
              >
                <HiChevronDown className="h-3.5 w-3.5" />
                {newMessageCount} new message{newMessageCount > 1 ? "s" : ""}
              </button>
            )}

            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Type a message"
                rows={2}
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <HiPaperAirplane className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
