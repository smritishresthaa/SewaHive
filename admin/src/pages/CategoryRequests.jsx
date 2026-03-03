import { useState, useEffect } from "react";
import api from "../utils/axios";
import toast from "react-hot-toast";
import {
  HiClock, HiCheckCircle, HiXCircle, HiXMark,
  HiClipboardDocumentList, HiUser, HiCalendarDays,
} from "react-icons/hi2";

export default function CategoryRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  async function fetchRequests() {
    try {
      const res = await api.get(`/admin/category-requests?status=${filter}`);
      setRequests(res.data.requests || []);
    } catch (err) { console.error("Failed to load category requests:", err); }
    finally { setLoading(false); }
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await api.post(`/admin/category-requests/${selectedRequest._id}/approve`, { adminNotes: adminNotes.trim() || undefined });
      toast.success(`Category "${selectedRequest.name}" approved`);
      setShowApproveModal(false); setAdminNotes(""); setSelectedRequest(null); fetchRequests();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to approve request"); }
    finally { setProcessing(false); }
  }

  async function handleReject() {
    if (!selectedRequest || !rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    setProcessing(true);
    try {
      await api.post(`/admin/category-requests/${selectedRequest._id}/reject`, { reason: rejectionReason.trim() });
      toast.success(`Category request rejected`);
      setShowRejectModal(false); setRejectionReason(""); setSelectedRequest(null); fetchRequests();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to reject request"); }
    finally { setProcessing(false); }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const statCounts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Category Requests</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Review and approve new category requests from providers</p>
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'pending', label: 'Pending', count: statCounts.pending, Icon: HiClock, active: 'bg-amber-50 text-amber-800 ring-amber-200', idle: 'bg-gray-50 text-gray-600 ring-gray-200' },
            { key: 'approved', label: 'Approved', count: statCounts.approved, Icon: HiCheckCircle, active: 'bg-emerald-50 text-emerald-800 ring-emerald-200', idle: 'bg-gray-50 text-gray-600 ring-gray-200' },
            { key: 'rejected', label: 'Rejected', count: statCounts.rejected, Icon: HiXCircle, active: 'bg-red-50 text-red-800 ring-red-200', idle: 'bg-gray-50 text-gray-600 ring-gray-200' },
          ].map(btn => (
            <button key={btn.key} onClick={() => setFilter(btn.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ring-inset transition flex items-center gap-1.5 ${filter === btn.key ? btn.active : btn.idle}`}>
              <btn.Icon className="w-3.5 h-3.5" /> {btn.label} ({btn.count})
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12 text-center">
          <HiClipboardDocumentList className="mx-auto w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-900">No {filter} requests</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {filter === "pending" ? "All category requests have been reviewed." : `No ${filter} category requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-gray-900">{request.name}</h3>
                    {request.status === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                        <HiClock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {request.status === "approved" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <HiCheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {request.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                        <HiXCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </div>

                  {request.description && <p className="text-[11px] text-gray-600 mb-2">{request.description}</p>}

                  {/* Provider Info */}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-3">
                    <HiUser className="w-3.5 h-3.5" />
                    <span>{request.providerId?.firstName} {request.providerId?.lastName}</span>
                    <span className="text-gray-300">·</span>
                    <span>{request.providerId?.email}</span>
                  </div>

                  {/* Justification */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Justification</p>
                    <p className="text-xs text-gray-700">{request.justification}</p>
                  </div>

                  {/* Admin Response */}
                  {request.status === "rejected" && request.rejectionReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                      <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-0.5">Rejection Reason</p>
                      <p className="text-xs text-red-800">{request.rejectionReason}</p>
                    </div>
                  )}
                  {request.status === "approved" && request.adminNotes && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-2">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">Admin Notes</p>
                      <p className="text-xs text-emerald-800">{request.adminNotes}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><HiCalendarDays className="w-3 h-3" /> Submitted: {formatDate(request.createdAt)}</span>
                    {request.reviewedAt && <span className="flex items-center gap-1"><HiCheckCircle className="w-3 h-3" /> Reviewed: {formatDate(request.reviewedAt)}</span>}
                  </div>
                </div>

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="flex gap-1.5">
                    <button onClick={() => { setSelectedRequest(request); setShowApproveModal(true); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1">
                      <HiCheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition flex items-center gap-1">
                      <HiXCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Approve Category Request</h3>
              <button onClick={() => setShowApproveModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><HiXMark className="w-5 h-5" /></button>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-xs text-emerald-800">Approving will create a new category: <strong>{selectedRequest.name}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Notes (Optional)</label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Any comments or notes..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleApprove} disabled={processing} className="flex-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-1">
                <HiCheckCircle className="w-3.5 h-3.5" /> {processing ? "Approving..." : "Approve & Create"}
              </button>
              <button onClick={() => setShowApproveModal(false)} disabled={processing} className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold transition disabled:opacity-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Reject Category Request</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><HiXMark className="w-5 h-5" /></button>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs text-red-800">Rejecting: <strong>{selectedRequest.name}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason *</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this is being rejected..." rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-400" required />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleReject} disabled={processing || !rejectionReason.trim()} className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-1">
                <HiXCircle className="w-3.5 h-3.5" /> {processing ? "Rejecting..." : "Reject Request"}
              </button>
              <button onClick={() => setShowRejectModal(false)} disabled={processing} className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold transition disabled:opacity-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
