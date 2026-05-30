import { useEffect, useMemo, useState } from "react";
import api from "../utils/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  HiBell,
  HiCheckCircle,
  HiExclamationTriangle,
  HiMagnifyingGlass,
} from "react-icons/hi2";

export default function AdminNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);

      const res = await api.get("/notifications?limit=500");

      setNotifications(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? {
                ...n,
                isRead: true,
              }
            : n
        )
      );
    } catch {
      toast.error("Failed to mark notification");
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/mark-all-read");

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
        }))
      );

      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed");
    }
  }

  async function deleteNotification(id) {
    try {
      await api.delete(`/notifications/${id}`);

      setNotifications((prev) =>
        prev.filter((n) => n._id !== id)
      );

      toast.success("Notification deleted");
    } catch {
      toast.error("Failed");
    }
  }

  function handleNavigate(notification) {
    const type = notification.type?.toLowerCase() || "";

    if (type.includes("verification"))
      return navigate("/verification");

    if (type.includes("skill"))
      return navigate("/skill-reviews");

    if (type.includes("dispute"))
      return navigate("/disputes");

    if (type.includes("refund"))
      return navigate("/payments");

    if (type.includes("payment"))
      return navigate("/payments");

    if (type.includes("booking"))
      return navigate("/bookings");

    if (type.includes("category"))
      return navigate("/category-requests");

    navigate("/dashboard");
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        notification.title
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        notification.message
          ?.toLowerCase()
          .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      switch (filter) {
        case "unread":
          return !notification.isRead;

        case "read":
          return notification.isRead;

        case "verification":
          return notification.type?.includes("verification");

        case "skill":
          return notification.type?.includes("skill");

        case "dispute":
          return notification.type?.includes("dispute");

        case "refund":
          return notification.type?.includes("refund");

        case "booking":
          return notification.type?.includes("booking");

        case "payment":
          return notification.type?.includes("payment");

        case "category":
          return notification.type?.includes("category");

        default:
          return true;
      }
    });
  }, [notifications, search, filter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Notifications
            </h1>

            <p className="text-sm text-gray-500">
              Manage all admin notifications
            </p>
          </div>

          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Mark All Read
          </button>
        </div>

        <div className="mt-5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <HiMagnifyingGlass className="absolute left-3 top-3 text-gray-400 w-5 h-5" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full border rounded-lg pl-10 pr-4 py-2"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="verification">Provider Verification</option>
            <option value="skill">Skill Verification</option>
            <option value="dispute">Disputes</option>
            <option value="refund">Refunds</option>
            <option value="booking">Bookings</option>
            <option value="payment">Payments</option>
            <option value="category">Category Requests</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No notifications found
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`border-b p-5 hover:bg-gray-50 ${
                !notification.isRead
                  ? "bg-blue-50"
                  : ""
              }`}
            >
              <div className="flex justify-between gap-4">
                <div
                  className="flex gap-4 flex-1 cursor-pointer"
                  onClick={() => handleNavigate(notification)}
                >
                  <div>
                    {!notification.isRead ? (
                      <HiBell className="w-6 h-6 text-blue-600" />
                    ) : (
                      <HiCheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {notification.title}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>

                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(
                        notification.createdAt
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!notification.isRead && (
                    <button
                      onClick={() =>
                        markAsRead(notification._id)
                      }
                      className="text-emerald-600 text-sm"
                    >
                      Read
                    </button>
                  )}

                  <button
                    onClick={() =>
                      deleteNotification(notification._id)
                    }
                    className="text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}