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
  HiPlayCircle,
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

        {/* ── Image bubble ── */}
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

        {/* ── Video bubble ── */}
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

        {/* ── Voice bubble ── */}
        {isVoice && message.attachment?.url && (
          <div className={`flex items-center gap-2 px-3 py-2 ${mine ? "" : ""}`}>
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

        {/* ── Text content ── */}
        {message.text && (
          <p className={`whitespace-pre-wrap break-words ${isImage || isVoice ? "px-2.5 py-1.5" : ""}`}>
            {message.text}
          </p>
        )}

        {/* ── Meta row ── */}
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
  const [state, setState] = useState("idle"); // idle | recording | preview | error
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

  /* ── Core chat state ── */
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({ hasMore: false, nextBefore: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);


  /* ── Media state ── */
  const [imagePreview, setImagePreview] = useState(null); // { file, dataUrl }
  const [videoPreview, setVideoPreview] = useState(null); // { file, dataUrl }
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Video handlers
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

    // Reset input so re-selecting same file works
    e.target.value = "";
  }

  function cancelVideoPreview() {
    setVideoPreview(null);
    setUploadProgress(0);
  }

  async function sendVideo() {
    if (!videoPreview?.file || sending) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId,
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

      const res = await api.post(`/chat/booking/${bookingId}/upload-video`, fd, {
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

  const Layout = user?.role === "provider" ? ProviderLayout : ClientLayout;
  const selfId = String(user?._id || user?.id || "");

  const pricingType = useMemo(() => resolvePricingType(booking), [booking]);
  const showPricingGuidance =
    pricingType === PRICING_TYPES.RANGE || pricingType === PRICING_TYPES.QUOTE;

  const backRoute =
    user?.role === "provider"
      ? `/provider/bookings/${bookingId}`
      : `/client/bookings/${bookingId}`;

  const voice = useVoiceRecorder();

  /* ── Scroll helpers ── */
  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }

  /* ── Load older messages ── */
  async function loadOlderMessages() {
    if (!pagination?.hasMore || !messages.length || loadingMore) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    try {
      setLoadingMore(true);
      const listNode = listRef.current;
      const prevH = listNode?.scrollHeight || 0;
      const res = await api.get(
        `/chat/booking/${bookingId}?limit=30&before=${encodeURIComponent(oldest)}`
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

  /* ── Text send (socket-first, REST fallback) ── */
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId,
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
          socket.emit("send_message", { bookingId, text: trimmed }, (res) => {
            if (res?.ok && res?.message) resolve(res.message);
            else reject(new Error(res?.error?.message || "Failed"));
          });
        });
      } else {
        const res = await api.post(`/chat/booking/${bookingId}/message`, { text: trimmed });
        created = res.data.message;
      }
      // Replace temp message AND remove any socket-delivered duplicate
      setMessages((prev) => {
        const realId = created._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? created : m));
      });
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

  /* ── Image send ── */
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

    // Reset input so re-selecting same file works
    e.target.value = "";
  }

  function cancelImagePreview() {
    setImagePreview(null);
    setUploadProgress(0);
  }

  async function sendImage() {
    if (!imagePreview?.file || sending) return;

    const tempId = makeTempId();
    const optimistic = {
      _id: tempId,
      bookingId,
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

      const res = await api.post(`/chat/booking/${bookingId}/upload-image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) setUploadProgress(Math.round((p.loaded / p.total) * 100));
        },
      });

      // Replace temp message AND remove any socket-delivered duplicate
      setMessages((prev) => {
        const realId = res.data.message._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? res.data.message : m));
      });
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

  /* ── Voice send ── */
  async function handleSendVoice() {
    if (!voice.blob || sending) return;

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
      bookingId,
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

      const res = await api.post(`/chat/booking/${bookingId}/upload-voice`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => {
          if (p.total) setUploadProgress(Math.round((p.loaded / p.total) * 100));
        },
      });

      // Replace temp message AND remove any socket-delivered duplicate
      setMessages((prev) => {
        const realId = res.data.message._id;
        const filtered = prev.filter((m) => m._id !== realId || m._id === tempId);
        return filtered.map((m) => (m._id === tempId ? res.data.message : m));
      });
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

  /* ── Retry failed message ── */
  async function handleRetry(failedMsg) {
    // Remove the failed message and re-attempt
    setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));

    if (failedMsg.type === "text") {
      setText(failedMsg.text);
      // User can press send again
    } else {
      toast("Please re-attach and send the media again.");
    }
  }

  /* ── Effects ── */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        const [bookingRes, chatRes] = await Promise.all([
          api.get(`/bookings/${bookingId}`),
          api.get(`/chat/booking/${bookingId}?limit=30`),
        ]);
        if (cancelled) return;
        setBooking(bookingRes.data.booking);
        setMessages(chatRes.data.messages || []);
        setPagination(chatRes.data.pagination || { hasMore: false, nextBefore: null });
        await api.post(`/chat/booking/${bookingId}/read`);
        try { await api.post(`/chat/booking/${bookingId}/read-notifications`); } catch (_) {}
      } catch (err) {
        if (cancelled) return;
        toast.error(err?.response?.data?.message || "Failed to load chat");
        navigate(backRoute);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 0);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [bookingId]);

  useEffect(() => {
    if (!user?._id && !user?.id) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join_booking_chat", { bookingId }));

    socket.on("new_message", async (incoming) => {
      if (String(incoming?.bookingId) !== String(bookingId)) return;

      const mine = String(incoming?.senderId) === selfId;

      // Skip own messages — we already handle them via REST response
      // or socket callback. The server broadcasts to the whole room
      // (including sender), which causes duplicates if we don't skip.
      if (mine) return;

      // Deduplicate: skip if we already have this message
      setMessages((prev) => {
        if (prev.some((m) => m._id === incoming._id)) return prev;
        return [...prev, incoming];
      });

      try { await api.post(`/chat/booking/${bookingId}/read`); } catch (_) {}
      if (isNearBottom) setTimeout(() => scrollToBottom(true), 0);
      else setNewMessageCount((c) => c + 1);
    });

    socket.on("messages_read", ({ bookingId: bid, userId: readerId }) => {
      if (String(bid) !== String(bookingId) || String(readerId) === selfId) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.senderId) === selfId ? { ...m, status: "read" } : m
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("new_message");
      socket.off("messages_read");
      releaseChatSocket();
    };
  }, [bookingId, selfId, isNearBottom, user]);

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

  /* ── Computed flags ── */
  const isRecording = voice.state === "recording";
  const hasVoicePreview = voice.state === "preview";
  const hasVoiceError = voice.state === "error";
  const isMediaActive = !!imagePreview || isRecording || hasVoicePreview || hasVoiceError;

  /* ── Loading ── */
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  /* ──────────── RENDER ──────────── */
  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
        {/* ── Header ── */}
        <div className="flex-shrink-0 mb-3 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button onClick={() => navigate(backRoute)} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Back">
                <HiArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Booking Chat</h1>
                <p className="text-sm text-gray-600">
                  {booking?.serviceId?.title || "Service"} • #{booking?._id?.slice(-6)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Status: {String(booking?.status || "").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {booking?.scheduledAt && (
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {new Date(booking.scheduledAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
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

        {/* ── Messages area ── */}
        <div className="flex-1 flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden min-h-0">
          <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto px-4 py-4">
            {pagination?.hasMore && (
              <div className="mb-4 text-center">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load older messages"}
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
                      <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
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

          {/* ── New messages indicator ── */}
          {!isNearBottom && newMessageCount > 0 && (
            <div className="flex justify-center py-1">
              <button
                onClick={() => { scrollToBottom(true); setNewMessageCount(0); }}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <HiChevronDown className="h-3.5 w-3.5" />
                {newMessageCount} new message{newMessageCount > 1 ? "s" : ""}
              </button>
            </div>
          )}

          {/* ── Upload progress bar ── */}
          {sending && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="px-4">
              <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Image preview tray ── */}
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

          {/* ── Video preview tray ── */}
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

          {/* ── Voice recording / preview tray ── */}
          {isRecording && (
            <div className="border-t bg-red-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
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
                <HiXCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 flex-1">{voice.errorMsg}</p>
                <button onClick={voice.dismissError} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ── Composer ── */}
          {!isMediaActive && (
            <div className="border-t px-3 py-3">
              <div className="flex items-end gap-2">

                {/* Image picker */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                  aria-label="Attach image"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sending}
                  className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition disabled:opacity-40"
                  aria-label="Attach photo"
                  title="Send a photo"
                >
                  <HiPhoto className="h-5 w-5" />
                </button>

                {/* Video picker */}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleVideoSelect}
                  className="hidden"
                  aria-label="Attach video"
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={sending}
                  className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition disabled:opacity-40"
                  aria-label="Attach video"
                  title="Send a video"
                >
                  <HiFilm className="h-5 w-5" />
                </button>

                {/* Voice recorder */}
                <button
                  onClick={voice.start}
                  disabled={sending}
                  className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition disabled:opacity-40"
                  aria-label="Record voice note"
                  title="Record a voice note"
                >
                  <HiMicrophone className="h-5 w-5" />
                </button>

                {/* Text input */}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-24 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                  aria-label="Send message"
                >
                  <HiPaperAirplane className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </Layout>
  );
}
