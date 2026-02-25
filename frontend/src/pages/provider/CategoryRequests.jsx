import { useState, useEffect } from "react";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import toast from "react-hot-toast";

export default function CategoryRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const res = await api.get("/providers/category-requests");
      setRequests(res.data.requests || []);
    } catch (err) {
      toast.error("Failed to load category requests");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    
    const icons = {
      pending: "⏳",
      approved: "✅",
      rejected: "❌",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Category Requests</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track your category requests and their approval status
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                <span className="text-gray-600">{requests.filter(r => r.status === 'pending').length} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-gray-600">{requests.filter(r => r.status === 'approved').length} Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-gray-600">{requests.filter(r => r.status === 'rejected').length} Rejected</span>
              </div>
            </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Category Requests</h3>
            <p className="text-gray-600 mb-4">
              You haven't submitted any category requests yet.
            </p>
            <p className="text-sm text-gray-500">
              When creating a service, you can request a new category if needed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{request.name}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    {request.description && (
                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Justification */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Justification</p>
                    <p className="text-sm text-gray-700">{request.justification}</p>
                  </div>

                  {/* Admin Response */}
                  {request.status === 'rejected' && request.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-red-600 uppercase mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-800">{request.rejectionReason}</p>
                    </div>
                  )}

                  {request.status === 'approved' && request.adminNotes && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-green-600 uppercase mb-1">Admin Notes</p>
                      <p className="text-sm text-green-800">{request.adminNotes}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>Submitted: {formatDate(request.createdAt)}</span>
                    {request.reviewedAt && (
                      <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
