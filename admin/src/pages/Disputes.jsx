import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiArrowRight, HiExclamationTriangle, HiCheckCircle,
  HiArrowPath, HiExclamationCircle, HiMagnifyingGlass,
} from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function Disputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => { fetchDisputes(); }, [statusFilter, categoryFilter]);

  async function fetchDisputes() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      const res = await api.get(`/disputes?${params}`);
      setDisputes(res.data.disputes || []);
      setStats(res.data.stats || {});
    } catch (err) { console.error("Failed to load disputes:", err); toast.error("Failed to load disputes"); }
    finally { setLoading(false); }
  }

  const categoryLabels = {
    service_quality: "Service quality",
    payment_issue: "Payment issue",
    provider_behaviour: "Provider behaviour",
    safety_concern: "Safety concern",
    other: "Other",
  };

  const statusBadges = {
    opened: "bg-red-50 text-red-700 ring-red-200",
    under_review: "bg-blue-50 text-blue-700 ring-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-gray-50 text-gray-600 ring-gray-200",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dispute Resolution</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Review and resolve service disputes</p>
        </div>
        <button onClick={fetchDisputes} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Refresh">
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.totalDisputes || 0, Icon: HiExclamationTriangle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-400' },
          { label: 'Open', value: stats.openCount || 0, Icon: HiExclamationCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' },
          { label: 'Under Review', value: stats.underReviewCount || 0, Icon: HiMagnifyingGlass, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
          { label: 'Resolved', value: stats.resolvedCount || 0, Icon: HiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow`}>
            <div className={`${kpi.bg} rounded-full p-2`}><kpi.Icon className={`w-5 h-5 ${kpi.color}`} /></div>
            <div>
              <p className="text-[10px] text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="all">All Status</option>
              <option value="opened">Opened</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="all">All Categories</option>
              <option value="service_quality">Service quality</option>
              <option value="payment_issue">Payment issue</option>
              <option value="provider_behaviour">Provider behaviour</option>
              <option value="safety_concern">Safety concern</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-12 text-center">
            <HiExclamationTriangle className="mx-auto w-8 h-8 text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">No disputes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-2.5">ID</th>
                  <th className="px-5 py-2.5">Booking</th>
                  <th className="px-5 py-2.5">Raised By</th>
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Info</th>
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute._id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                    <td className="px-5 py-2.5 font-mono text-gray-700">{dispute._id.slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-2.5 text-gray-700">{(dispute.bookingId?._id || dispute.bookingId).toString().slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-50 text-[11px] font-semibold text-gray-600 capitalize ring-1 ring-inset ring-gray-200">{dispute.raisedByRole}</span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-700">{categoryLabels[dispute.category] || dispute.category}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ring-1 ring-inset ${statusBadges[dispute.status] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
                        {dispute.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      {dispute.requestedInfo?.length > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          {dispute.requestedInfo.length} item{dispute.requestedInfo.length > 1 ? "s" : ""}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{new Date(dispute.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-2.5 text-center">
                      <button onClick={() => navigate(`/admin/disputes/${dispute._id}`)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                        Review <HiArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

