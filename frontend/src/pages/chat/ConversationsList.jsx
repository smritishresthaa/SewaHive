// PeerAvatar utility
function getPeerAvatarUrl(conversation) {
  return (
    conversation?.peer?.avatarUrl ||
    conversation?.peer?.avatar ||
    conversation?.peer?.profile?.avatarUrl ||
    conversation?.peerAvatar ||
    null
  );
}

function getInitials(name = "Unknown") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PeerAvatar({ conversation, className = "h-11 w-11" }) {
  const [imageError, setImageError] = useState(false);
  const name = conversation?.peer?.name || "Unknown";
  const avatarUrl = getPeerAvatarUrl(conversation);

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${className} rounded-full object-cover`}
        onError={() => setImageError(true)}
      />
    );
  }
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-sm font-semibold flex items-center justify-center`}>
      {getInitials(name)}
    </div>
  );
}
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  CircleAlert,
  Clock3,
  CheckCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";

function normalizeStatus(status = "") {
  const value = String(status || "").trim();
  return value.toUpperCase();
}

function getStatusMeta(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "AWAITING_PAYMENT") {
    return {
      label: "Awaiting Payment",
      badgeCls: "bg-amber-100 text-amber-700",
    };
  }
  if (normalized === "CONFIRMED") {
    return {
      label: "Confirmed",
      badgeCls: "bg-indigo-100 text-indigo-700",
    };
  }
  if (normalized === "IN_PROGRESS" || normalized === "IN-PROGRESS") {
    return {
      label: "In Progress",
      badgeCls: "bg-blue-100 text-blue-700",
    };
  }
  if (normalized === "PROVIDER_EN_ROUTE" || normalized === "PROVIDER-EN-ROUTE") {
    return {
      label: "Provider En Route",
      badgeCls: "bg-cyan-100 text-cyan-700",
    };
  }
  if (normalized === "COMPLETED") {
    return {
      label: "Completed",
      badgeCls: "bg-emerald-100 text-emerald-700",
    };
  }
  if (normalized === "CANCELLED") {
    return {
      label: "Cancelled",
      badgeCls: "bg-gray-100 text-gray-700",
    };
  }

  const fallback = valueToLabel(status);
  return {
    label: fallback,
    badgeCls: "bg-slate-100 text-slate-700",
  };
}

function valueToLabel(value = "") {
  return String(value || "Unknown")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(timestamp) {
  if (!timestamp) return "—";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ConversationItem({ conversation, active, onSelect, onOpen }) {
  const statusMeta = getStatusMeta(conversation.bookingStatus);
  const unreadCount = conversation.unreadCount || 0;
  const navigate = useNavigate();
  const { user } = useAuth();
  function handleOpenChat() {
    const bookingId = conversation.bookingId || conversation._id;
    const route = user?.role === "client"
      ? `/client/bookings/${bookingId}/chat`
      : `/provider/bookings/${bookingId}/chat`;
    navigate(route);
  }
  return (
    <motion.button
      layout
      type="button"
      onClick={handleOpenChat}
      whileHover={{ y: -1 }}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
        active
          ? "bg-blue-50 border-blue-200 shadow-sm"
          : "bg-white border-gray-200 hover:border-blue-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <PeerAvatar conversation={conversation} className="h-11 w-11" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 h-5 min-w-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-gray-900">
              {conversation.peer?.name || "Unknown"}
            </p>
            <span className="text-xs text-gray-500 shrink-0">
              {formatTime(conversation.lastMessageAt)}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.badgeCls}`}
            >
              {statusMeta.label}
            </span>
            <p className="truncate text-xs text-gray-500">
              {conversation.serviceTitle || "Unknown Service"}
            </p>
          </div>

          <p className="mt-2 text-sm text-gray-600 truncate">
            {conversation.lastMessageText || "No messages yet. Start the conversation!"}
          </p>

          <div className="mt-3 md:hidden">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenChat();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Open chat <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
      <p className="mt-4 text-lg font-semibold text-gray-800">No conversations found</p>
      <p className="mt-2 text-sm text-gray-500">
        {hasSearch
          ? "No matches found. Try a different keyword or status filter."
          : "Your conversation threads will appear here when chats start."}
      </p>
    </div>
  );
}

function ConversationDetail({ conversation, onOpen }) {
  if (!conversation) {
    return (
      <div className="hidden md:flex rounded-2xl border border-gray-200 bg-white p-8 min-h-[520px] items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-base font-semibold text-gray-800">Select a conversation</p>
          <p className="mt-1 text-sm text-gray-500">Pick a user from the left panel to preview details.</p>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(conversation.bookingStatus);

  // ...existing code...
}

export default function ConversationsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, unread, ongoing, completed
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  // Fetch conversations list
  async function fetchConversations() {
    try {
      setLoading(true);
      const res = await api.get("/chat/conversations");
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const searchLower = searchQuery.toLowerCase();
      const peerMatch =
        conv.peer?.name?.toLowerCase().includes(searchLower) || false;
      const serviceMatch =
        conv.serviceTitle?.toLowerCase().includes(searchLower) || false;

      if (!peerMatch && !serviceMatch) return false;

      const normalizedStatus = normalizeStatus(conv.bookingStatus);
      if (filterStatus === "unread") return conv.unreadCount > 0;
      if (filterStatus === "ongoing") {
        return ["AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS", "IN-PROGRESS", "PROVIDER_EN_ROUTE", "PROVIDER-EN-ROUTE"].includes(
          normalizedStatus
        );
      }
      if (filterStatus === "completed") {
        return ["COMPLETED", "CANCELLED"].includes(normalizedStatus);
      }

      return true;
    });
  }, [conversations, searchQuery, filterStatus]);

  const selectedConversation = useMemo(() => {
    if (!filteredConversations.length) return null;

    const byId = filteredConversations.find((conv) => conv._id === selectedConversationId);
    return byId || filteredConversations[0];
  }, [filteredConversations, selectedConversationId]);

  useEffect(() => {
    if (!filteredConversations.length) {
      setSelectedConversationId(null);
      return;
    }

    const stillExists = filteredConversations.some((conv) => conv._id === selectedConversationId);
    if (!stillExists) {
      setSelectedConversationId(filteredConversations[0]._id);
    }
  }, [filteredConversations, selectedConversationId]);

  // Navigate to chat
  function handleOpenChat(conversation) {
    navigate(conversation.route, {
      state: { conversationId: conversation._id },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-11 w-11 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="mt-1 text-sm text-gray-500">
                Stay connected with your {user?.role === "provider" ? "clients" : "providers"}.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4" />
              {filteredConversations.length} chats
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                placeholder="Search by name or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 transition-all duration-150 hover:bg-gray-100 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            <div className="relative sm:w-[170px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3.5 pr-11 text-sm text-gray-700 transition-all duration-150 hover:bg-gray-100 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              >
                <option value="all">All Chats</option>
                <option value="unread">Unread Only</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <AnimatePresence>
              {filteredConversations.length === 0 ? (
                <EmptyState hasSearch={!!searchQuery} />
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    active={selectedConversationId === conversation._id}
                    onSelect={() => setSelectedConversationId(conversation._id)}
                    onOpen={handleOpenChat}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
