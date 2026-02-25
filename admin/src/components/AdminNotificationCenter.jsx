// components/AdminNotificationCenter.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import toast from "react-hot-toast";
import {
  HiBell,
  HiXMark,
  HiCheckCircle,
  HiExclamationTriangle,
  HiUser,
  HiDocumentText,
} from "react-icons/hi2";

/**
 * AdminNotificationCenter Component
 * Displays admin notifications with deep-linking support
 * Real-time polling for new notifications
 */
export default function AdminNotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await api.get("/notifications?limit=20");
      setNotifications(res.data.data || []);
      
      // Count unread notifications
      const unread = (res.data.data || []).filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  async function handleNotificationClick(notification) {
    try {
      // Mark as read
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications(
          notifications.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }

      // Navigate to the target route with params
      if (notification.targetRoute) {
        let route = notification.targetRoute;

        // Replace dynamic params like :bookingId with actual values
        if (notification.targetRouteParams) {
          const params = notification.targetRouteParams;
          for (const [key, value] of Object.entries(params)) {
            route = route.replace(`:${key}`, value);
          }
        }

        navigate(route);
        setIsOpen(false);
      } else {
        // Default navigation based on notification type
        handleDefaultNavigation(notification);
      }
    } catch (err) {
      console.error("Error handling notification:", err);
      toast.error("Failed to process notification");
    }
  }

  function handleDefaultNavigation(notification) {
    const type = notification.type;
    setIsOpen(false);

    // Map notification types to admin routes
    if (type.includes("verification") || type.includes("provider")) {
      navigate("/verification");
    } else if (type.includes("dispute")) {
      navigate("/disputes");
    } else if (type.includes("booking")) {
      navigate("/bookings");
    } else if (type.includes("payment")) {
      navigate("/payments");
    } else if (type.includes("review")) {
      navigate("/reviews");
    } else if (type.includes("user")) {
      navigate("/users");
    } else {
      navigate("/dashboard");
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.patch("/notifications/mark-all-read");
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  }

  async function handleClearNotification(notificationId, e) {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      toast.success("Notification cleared");
    } catch (err) {
      console.error("Error clearing notification:", err);
    }
  }

  function getNotificationIcon(type) {
    if (type.includes("approved") || type.includes("accepted")) {
      return <HiCheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (type.includes("rejected") || type.includes("cancelled")) {
      return <HiExclamationTriangle className="w-5 h-5 text-red-600" />;
    }
    if (type.includes("verification") || type.includes("provider")) {
      return <HiUser className="w-5 h-5 text-blue-600" />;
    }
    if (type.includes("dispute") || type.includes("report")) {
      return <HiExclamationTriangle className="w-5 h-5 text-orange-600" />;
    }
    if (type.includes("booking")) {
      return <HiDocumentText className="w-5 h-5 text-purple-600" />;
    }
    return <HiBell className="w-5 h-5 text-blue-600" />;
  }

  function getNotificationColor(type) {
    if (type.includes("approved") || type.includes("accepted")) return "bg-green-50";
    if (type.includes("rejected") || type.includes("cancelled")) return "bg-red-50";
    if (type.includes("warning") || type.includes("pending") || type.includes("dispute")) return "bg-orange-50";
    if (type.includes("verification")) return "bg-blue-50";
    return "bg-gray-50";
  }

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <HiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 max-h-[32rem] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
              <h3 className="font-semibold text-gray-900">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <HiBell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm mt-1">You'll see important updates here</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 border-b hover:brightness-95 transition ${
                      !notification.isRead ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    } ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full mt-1.5"></div>
                      )}

                      {/* Clear Button */}
                      <button
                        onClick={(e) => handleClearNotification(notification._id, e)}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        <HiXMark className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 flex gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="flex-1 text-sm py-2 text-center text-emerald-600 hover:bg-white rounded-lg transition font-medium"
                  disabled={unreadCount === 0}
                >
                  Mark All Read
                </button>
              </div>
            )}
          </div>

          {/* Click outside to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
        </>
      )}
    </div>
  );
}

/**
 * Format notification creation time
 */
function formatTime(dateString) {
  const now = new Date();
  const notificationTime = new Date(dateString);
  const diffMs = now - notificationTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return notificationTime.toLocaleDateString();
}
