import { useState, useEffect, useRef } from "react";
import { HiBell, HiXMark, HiCheck } from "react-icons/hi2";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications
  async function fetchNotifications() {
    try {
      const res = await api.get("/notifications?limit=10");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification as read
  async function markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      fetchNotifications(); // Refresh
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }

  // Mark all as read
  async function markAllAsRead() {
    setLoading(true);
    try {
      await api.patch("/notifications/mark-all-read");
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle notification click
  function handleNotificationClick(notification) {
    markAsRead(notification._id);
    setShowDropdown(false);

    // Chat messages: navigate directly to chat thread
    if (notification.type === "chat_message" && notification.bookingId) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const isProvider = user?.role === "provider" || window.location.pathname.includes("/provider");
      const path = isProvider
        ? `/provider/bookings/${notification.bookingId}/chat`
        : `/client/bookings/${notification.bookingId}/chat`;
      navigate(path);
      return;
    }

    // Other booking notifications: navigate to booking detail
    if (notification.bookingId) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const isProvider = user?.role === "provider" || window.location.pathname.includes("/provider");
      const path = isProvider
        ? `/provider/bookings/${notification.bookingId}`
        : `/client/bookings/${notification.bookingId}`;
      navigate(path);
      return;
    }
  }
  // Handle View All button
  function handleViewAll() {
    navigate("/notifications");
    setShowDropdown(false);
  }
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <HiBell className="text-2xl text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <HiBell className="text-4xl mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notif.isRead ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.isRead ? "bg-gray-300" : "bg-emerald-500"
                        }`}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 mb-1">
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>

                      {/* Mark as read button */}
                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif._id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                          title="Mark as read"
                        >
                          <HiCheck className="text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: View All Button */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleViewAll}
              className="w-full py-2 px-4 text-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
