import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiAdjustmentsVertical, HiMagnifyingGlass } from "react-icons/hi2";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";

export default function ConversationsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, unread, ongoing, completed

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

  // Filter and search conversations
  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const peerMatch =
      conv.peer?.name?.toLowerCase().includes(searchLower) || false;
    const serviceMatch =
      conv.serviceTitle?.toLowerCase().includes(searchLower) || false;

    if (!peerMatch && !serviceMatch) return false;

    // Status filter
    if (filterStatus === "unread") return conv.unreadCount > 0;
    if (filterStatus === "ongoing")
      return ["AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"].includes(conv.bookingStatus);
    if (filterStatus === "completed")
      return ["COMPLETED", "CANCELLED"].includes(conv.bookingStatus);

    return true;
  });

  // Format timestamp
  function formatTime(timestamp) {
    const date = new Date(timestamp);
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
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

          {/* Search and Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <HiMagnifyingGlass className="absolute left-3 top-3 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search by name or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer flex items-center gap-2"
              >
                <option value="all">All Chats</option>
                <option value="unread">Unread Only</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">💬</div>
            <p className="text-gray-600 text-lg font-medium">No conversations yet</p>
            <p className="text-gray-500 mt-2">
              {searchQuery
                ? "No matches found. Try a different search."
                : "When you book a service or receive a booking request, your conversations will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation._id}
                onClick={() => handleOpenChat(conversation)}
                className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    {/* Peer Name and Status Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.peer?.name || "Unknown"}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          conversation.bookingStatus === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : conversation.bookingStatus === "CANCELLED"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {conversation.bookingStatus === "AWAITING_PAYMENT"
                          ? "Awaiting Payment"
                          : conversation.bookingStatus === "IN_PROGRESS"
                            ? "In Progress"
                            : conversation.bookingStatus}
                      </span>
                    </div>

                    {/* Service Title */}
                    <p className="text-sm text-gray-600 mb-1 truncate">
                      {conversation.serviceTitle || "Unknown Service"}
                    </p>

                    {/* Last Message */}
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessageText ||
                        "No messages yet. Start the conversation!"}
                    </p>
                  </div>

                  {/* Time and Unread Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
