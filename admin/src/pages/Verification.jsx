import { useEffect, useState } from "react";
import api from "../utils/axios";
import KYCReviewModal from "../components/KYCReviewModal";

export default function Verification() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalVerifications: 0,
    pendingVerifications: 0,
    approvedVerifications: 0,
    rejectedVerifications: 0,
  });
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, search]);

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return;
      
      try {
        const res = await api.get('/admin/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data.verifications);
          setStatsError(null);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStatsError('Failed to load stats');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function fetchRecords() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await api.get(`/admin/verifications?${params.toString()}`);
      setRecords(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id, status) {
    try {
      await api.patch(`/admin/verifications/${id}/review`, {
        status,
      });

      fetchRecords();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update verification");
    }
  }

  function openReviewModal(verification) {
    setSelectedVerification(verification);
    setIsModalOpen(true);
  }

  function closeReviewModal() {
    setIsModalOpen(false);
    setSelectedVerification(null);
  }

  function onReviewComplete() {
    fetchRecords();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Provider Verification</h2>
          <p className="text-sm text-gray-600">Review KYC submissions (Auto-updates every 30s)</p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {statsError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Verifications</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVerifications}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingVerifications}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedVerifications}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejectedVerifications}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="flex-1 border rounded-md px-3 py-2"
          placeholder="Search by name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded-md px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="needs_correction">Needs Correction</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-gray-500">No verifications found.</div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record._id} className="bg-white border rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold">
                    {record.providerId?.profile?.name || "Unknown Provider"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {record.providerId?.email || "No email"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {record.providerId?.phone || "No phone"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Document: {record.documentType} • Submitted{" "}
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {record.status}
                  </span>
                  {record.screeningStatus === "flagged" && (
                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                      🚩 Flagged
                    </span>
                  )}
                </div>
              </div>

              {/* Document Summary */}
              <div className="mt-3 text-sm space-y-2">
                <div>
                  <p className="font-medium mb-1">Documents ({record.documents?.length || 0})</p>
                  <div className="space-y-1">
                    {(record.documents || []).map((doc, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-gray-600 flex items-center justify-between"
                      >
                        <span className="capitalize">{doc.type.replace("-", " ")}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            doc.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {record.profileMatch && (
                  <div className="bg-amber-50 p-2 rounded text-xs border border-amber-200">
                    <p className="font-medium mb-1">Profile Match</p>
                    <p>
                      Name:{" "}
                      {record.profileMatch.nameMatch
                        ? "✅ Match"
                        : record.profileMatch.nameMatch === false
                        ? "❌ Mismatch"
                        : "⏳ Not checked"}
                    </p>
                    <p>
                      DOB:{" "}
                      {record.profileMatch.dobMatch
                        ? "✅ Match"
                        : record.profileMatch.dobMatch === false
                        ? "❌ Mismatch"
                        : "⏳ Not checked"}
                    </p>
                  </div>
                )}

                {record.adminComment && (
                  <p className="text-xs text-rose-600">
                    <span className="font-medium">Admin Note:</span> {record.adminComment}
                  </p>
                )}
              </div>

              {/* Action Button - Only for pending/under review */}
              {!["approved", "rejected"].includes(record.status) && (
                <div className="mt-3">
                  <button
                    onClick={() => openReviewModal(record)}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                  >
                    Review in Detail
                  </button>
                </div>
              )}

              {/* Finalized Status Badge */}
              {["approved", "rejected"].includes(record.status) && (
                <div className="mt-3 p-3 rounded-lg text-center text-sm font-medium bg-gray-50 border border-gray-200">
                  {record.status === "approved" && (
                    <div>
                      <span className="text-emerald-700">✅ This verification has been approved</span>
                      {record.badge && (
                        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {record.badge === "verified" && "✔️ Verified"}
                          {record.badge === "pro" && "⭐ Pro"}
                          {record.badge === "top-rated" && "🏆 Top Rated"}
                        </div>
                      )}
                    </div>
                  )}
                  {record.status === "rejected" && (
                    <span className="text-rose-700">❌ This verification has been rejected</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {isModalOpen && selectedVerification && (
        <KYCReviewModal
          verification={selectedVerification}
          onClose={closeReviewModal}
          onReviewComplete={onReviewComplete}
        />
      )}
    </div>
  );
}

