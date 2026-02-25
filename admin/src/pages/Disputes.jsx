import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiExclamationTriangle, HiCheckCircle } from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function Disputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter, categoryFilter]);

  async function fetchDisputes() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);

      const res = await api.get(`/disputes?${params}`);
      setDisputes(res.data.disputes || []);
      setStats(res.data.stats || {});
    } catch (err) {
      console.error("Failed to load disputes:", err);
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }

  const categoryLabels = {
    service_quality: "Service quality issue",
    payment_issue: "Payment issue",
    provider_behaviour: "Provider behaviour concern",
    safety_concern: "Safety concern",
    other: "Other",
  };

  const statusBadges = {
    opened: "bg-red-50 text-red-700",
    under_review: "bg-blue-50 text-blue-700",
    resolved: "bg-green-50 text-green-700",
    rejected: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
          <p className="mt-2 text-gray-600">Review and resolve service disputes</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Disputes"
            value={stats.totalDisputes || 0}
            icon={<HiExclamationTriangle className="h-5 w-5" />}
            color="bg-gray-50"
          />
          <StatCard
            label="Open"
            value={stats.openCount || 0}
            icon={<HiExclamationTriangle className="h-5 w-5 text-red-500" />}
            color="bg-red-50"
          />
          <StatCard
            label="Under Review"
            value={stats.underReviewCount || 0}
            icon={<HiExclamationTriangle className="h-5 w-5 text-blue-500" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Resolved"
            value={stats.resolvedCount || 0}
            icon={<HiCheckCircle className="h-5 w-5 text-green-500" />}
            color="bg-green-50"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="opened">Opened</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="service_quality">Service quality issue</option>
              <option value="payment_issue">Payment issue</option>
              <option value="provider_behaviour">Provider behaviour concern</option>
              <option value="safety_concern">Safety concern</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchDisputes}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Disputes Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-600"></div>
              <p className="mt-2">Loading disputes...</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <HiExclamationTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No disputes found</p>
            </div>
          ) : (
            <table className="w-full bg-white">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Booking</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Raised By</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Requested Info</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {disputes.map((dispute) => (
                  <tr key={dispute._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-mono text-gray-900">{dispute._id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {(dispute.bookingId?._id || dispute.bookingId).toString().slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-700">
                        {dispute.raisedByRole}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {categoryLabels[dispute.category] || dispute.category}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadges[dispute.status] || "bg-gray-50 text-gray-700"}`}>
                        {dispute.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {dispute.requestedInfo && dispute.requestedInfo.length > 0 ? (
                        <span className="inline-block rounded-full bg-yellow-50 px-3 py-1 text-xs text-yellow-700">
                          {dispute.requestedInfo.length} item{dispute.requestedInfo.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/disputes/${dispute._id}`)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Review
                        <HiArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`rounded-lg border border-gray-200 ${color} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>
    </div>
  );
}

