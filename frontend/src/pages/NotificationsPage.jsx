import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/axios";
import toast from "react-hot-toast";
import {
  HiBell,
  HiXMark,
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiTrash,
  HiArrowRight,
  HiFunnel,
  HiArrowUturnLeft,
  HiMagnifyingGlass,
  HiEnvelope,
  HiEnvelopeOpen,
} from "react-icons/hi2";

/**
 * NotificationsPage Component (Gmail-Style)
 * Full page view for all user notifications with:
 * - Search functionality
 * - Sorting (newest/oldest)
 * - Filtering (all/unread/read)
 * - Bulk actions (select multiple, mark as read, delete)
 * - Category filtering
 * - Pagination
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Management
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest
  const [filterType, setFilterType] = useState("all"); // all, unread, read
  const [filterCategory, setFilterCategory] = useState("all"); // all, booking, payment, review, dispute, verification
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]); // For bulk actions
  const itemsPerPage = 15;

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Real-time notifications via SSE
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    let source;
    let retryTimer;

    const connect = () => {
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === "notification") {
            fetchNotifications();
          }
        } catch {
          fetchNotifications();
        }
      };
      source.onerror = () => {
        source.close();
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      if (source) source.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Apply filters and sorting whenever data changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [notifications, sortBy, filterType, filterCategory, searchQuery]);

  /**
   * Fetch all notifications from API
   */
  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await api.get("/notifications?limit=100");
      setNotifications(res.data.data || []);
    } catch (err) {
      console.log("Notifications endpoint not available yet:", err.message);
      // Set empty array instead of showing error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Apply filters and sorting to notifications
   */
  function applyFiltersAndSort() {
    let filtered = [...notifications];

    // Filter by read status
    if (filterType === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filterType === "read") {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter((n) => n.category === filterCategory);
    }

    // Filter by search query (title, message)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query) ||
          n.type?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredNotifications(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }

  /**
   * Mark notification as read and optionally navigate
   */
  async function handleMarkAsRead(notification) {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
        // Update local state
        setNotifications(
          notifications.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        toast.success("Marked as read");
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
      toast.error("Failed to update notification");
    }
  }

  /**
   * Navigate to relevant page based on notification type
   */
  function handleNavigate(notification) {
    handleMarkAsRead(notification);

    if (notification.targetRoute) {
      let route = notification.targetRoute;
      // Replace dynamic parameters
      if (notification.targetRouteParams) {
        Object.entries(notification.targetRouteParams).forEach(
          ([key, value]) => {
            route = route.replace(`:${key}`, value);
          }
        );
      }
      navigate(route);
    }
  }

  /**
   * Delete a notification
   */
  async function handleDelete(notificationId) {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
    }
  }

  /**
   * Mark all notifications as read
   */
  async function handleMarkAllAsRead() {
    try {
      const unreadIds = notifications
        .filter((n) => !n.isRead)
        .map((n) => n._id);

      if (unreadIds.length === 0) {
        toast.info("All notifications already read");
        return;
      }

      // Mark each as read
      await Promise.all(
        unreadIds.map((id) => api.patch(`/notifications/${id}/read`))
      );

      // Update local state
      setNotifications(
        notifications.map((n) => ({ ...n, isRead: true }))
      );
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Failed to update notifications");
    }
  }

  /**
   * Bulk Actions - Mark selected as read
   */
  async function handleBulkMarkAsRead() {
    if (selectedIds.length === 0) {
      toast.error("No notifications selected");
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => api.patch(`/notifications/${id}/read`))
      );

      setNotifications(
        notifications.map((n) =>
          selectedIds.includes(n._id) ? { ...n, isRead: true } : n
        )
      );
      setSelectedIds([]);
      toast.success(`${selectedIds.length} notifications marked as read`);
    } catch (err) {
      console.error("Failed to mark selected as read:", err);
      toast.error("Failed to update notifications");
    }
  }

  /**
   * Bulk Actions - Delete selected
   */
  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      toast.error("No notifications selected");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected notifications?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`/notifications/${id}`))
      );

      setNotifications(
        notifications.filter((n) => !selectedIds.includes(n._id))
      );
      setSelectedIds([]);
      toast.success(`${selectedIds.length} notifications deleted`);
    } catch (err) {
      console.error("Failed to delete selected:", err);
      toast.error("Failed to delete notifications");
    }
  }

  /**
   * Toggle selection of a notification
   */
  function toggleSelection(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  /**
   * Select all visible notifications
   */
  function handleSelectAll() {
    if (selectedIds.length === paginatedNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedNotifications.map((n) => n._id));
    }
  }

  /**
   * Clear all notifications
   */
  async function handleClearAll() {
    if (!window.confirm("Are you sure you want to delete all notifications?")) {
      return;
    }

    try {
      // Delete all notifications
      await Promise.all(
        notifications.map((n) => api.delete(`/notifications/${n._id}`))
      );
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      toast.error("Failed to clear notifications");
    }
  }

  /**
   * Get notification icon and color based on type
   */
  function getNotificationIcon(type) {
    const baseClasses = "h-5 w-5";
    const iconProps = { className: baseClasses };

    switch (type) {
      case "booking_confirmed":
      case "quote_approved":
      case "verification_approved":
      case "payment_confirmed":
        return <HiCheckCircle {...iconProps} className={`${baseClasses} text-green-500`} />;
      case "booking_cancelled":
      case "quote_rejected":
      case "verification_rejected":
      case "dispute_created":
        return <HiExclamationTriangle {...iconProps} className={`${baseClasses} text-red-500`} />;
      default:
        return <HiInformationCircle {...iconProps} className={`${baseClasses} text-blue-500`} />;
    }
  }

  /**
   * Get background color class based on type
   */
  function getTypeColorClass(type) {
    switch (type) {
      case "booking_confirmed":
      case "quote_approved":
      case "verification_approved":
      case "payment_confirmed":
        return "bg-green-50 border-green-200";
      case "booking_cancelled":
      case "quote_rejected":
      case "verification_rejected":
      case "dispute_created":
        return "bg-red-50 border-red-200";
      case "quote_requested":
      case "quote_sent":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  }

  /**
   * Format time relative to now
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  }

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const allSelected = paginatedNotifications.length > 0 && selectedIds.length === paginatedNotifications.length;

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <HiBell className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  All Notifications
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredNotifications.length} total
                  {unreadCount > 0 && ` • ${unreadCount} unread`}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium flex items-center gap-2 justify-center"
                >
                  <HiEnvelopeOpen className="h-4 w-4" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2 justify-center"
                >
                  <HiTrash className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search - Gmail Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-5">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiMagnifyingGlass className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search notifications by title or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter and Sort Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filter by status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HiEnvelope className="h-4 w-4 text-gray-500" />
                Status
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread only</option>
                <option value="read">Read only</option>
              </select>
            </div>

            {/* Filter by category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HiFunnel className="h-4 w-4 text-gray-500" />
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">All categories</option>
                <option value="booking">Bookings</option>
                <option value="payment">Payments</option>
                <option value="review">Reviews</option>
                <option value="dispute">Disputes</option>
                <option value="verification">Verification</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Toolbar - Gmail Style */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
              <HiCheckCircle className="h-5 w-5" />
              <span>{selectedIds.length} selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMarkAsRead}
                className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-100 transition text-sm font-medium flex items-center gap-2"
              >
                <HiEnvelopeOpen className="h-4 w-4" />
                Mark as read
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
              >
                <HiTrash className="h-4 w-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        ) : paginatedNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <HiBell className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? "No notifications found" : "No notifications yet"}
            </h3>
            <p className="text-gray-500 mb-8">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "You'll receive notifications for bookings, reviews, and updates"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate(user?.role === "provider" ? "/provider/services" : "/services")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
              >
                {user?.role === "provider" ? "Manage Services" : "Browse Services"}
                <HiArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Select All Header - Gmail Style */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">
                {allSelected ? `All ${paginatedNotifications.length} selected` : "Select all"}
              </span>
            </div>

            {/* Notification Items */}
            {paginatedNotifications.map((notification, index) => (
              <div
                key={notification._id}
                className={`flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  !notification.isRead ? "bg-emerald-50/30" : ""
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(notification._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelection(notification._id);
                  }}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer mt-1"
                />

                {/* Read/Unread Indicator */}
                <div className="flex-shrink-0 mt-1">
                  {!notification.isRead ? (
                    <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full" title="Unread" />
                  ) : (
                    <HiEnvelopeOpen className="h-4 w-4 text-gray-400" title="Read" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div
                  className="flex-grow min-w-0"
                  onClick={() => setSelectedNotification(notification)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1.5">
                    <h3 className={`text-sm flex items-center gap-2 ${
                      !notification.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"
                    }`}>
                      {notification.title}
                      {notification.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {notification.category}
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-2 line-clamp-2 ${
                    !notification.isRead ? "text-gray-900" : "text-gray-600"
                  }`}>
                    {notification.message}
                  </p>

                  {notification.targetRoute && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(notification);
                      }}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition font-medium"
                    >
                      View Details <HiArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification);
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Mark as read"
                    >
                      <HiEnvelopeOpen className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} of{" "}
              {filteredNotifications.length} notifications
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-emerald-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedNotification(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      {getNotificationIcon(selectedNotification.type)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedNotification.title}
                      </h2>
                      {selectedNotification.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {selectedNotification.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition"
                  >
                    <HiXMark className="h-6 w-6" />
                  </button>
                </div>

                {/* Message */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Metadata */}
                <div className="bg-emerald-50 rounded-lg p-3 mb-4 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedNotification.isRead 
                        ? "bg-gray-100 text-gray-700" 
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {selectedNotification.isRead ? "Read" : "Unread"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="font-medium">Received:</span>
                    <span>{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedNotification.targetRoute && (
                    <button
                      onClick={() => {
                        handleNavigate(selectedNotification);
                        setSelectedNotification(null);
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <HiArrowRight className="h-5 w-5" />
                      View Details
                    </button>
                  )}
                  {!selectedNotification.isRead && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(selectedNotification);
                        setSelectedNotification(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition font-medium flex items-center justify-center gap-2"
                    >
                      <HiEnvelopeOpen className="h-5 w-5" />
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDelete(selectedNotification._id);
                      setSelectedNotification(null);
                    }}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <HiTrash className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
