import { useEffect, useState } from "react";
import {
  HiArrowPath,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiClock,
  HiExclamationTriangle,
  HiMagnifyingGlass,
  HiXMark,
  HiPaperAirplane,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import api from "../utils/axios";

const statusStyles = {
  open: "bg-red-50 text-red-700 ring-red-200",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-gray-50 text-gray-700 ring-gray-200",
};

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    closedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  async function fetchTickets() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api.get(`/admin/support?${params.toString()}`);

      setTickets(Array.isArray(res?.data?.tickets) ? res.data.tickets : []);
      setStats(
        res?.data?.stats || {
          totalTickets: 0,
          openCount: 0,
          inProgressCount: 0,
          resolvedCount: 0,
          closedCount: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load support tickets:", err);
      setError(
        err?.response?.data?.message || "Failed to load support tickets."
      );
      setTickets([]);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    fetchTickets();
  }

  async function openTicket(ticketId) {
    try {
      setDrawerOpen(true);
      setDetailLoading(true);
      setReplyMessage("");

      const res = await api.get(`/admin/support/${ticketId}`);
      setSelectedTicket(res?.data?.ticket || null);
    } catch (err) {
      console.error("Failed to load ticket details:", err);
      toast.error(err?.response?.data?.message || "Failed to load ticket details");
      setDrawerOpen(false);
      setSelectedTicket(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateTicketStatus(nextStatus) {
    if (!selectedTicket?._id) return;

    try {
      setStatusUpdating(true);

      const res = await api.patch(`/admin/support/${selectedTicket._id}/status`, {
        status: nextStatus,
      });

      setSelectedTicket(res?.data?.ticket || selectedTicket);
      toast.success("Ticket status updated");
      fetchTickets();
    } catch (err) {
      console.error("Failed to update ticket status:", err);
      toast.error(err?.response?.data?.message || "Failed to update ticket status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function sendReply() {
    if (!selectedTicket?._id) return;

    const message = replyMessage.trim();
    if (!message) {
      toast.error("Please write a reply first");
      return;
    }

    try {
      setReplySending(true);

      const res = await api.post(`/admin/support/${selectedTicket._id}/reply`, {
        message,
      });

      setSelectedTicket(res?.data?.ticket || selectedTicket);
      setReplyMessage("");

      if (res?.data?.mail?.emailSent) {
        toast.success("Reply sent and emailed successfully");
      } else {
        toast.success("Reply saved successfully");
      }

      fetchTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
      toast.error(err?.response?.data?.message || "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedTicket(null);
    setReplyMessage("");
  }

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleString();
  }

  function getStatusBadge(status) {
    const cls =
      statusStyles[status] || "bg-gray-50 text-gray-700 ring-gray-200";

    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ring-1 ring-inset ${cls}`}
      >
        {String(status || "unknown").replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Review help requests and reply from the admin panel
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Refresh"
        >
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-100">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            label: "Total",
            value: stats.totalTickets || 0,
            icon: <HiChatBubbleLeftRight className="w-5 h-5 text-gray-600" />,
            bg: "bg-gray-50",
            border: "border-gray-400",
          },
          {
            label: "Open",
            value: stats.openCount || 0,
            icon: <HiExclamationTriangle className="w-5 h-5 text-red-600" />,
            bg: "bg-red-50",
            border: "border-red-500",
          },
          {
            label: "In Progress",
            value: stats.inProgressCount || 0,
            icon: <HiClock className="w-5 h-5 text-blue-600" />,
            bg: "bg-blue-50",
            border: "border-blue-500",
          },
          {
            label: "Resolved",
            value: stats.resolvedCount || 0,
            icon: <HiCheckCircle className="w-5 h-5 text-emerald-600" />,
            bg: "bg-emerald-50",
            border: "border-emerald-500",
          },
          {
            label: "Closed",
            value: stats.closedCount || 0,
            icon: <HiClock className="w-5 h-5 text-gray-600" />,
            bg: "bg-gray-50",
            border: "border-gray-500",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${item.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow`}
          >
            <div className={`${item.bg} rounded-full p-2`}>{item.icon}</div>
            <div>
              <p className="text-[10px] text-gray-500">{item.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Search
            </label>
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Reference, name, email, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
          >
            Search
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <p className="text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">{tickets.length}</span>{" "}
            ticket{tickets.length !== 1 ? "s" : ""}
          </p>

          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTimeout(() => fetchTickets(), 0);
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center">
            <HiChatBubbleLeftRight className="mx-auto w-8 h-8 text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">No support tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[820px]">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-2.5">Ref</th>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Email</th>
                  <th className="px-5 py-2.5">Subject</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Replies</th>
                  <th className="px-5 py-2.5">Created</th>
                  <th className="px-5 py-2.5 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 transition"
                  >
                    <td className="px-5 py-2.5 font-mono text-gray-700 whitespace-nowrap">
                      {ticket.ticketRef || ticket._id?.slice(-6)?.toUpperCase()}
                    </td>
                    <td className="px-5 py-2.5 text-gray-700 whitespace-nowrap">
                      {ticket.name}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                      {ticket.email}
                    </td>
                    <td className="px-5 py-2.5 text-gray-700 max-w-[260px] truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-5 py-2.5">{getStatusBadge(ticket.status)}</td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {ticket.responses?.length || 0}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <button
                        onClick={() => openTicket(ticket._id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />

          <div className="fixed right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Support Ticket</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and respond from admin panel
                  </p>
                </div>

                <button
                  onClick={closeDrawer}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              {detailLoading || !selectedTicket ? (
                <div className="py-12 text-center">
                  <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Reference</p>
                        <p className="font-semibold text-gray-900">
                          {selectedTicket.ticketRef}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">Status</p>
                        <div className="mt-1">
                          {getStatusBadge(selectedTicket.status)}
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">Name</p>
                        <p className="font-medium text-gray-900">
                          {selectedTicket.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">Email</p>
                        <p className="font-medium text-gray-900 break-all">
                          {selectedTicket.email}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-gray-500 text-xs">Subject</p>
                        <p className="font-medium text-gray-900">
                          {selectedTicket.subject}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-gray-500 text-xs">Submitted</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(selectedTicket.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Original Message
                    </h3>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {selectedTicket.message}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Ticket Status
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {["open", "in_progress", "resolved", "closed"].map((status) => (
                        <button
                          key={status}
                          disabled={statusUpdating}
                          onClick={() => updateTicketStatus(status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedTicket.status === status
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {status.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Responses
                    </h3>

                    {selectedTicket.responses?.length ? (
                      <div className="space-y-3">
                        {selectedTicket.responses.map((response) => (
                          <div
                            key={response._id}
                            className="rounded-xl border border-gray-100 p-3 bg-gray-50"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 capitalize">
                                {response.sender}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {formatDate(response.sentAt)}
                              </span>
                              {response.emailSent && (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                  Emailed
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {response.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No replies yet</p>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Reply
                    </h3>

                    <textarea
                      rows={6}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Write your response here..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                    />

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={sendReply}
                        disabled={replySending}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
                      >
                        <HiPaperAirplane className="w-4 h-4" />
                        {replySending ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}