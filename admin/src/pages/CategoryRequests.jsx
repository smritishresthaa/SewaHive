import { useState, useEffect } from "react";
import api from "../utils/axios";
import toast from "react-hot-toast";

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
    } catch (err) {
      console.error("Failed to load category requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      await api.post(`/admin/category-requests/${selectedRequest._id}/approve`, {
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success(`Category "${selectedRequest.name}" approved ✅`);
      setShowApproveModal(false);
      setAdminNotes("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve request");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    
    setProcessing(true);
    try {
      await api.post(`/admin/category-requests/${selectedRequest._id}/reject`, {
        reason: rejectionReason.trim(),
      });
      toast.success(`Category request rejected`);
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject request");
    } finally {
      setProcessing(false);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Requests</h1>
            <p className="text-gray-600 mt-1">
              Review and approve new category requests from providers
            </p>
          </div>
          <div className="flex gap-2">
              <button
                onClick={() => setFilter("pending")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "pending"
                    ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ⏳ Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("approved")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "approved"
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ✅ Approved ({stats.approved})
              </button>
              <button
                onClick={() => setFilter("rejected")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "rejected"
                    ? "bg-red-100 text-red-800 border-2 border-red-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ❌ Rejected ({stats.rejected})
              </button>
            </div>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {filter} requests
            </h3>
            <p className="text-gray-600">
              {filter === "pending"
                ? "All category requests have been reviewed."
                : `There are no ${filter} category requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Request Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{request.name}</h3>
                      {request.status === "pending" && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-semibold">
                          ⏳ Pending Review
                        </span>
                      )}
                      {request.status === "approved" && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-semibold">
                          ✅ Approved
                        </span>
                      )}
                      {request.status === "rejected" && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-semibold">
                          ❌ Rejected
                        </span>
                      )}
                    </div>

                    {request.description && (
                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                    )}

                    {/* Provider Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>
                        {request.providerId?.firstName} {request.providerId?.lastName}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>{request.providerId?.email}</span>
                    </div>

                    {/* Justification */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Justification</p>
                      <p className="text-sm text-gray-700">{request.justification}</p>
                    </div>

                    {/* Admin Response */}
                    {request.status === "rejected" && request.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                        <p className="text-xs font-semibold text-red-600 uppercase mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-800">{request.rejectionReason}</p>
                      </div>
                    )}

                    {request.status === "approved" && request.adminNotes && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">Admin Notes</p>
                        <p className="text-sm text-green-800">{request.adminNotes}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📅 Submitted: {formatDate(request.createdAt)}</span>
                      {request.reviewedAt && (
                        <span>✅ Reviewed: {formatDate(request.reviewedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {request.status === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        ❌ Reject
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Approve Category Request</h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Approving this request will create a new category: <strong>{selectedRequest.name}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Any comments or notes for the provider..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Approving..." : "✅ Approve & Create Category"}
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
        </div>
      </div>
    )}

    {/* Reject Modal */}
    {showRejectModal && selectedRequest && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Reject Category Request</h3>
            <button
              onClick={() => setShowRejectModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              You are about to reject the category: <strong>{selectedRequest.name}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why this category is being rejected..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Rejecting..." : "❌ Reject Request"}
            </button>
            <button
              onClick={() => setShowRejectModal(false)}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
