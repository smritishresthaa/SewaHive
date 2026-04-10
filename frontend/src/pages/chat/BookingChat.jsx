
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HiArrowLeft,
  HiPaperAirplane,
  HiChatBubbleLeftRight,
  HiChevronDown,
  HiPhoto,
  HiMicrophone,
  HiXMark,
  HiArrowPath,
  HiStopCircle,
  HiXCircle,
  HiFilm,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import ClientLayout from "../../layouts/ClientLayout";
import ProviderLayout from "../../layouts/ProviderLayout";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import { connectChatSocket, releaseChatSocket } from "../../utils/chatSocket";
import { PRICING_TYPES, resolvePricingType } from "../../utils/bookingWorkflow";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function formatClock(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeading(value) {
  return new Date(value).toLocaleDateString("en-US", {
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

function formatDuration(sec) {
  if (!sec && sec !== 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

let tempIdCounter = 0;
function makeTempId() {
  return `temp-${Date.now()}-${++tempIdCounter}`;
}

/* Detect MediaRecorder codec support */
function getRecorderMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

/* ────────────────────────────────────────────
   Image Lightbox
   ──────────────────────────────────────────── */

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition"
        aria-label="Close preview"
      >
        <HiXMark className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt={alt || "Image preview"}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   Confirmation Modal
   ──────────────────────────────────────────── */

function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmTone = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const confirmClasses =
    confirmTone === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-200"
      : "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close confirmation modal"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={() => !loading && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-confirmation-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="chat-confirmation-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose()}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close modal"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex min-w-[126px] items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClasses}`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Message Bubble
   ──────────────────────────────────────────── */

function MessageBubble({ message, mine, onImageClick, onRetry }) {
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";
  const isImage = message.type === "image";
  const isVoice = message.type === "voice";
  const isVideo = message.type === "video";

  const bubbleBase = mine
    ? "bg-emerald-600 text-white"
    : "border border-gray-200 bg-gray-50 text-gray-800";

  const metaColor = mine ? "text-emerald-200" : "text-gray-400";

  return (
    <div className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[75%] rounded-2xl text-sm transition-opacity ${
          isSending ? "opacity-60" : ""
        } ${isImage || isVoice ? "p-1" : "px-3.5 py-2"} ${bubbleBase}`}
      >
        {isImage && message.attachment?.url && (
          <button
            onClick={() => onImageClick(message.attachment.url)}
            className="block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="View full image"
          >
            <img
              src={message.attachment.url}
              alt="Shared photo"
              loading="lazy"
              className="max-h-64 max-w-full rounded-xl object-cover"
              style={{ minHeight: 80, minWidth: 120 }}
            />
          </button>
        )}

        {isVideo && message.attachment?.url && (
          <div className="flex flex-col items-center">
            <video
              src={message.attachment.url}
              controls
              className="max-h-64 max-w-full rounded-xl object-cover bg-black"
              style={{ minHeight: 80, minWidth: 120 }}
            />
          </div>
        )}

        {isVoice && message.attachment?.url && (
          <div className="flex items-center gap-2 px-3 py-2">
            <audio
              src={message.attachment.url}
              controls
              preload="metadata"
              className={`h-8 max-w-[220px] ${mine ? "audio-white" : ""}`}
              style={{ filter: mine ? "invert(1) hue-rotate(180deg)" : "none" }}
            />
            {message.attachment.durationSec != null && (
              <span className={`text-xs font-medium ${metaColor}`}>
                {formatDuration(message.attachment.durationSec)}
              </span>
            )}
          </div>
        )}

        {message.text && (
          <p className={`whitespace-pre-wrap break-words ${isImage || isVoice ? "px-2.5 py-1.5" : ""}`}>
            {message.text}
          </p>
        )}

        <div className={`flex items-center gap-1.5 ${isImage || isVoice ? "px-2.5 pb-1.5" : "mt-1"}`}>
          <span className={`text-[11px] ${metaColor}`}>
            {isSending
              ? "Sending…"
              : isFailed
              ? "Failed"
              : formatClock(message.createdAt)}
          </span>
          {mine && message.status === "read" && (
            <span className={`text-[11px] ${metaColor}`}>• Read</span>
          )}
          {isFailed && (
            <button
              onClick={() => onRetry(message)}
              className="ml-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-red-300 hover:text-white"
              aria-label="Retry sending"
            >
              <HiArrowPath className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Voice Recorder Hook
   ──────────────────────────────────────────── */

function useVoiceRecorder() {
  const [state, setState] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeType = useMemo(() => getRecorderMimeType(), []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function start() {
    if (!mimeType) {
      setState("error");
      setErrorMsg("Voice recording is not supported in this browser.");
      return;
    }
    try {
      cleanup();
      chunksRef.current = [];
      setElapsed(0);
      setBlob(null);
      setPreviewUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const recorded = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(recorded);
        setBlob(recorded);
        setPreviewUrl(url);
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setState("recording");

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(sec);
        if (sec >= 120) {
          recorder.stop();
          clearInterval(timerRef.current);
        }
      }, 250);
    } catch (err) {
      setState("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Microphone access was denied. Please allow microphone permissions and try again.");
      } else {
        setErrorMsg("Could not start recording. Please check your microphone.");
      }
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop();
    }
  }

  function cancel() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setState("idle");
    setElapsed(0);
    setErrorMsg("");
  }

  function dismissError() {
    setState("idle");
    setErrorMsg("");
  }

  return { state, elapsed, errorMsg, blob, previewUrl, mimeType, start, stop, cancel, dismissError };
}

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */

export default function BookingChat() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const Layout = user?.role === "provider" ? ProviderLayout : ClientLayout;
  const selfId = String(user?._id || user?.id || "");

  const [conversations, setConversations] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [conversationSearch, setConversationSearch] = useState("");
  const [activePairKey, setActivePairKey] = useState("");

  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({ hasMore: false, nextBefore: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [blockState, setBlockState] = useState({ isBlocked: false, blockedByMe: false, blockedByOther: false });
  const [blockLoading, setBlockLoading] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({ open: false, mode: "block" });

  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const currentBookingId = String(booking?._id || bookingId || "");
  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const showPricingGuidance =
    pricingType === PRICING_TYPES.RANGE || pricingType === PRICING_TYPES.QUOTE;

  const messagesRoute =
    user?.role === "provider" ? "/provider/messages" : "/client/messages";

  const backRoute =
    user?.role === "provider"
      ? `/provider/bookings/${booking?._id || bookingId}`
      : `/client/bookings/${booking?._id || bookingId}`;

  const voice = useVoiceRecorder();
  const canSendMessages = !blockState?.isBlocked;

  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const peer = String(conversation?.peer?.name || "").toLowerCase();
      const service = String(conversation?.serviceTitle || "").toLowerCase();
      const preview = String(conversation?.lastMessageText || "").toLowerCase();
      return peer.includes(query) || service.includes(query) || preview.includes(query);
    });
  }, [conversations, conversationSearch]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((conv) => activePairKey && conv.pairKey === activePairKey) ||
      conversations.find((conv) => String(conv.bookingId) === String(currentBookingId)) ||
      null
    );
  }, [conversations, activePairKey, currentBookingId]);

  const fetchConversations = useCallback(async (preferredPairKey = "") => {
    try {
      setSidebarLoading(true);
      const res = await api.get("/chat/conversations");
      const nextConversations = res.data?.conversations || [];
      setConversations(nextConversations);

      const totalUnread = nextConversations.reduce(
        (sum, conv) => sum + Number(conv?.unreadCount || 0),
        0
      );
      window.dispatchEvent(new Event("chat-unread-updated"));
      window.dispatchEvent(
        new CustomEvent("chat-unread-updated-total", {
          detail: { totalUnread },
        })
      );

      if (preferredPairKey) {
        const matched = nextConversations.find((conv) => conv.pairKey === preferredPairKey);
        if (matched) setActivePairKey(matched.pairKey || "");
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setConversations([]);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  async function markChatAsReadAndRefreshSidebar(targetBookingId = currentBookingId) {
    if (!targetBookingId) return;

    try {
      await api.post(`/chat/booking/${targetBookingId}/read`);
    } catch (_) {}

    try {
      await api.post(`/chat/booking/${targetBookingId}/read-notifications`);
    } catch (_) {}

    window.dispatchEvent(new Event("chat-unread-updated"));
  }

  const loadChatForBooking = useCallback(
    async (targetBookingId, { skipSpinner = false } = {}) => {
      if (!targetBookingId) return;
      try {
        if (!skipSpinner) setLoading(true);
        const chatRes = await api.get(`/chat/booking/${targetBookingId}?limit=30`);
        const nextBooking = chatRes.data?.booking || null;
        const nextConversation = chatRes.data?.conversation || {};

        setBooking(nextBooking);
        setMessages(chatRes.data?.messages || []);
        setPagination(chatRes.data?.pagination || { hasMore: false, nextBefore: null });
        setBlockState(
          nextConversation?.block || { isBlocked: false, blockedByMe: false, blockedByOther: false }
        );
        setActivePairKey(nextConversation?.pairKey || "");

        await markChatAsReadAndRefreshSidebar(targetBookingId);
        await fetchConversations(nextConversation?.pairKey || "");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load chat");
        navigate(messagesRoute);
      } finally {
        if (!skipSpinner) {
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 0);
        }
      }
    },
    [fetchConversations, messagesRoute, navigate]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadChatForBooking(bookingId);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, loadChatForBooking]);

  function openBlockConfirmation() {
    if (blockLoading || !currentBookingId) return;
    setConfirmationModal({
      open: true,
      mode: blockState?.blockedByMe ? "unblock" : "block",
    });
  }

  function closeConfirmationModal() {
    if (blockLoading) return;
    setConfirmationModal((prev) => ({ ...prev, open: false }));
  }

  async function confirmToggleBlock() {
    if (blockLoading || !currentBookingId) return;

    try {
      setBlockLoading(true);

      if (confirmationModal.mode === "unblock") {
        const res = await api.delete(`/chat/booking/${currentBookingId}/block`);
        setBlockState(res.data?.block || { isBlocked: false, blockedByMe: false, blockedByOther: false });
        toast.success("Chat unblocked");
      } else {
        const res = await api.post(`/chat/booking/${currentBookingId}/block`);
        setBlockState(res.data?.block || { isBlocked: true, blockedByMe: true, blockedByOther: false });
        toast.success("Chat blocked");
      }

      closeConfirmationModal();
      await fetchConversations(activePairKey);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update chat block status");
    } finally {
      setBlockLoading(false);
    }
  }

  async function loadOlderMessages() {
    if (!pagination?.hasMore || !messages.length || loadingMore || !currentBookingId) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    try {
      setLoadingMore(true);
      const listNode = listRef.current;
      const prevH = listNode?.scrollHeight || 0;
      const res = await api.get(
        `/chat/booking/${currentBookingId}?limit=30&before=${encodeURIComponent(oldest)}`
      );
      setMessages((prev) => [...(res.data.messages || []), ...prev]);
      setPagination(res.data.pagination || { hasMore: false, nextBefore: null });
      setTimeout(() => {
        if (listNode) listNode.scrollTop = Math.max(0, listNode.scrollHeight - prevH);
      }, 0);
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleOpenConversation(conversation) {
    if (!conversation?.bookingId) return;
    const route =
      user?.role === "client"
        ? `/client/bookings/${conversation.bookingId}/chat`
        : `/provider/bookings/${conversation.bookingId}/chat`;
    navigate(route);
  }

  async function handleSend() {
    if (!canSendMessages) {
      toast.error(blockState?.blockedByMe ? "You blocked this chat" : "This chat is currently blocked");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || sending || !currentBookingId) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId: currentBookingId,
      senderId: selfId,
      type: "text",
      text: trimmed,
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setText("");
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      const socket = socketRef.current;
      let created;
      if (socket?.connected) {
        created = await new Promise((resolve, reject) => {
          socket.emit("send_message", { bookingId: currentBookingId, text: trimmed }, (res) => {
            if (res?.ok && res?.message) resolve(res.message);
            else reject(new Error(res?.error?.message || "Failed"));
          });
        });
      } else {
        const res = await api.post(`/chat/booking/${currentBookingId}/message`, { text: trimmed });
        created = res.data.message;
      }

      setMessages((prev) => {
        const realId = created._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? created : m));
      });

      await fetchConversations(activePairKey);
      window.dispatchEvent(new Event("chat-unread-updated"));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
      setText(trimmed);
      toast.error(err?.message || "Message not sent");
    } finally {
      setSending(false);
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview({ file, dataUrl: reader.result });
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  function handleVideoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["video/mp4", "video/webm", "video/ogg"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only MP4, WebM, and Ogg videos are allowed");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Video must be under 200 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setVideoPreview({ file, dataUrl: reader.result });
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  function cancelImagePreview() {
    setImagePreview(null);
    setUploadProgress(0);
  }

  function cancelVideoPreview() {
    setVideoPreview(null);
    setUploadProgress(0);
  }

  async function sendImage() {
    if (!canSendMessages) {
      toast.error(blockState?.blockedByMe ? "You blocked this chat" : "This chat is currently blocked");
      return;
    }
    if (!imagePreview?.file || sending || !currentBookingId) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId: currentBookingId,
      senderId: selfId,
      type: "image",
      text: "",
      attachment: { url: imagePreview.dataUrl },
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setImagePreview(null);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      const fd = new FormData();
      fd.append("image", imagePreview.file);

      const res = await api.post(`/chat/booking/${currentBookingId}/upload-image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) setUploadProgress(Math.round((p.loaded / p.total) * 100));
        },
      });

      setMessages((prev) => {
        const realId = res.data.message._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? res.data.message : m));
      });

      await fetchConversations(activePairKey);
      window.dispatchEvent(new Event("chat-unread-updated"));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }

  async function sendVideo() {
    if (!canSendMessages) {
      toast.error(blockState?.blockedByMe ? "You blocked this chat" : "This chat is currently blocked");
      return;
    }
    if (!videoPreview?.file || sending || !currentBookingId) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId: currentBookingId,
      senderId: selfId,
      type: "video",
      text: "",
      attachment: { url: videoPreview.dataUrl },
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setVideoPreview(null);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      const fd = new FormData();
      fd.append("video", videoPreview.file);

      const res = await api.post(`/chat/booking/${currentBookingId}/upload-video`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) setUploadProgress(Math.round((p.loaded / p.total) * 100));
        },
      });

      setMessages((prev) => {
        const realId = res.data.message._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? res.data.message : m));
      });

      await fetchConversations(activePairKey);
      window.dispatchEvent(new Event("chat-unread-updated"));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
      toast.error(err?.response?.data?.message || "Video upload failed");
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }

  async function handleSendVoice() {
    if (!voice.blob || sending || !currentBookingId) return;

    const capturedBlob = voice.blob;
    const capturedDuration = voice.elapsed;
    const capturedPreviewUrl = voice.previewUrl;
    const ext = voice.mimeType.includes("webm")
      ? "webm"
      : voice.mimeType.includes("ogg")
      ? "ogg"
      : "mp4";

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId: currentBookingId,
      senderId: selfId,
      type: "voice",
      text: "",
      attachment: { url: capturedPreviewUrl, durationSec: capturedDuration },
      status: "sending",
      createdAt: new Date().toISOString(),
    };

    voice.cancel();
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      const fd = new FormData();
      fd.append("voice", capturedBlob, `voice.${ext}`);
      fd.append("durationSec", String(capturedDuration));

      const res = await api.post(`/chat/booking/${currentBookingId}/upload-voice`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) setUploadProgress(Math.round((p.loaded / p.total) * 100));
        },
      });

      setMessages((prev) => {
        const realId = res.data.message._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? res.data.message : m));
      });

      await fetchConversations(activePairKey);
      window.dispatchEvent(new Event("chat-unread-updated"));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
      toast.error(err?.response?.data?.message || "Voice upload failed");
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }

  async function handleRetry(failedMsg) {
    setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));

    if (failedMsg.type === "text") {
      setText(failedMsg.text);
    } else {
      toast("Please re-attach and send the media again.");
    }
  }

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    const token = localStorage.getItem("accessToken");
    if (!token || !currentBookingId) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join_booking_chat", { bookingId: currentBookingId }));

    socket.on("new_message", async (incoming) => {
      if (String(incoming?.bookingId) !== String(currentBookingId)) return;

      const mine = String(incoming?.senderId) === selfId;
      if (mine) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === incoming._id)) return prev;
        return [...prev, incoming];
      });

      await markChatAsReadAndRefreshSidebar(currentBookingId);
      await fetchConversations(activePairKey);

      if (isNearBottom) setTimeout(() => scrollToBottom(true), 0);
      else setNewMessageCount((c) => c + 1);
    });

    socket.on("messages_read", ({ bookingId: bid, userId: readerId }) => {
      if (String(bid) !== String(currentBookingId) || String(readerId) === selfId) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.senderId) === selfId ? { ...m, status: "read" } : m
        )
      );
      window.dispatchEvent(new Event("chat-unread-updated"));
    });

    return () => {
      socket.off("connect");
      socket.off("new_message");
      socket.off("messages_read");
      releaseChatSocket();
    };
  }, [currentBookingId, selfId, isNearBottom, user, activePairKey, fetchConversations]);

  useEffect(() => {
    if (isNearBottom) setNewMessageCount(0);
  }, [isNearBottom]);

  function handleListScroll() {
    const node = listRef.current;
    if (!node) return;
    setIsNearBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 120);
  }

  function handleComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (imagePreview) sendImage();
      else handleSend();
    }
  }

  const isRecording = voice.state === "recording";
  const hasVoicePreview = voice.state === "preview";
  const hasVoiceError = voice.state === "error";
  const isMediaActive = !!imagePreview || !!videoPreview || isRecording || hasVoicePreview || hasVoiceError;

  const modalCopy =
    confirmationModal.mode === "unblock"
      ? {
          title: "Unblock this chat?",
          description:
            "This will restore messaging for both sides in this shared conversation. Previous chat history will remain visible.",
          confirmLabel: "Unblock chat",
          confirmTone: "success",
        }
      : {
          title: "Block this chat?",
          description:
            "Existing history will stay visible, but both sides will not be able to send new messages until you unblock this shared conversation.",
          confirmLabel: "Block chat",
          confirmTone: "danger",
        };

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
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:px-6">
        <div className="grid min-h-[calc(100vh-110px)] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-[240px] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="border-b px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Chats</h2>
                  <p className="text-xs text-gray-500">
                    One shared thread per {user?.role === "provider" ? "client" : "provider"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(messagesRoute)}
                  className="rounded-xl border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  All chats
                </button>
              </div>
              <div className="mt-4">
                <input
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {sidebarLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  No conversations found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const active =
                      (activePairKey && conversation.pairKey === activePairKey) ||
                      String(conversation.bookingId) === String(currentBookingId);
                    const unreadCount = Number(conversation.unreadCount || 0);
                    const peerName = conversation?.peer?.name || "Unknown";
                    const avatarUrl = conversation?.peer?.avatarUrl || null;
                    const statusLabel = String(conversation?.bookingStatus || "")
                      .replace(/[_-]+/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (char) => char.toUpperCase());

                    return (
                      <button
                        key={`${conversation.pairKey || conversation._id}`}
                        type="button"
                        onClick={() => handleOpenConversation(conversation)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-emerald-200 bg-emerald-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={peerName} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-semibold text-white">
                              {peerName
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0]?.toUpperCase())
                                .join("") || "U"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-base font-semibold text-gray-900">{peerName}</p>
                              <span className="shrink-0 text-[11px] text-gray-500">
                                {conversation.lastMessageAt
                                  ? new Date(conversation.lastMessageAt).toLocaleDateString()
                                  : "—"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {statusLabel || "Unknown"}
                              </span>
                              <span className="truncate text-xs text-gray-500">
                                {conversation.serviceTitle || "Service"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-sm text-gray-600">
                                {conversation.lastMessageText || "No messages yet. Start the conversation!"}
                              </p>
                              {unreadCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[calc(100vh-110px)] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="border-b px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => navigate(backRoute)}
                    className="rounded-xl p-2 hover:bg-gray-100"
                    aria-label="Back"
                  >
                    <HiArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {activeConversation?.peer?.name || booking?.serviceTitle || "Booking Chat"}
                    </h1>
                    <p className="text-sm text-gray-600">
                      {booking?.serviceTitle || activeConversation?.serviceTitle || "Service"} • #{String(currentBookingId).slice(-6)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Status: {String(booking?.status || activeConversation?.bookingStatus || "").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchConversations(activePairKey)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={openBlockConfirmation}
                    disabled={blockLoading}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      blockState?.blockedByMe
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    } disabled:opacity-50`}
                  >
                    {blockState?.blockedByMe ? "Unblock" : "Block"}
                  </button>
                </div>
              </div>

              {showPricingGuidance && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  For pricing changes, use "Request Additional Charges" so it is recorded and approved.
                </div>
              )}
              {booking?.status === "disputed" && (
                <div className="mt-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  Dispute in progress — messages are recorded.
                </div>
              )}
              {blockState?.isBlocked && (
                <div
                  className={`mt-2 rounded-2xl border px-3 py-2 text-xs ${
                    blockState?.blockedByMe
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {blockState?.blockedByMe
                    ? "You blocked this chat. Previous messages stay visible, but sending is disabled until you unblock it."
                    : "This chat is currently blocked by the other user. Previous messages remain visible, but new messages are disabled."}
                </div>
              )}
            </div>

            <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-4 sm:px-5">
              {pagination?.hasMore && (
                <div className="mb-4 text-center">
                  <button
                    onClick={loadOlderMessages}
                    disabled={loadingMore}
                    className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                    <p className="text-xs">Ask about timing, location, or details.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                const mine = String(msg.senderId) === selfId;

                return (
                  <div key={msg._id || `${msg.createdAt}-${idx}`}>
                    {showDate && (
                      <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="whitespace-nowrap text-[11px] font-medium text-gray-400">
                          {formatDateHeading(msg.createdAt)}
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>
                    )}
                    <MessageBubble
                      message={msg}
                      mine={mine}
                      onImageClick={(src) => setLightboxSrc(src)}
                      onRetry={handleRetry}
                    />
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {!isNearBottom && newMessageCount > 0 && (
              <div className="flex justify-center py-1">
                <button
                  onClick={() => {
                    scrollToBottom(true);
                    setNewMessageCount(0);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <HiChevronDown className="h-3.5 w-3.5" />
                  {newMessageCount} new message{newMessageCount > 1 ? "s" : ""}
                </button>
              </div>
            )}

            {sending && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="px-4">
                <div className="overflow-hidden rounded-full bg-gray-200 h-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {imagePreview && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <div className="relative inline-block">
                  <img
                    src={imagePreview.dataUrl}
                    alt="Preview"
                    className="h-28 w-28 rounded-lg object-cover border shadow-sm"
                  />
                  <button
                    onClick={cancelImagePreview}
                    className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-0.5 text-white shadow hover:bg-red-600 transition"
                    aria-label="Remove image"
                  >
                    <HiXMark className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={sendImage}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiPaperAirplane className="h-4 w-4" /> Send Photo
                  </button>
                  <button
                    onClick={cancelImagePreview}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {videoPreview && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <div className="relative inline-block">
                  <video
                    src={videoPreview.dataUrl}
                    controls
                    className="h-28 w-28 rounded-lg object-cover border shadow-sm bg-black"
                  />
                  <button
                    onClick={cancelVideoPreview}
                    className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-0.5 text-white shadow hover:bg-red-600 transition"
                    aria-label="Remove video"
                  >
                    <HiXMark className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={sendVideo}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiPaperAirplane className="h-4 w-4" /> Send Video
                  </button>
                  <button
                    onClick={cancelVideoPreview}
                    className="rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="border-t bg-red-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <span className="text-sm font-medium text-red-700">Recording…</span>
                  <span className="text-sm font-mono font-semibold text-red-600">{formatDuration(voice.elapsed)}</span>
                  <span className="text-xs text-red-400">/ 2:00 max</span>
                  <div className="flex-1" />
                  <button
                    onClick={voice.cancel}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={voice.stop}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <HiStopCircle className="h-4 w-4" /> Stop
                  </button>
                </div>
              </div>
            )}

            {hasVoicePreview && (
              <div className="border-t bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <audio src={voice.previewUrl} controls preload="metadata" className="h-8 max-w-[220px]" />
                  <span className="text-sm text-gray-600">{formatDuration(voice.elapsed)}</span>
                  <div className="flex-1" />
                  <button onClick={voice.cancel} className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                    Discard
                  </button>
                  <button
                    onClick={handleSendVoice}
                    disabled={sending}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiPaperAirplane className="h-4 w-4" /> Send
                  </button>
                </div>
              </div>
            )}

            {hasVoiceError && (
              <div className="border-t bg-red-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <HiXCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <p className="flex-1 text-sm text-red-700">{voice.errorMsg}</p>
                  <button onClick={voice.dismissError} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {!isMediaActive && (
              <div className="border-t bg-white px-3 py-3">
                <div className="flex items-end gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                    aria-label="Attach image"
                  />
                  <button
                    onClick={() => canSendMessages && imageInputRef.current?.click()}
                    disabled={sending}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-emerald-600 disabled:opacity-40"
                    aria-label="Attach photo"
                    title="Send a photo"
                  >
                    <HiPhoto className="h-5 w-5" />
                  </button>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={handleVideoSelect}
                    className="hidden"
                    aria-label="Attach video"
                  />
                  <button
                    onClick={() => canSendMessages && videoInputRef.current?.click()}
                    disabled={sending}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-emerald-600 disabled:opacity-40"
                    aria-label="Attach video"
                    title="Send a video"
                  >
                    <HiFilm className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => canSendMessages && voice.start()}
                    disabled={sending}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-emerald-600 disabled:opacity-40"
                    aria-label="Record voice note"
                    title="Record a voice note"
                  >
                    <HiMicrophone className="h-5 w-5" />
                  </button>

                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={canSendMessages ? "Type a message..." : "Sending is disabled while this chat is blocked"}
                    rows={1}
                    disabled={!canSendMessages}
                    className="min-h-[40px] max-h-24 flex-1 resize-none rounded-2xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />

                  <button
                    onClick={handleSend}
                    disabled={sending || !text.trim() || !canSendMessages}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <HiPaperAirplane className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <ConfirmationModal
        open={confirmationModal.open}
        title={modalCopy.title}
        description={modalCopy.description}
        confirmLabel={modalCopy.confirmLabel}
        confirmTone={modalCopy.confirmTone}
        loading={blockLoading}
        onConfirm={confirmToggleBlock}
        onClose={closeConfirmationModal}
      />
    </Layout>
  );
}
