import { useEffect, useState } from "react";
import api from "../utils/axios";
import KYCReviewModal from "../components/KYCReviewModal";
import {
  HiClipboardDocumentList, HiClock, HiCheckCircle, HiXCircle,
  HiMagnifyingGlass, HiExclamationTriangle, HiShieldCheck,
  HiFlag, HiArrowPath,
} from "react-icons/hi2";

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

  useEffect(() => { fetchRecords(); }, [statusFilter, search]);

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get('/admin/dashboard/stats');
        if (res.data.success) { setStats(res.data.data.verifications); setStatsError(null); }
      } catch (err) { console.error('Failed to fetch stats:', err); setStatsError('Failed to load stats'); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    const handleVisibilityChange = () => { if (!document.hidden) fetchStats(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, []);

  async function fetchRecords() {
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);
      const res = await api.get(`/admin/verifications?${params.toString()}`);
      setRecords(res.data?.data || []);
    } catch (err) { setError(err?.response?.data?.message || "Failed to load verifications"); }
    finally { setLoading(false); }
  }

  async function handleReview(id, status) {
    try { await api.patch(`/admin/verifications/${id}/review`, { status }); fetchRecords(); }
    catch (err) { setError(err?.response?.data?.message || "Failed to update verification"); }
  }

  function openReviewModal(verification) { setSelectedVerification(verification); setIsModalOpen(true); }
  function closeReviewModal() { setIsModalOpen(false); setSelectedVerification(null); }
  function onReviewComplete() { fetchRecords(); }

  const StatusBadge = ({ status }) => {
    const map = {
      submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
      under_review: 'bg-amber-50 text-amber-700 ring-amber-200',
      needs_correction: 'bg-orange-50 text-orange-700 ring-orange-200',
      approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      rejected: 'bg-red-50 text-red-700 ring-red-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${map[status] || 'bg-gray-50 text-gray-700 ring-gray-200'}`}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Provider Verification</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Review KYC submissions · Auto-updates every 30s</p>
        </div>
        <button onClick={fetchRecords} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Refresh">
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {statsError && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4" /> {statsError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.totalVerifications, Icon: HiClipboardDocumentList, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
          { label: 'Pending', value: stats.pendingVerifications, Icon: HiClock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' },
          { label: 'Approved', value: stats.approvedVerifications, Icon: HiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
          { label: 'Rejected', value: stats.rejectedVerifications, Icon: HiXCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' },
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
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="needs_correction">Needs Correction</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2"><HiExclamationTriangle className="w-4 h-4" /> {error}</div>}

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <HiShieldCheck className="mx-auto w-8 h-8 text-gray-300 mb-1" />
          <p className="text-xs text-gray-400">No verifications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{record.providerId?.profile?.name || "Unknown Provider"}</p>
                  <p className="text-[11px] text-gray-500">{record.providerId?.email || "No email"}</p>
                  <p className="text-[11px] text-gray-500">{record.providerId?.phone || "No phone"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Document: {record.documentType} · Submitted {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={record.status} />
                  {record.screeningStatus === "flagged" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                      <HiFlag className="w-3 h-3" /> Flagged
                    </span>
                  )}
                </div>
              </div>

              {/* Document Summary */}
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Documents ({record.documents?.length || 0})</p>
                  <div className="space-y-1">
                    {(record.documents || []).map((doc, idx) => (
                      <div key={idx} className="text-[11px] text-gray-600 flex items-center justify-between">
                        <span className="capitalize">{doc.type.replace("-", " ")}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          doc.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                          doc.status === "rejected" ? "bg-red-50 text-red-700" :
                          "bg-gray-50 text-gray-600"
                        }`}>{doc.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {record.profileMatch && (
                  <div className="bg-amber-50/60 border border-amber-100 p-2 rounded-lg text-[11px]">
                    <p className="font-semibold text-gray-700 mb-0.5">Profile Match</p>
                    <p className="flex items-center gap-1">
                      Name: {record.profileMatch.nameMatch ? <><HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Match</> : record.profileMatch.nameMatch === false ? <><HiXCircle className="w-3.5 h-3.5 text-red-500" /> Mismatch</> : <><HiClock className="w-3.5 h-3.5 text-amber-500" /> Not checked</>}
                    </p>
                    <p className="flex items-center gap-1">
                      DOB: {record.profileMatch.dobMatch ? <><HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Match</> : record.profileMatch.dobMatch === false ? <><HiXCircle className="w-3.5 h-3.5 text-red-500" /> Mismatch</> : <><HiClock className="w-3.5 h-3.5 text-amber-500" /> Not checked</>}
                    </p>
                  </div>
                )}

                {record.adminComment && (
                  <p className="text-[11px] text-rose-600">
                    <span className="font-semibold">Admin Note:</span> {record.adminComment}
                  </p>
                )}
              </div>

              {/* Action Button */}
              {!["approved", "rejected"].includes(record.status) && (
                <div className="mt-3">
                  <button onClick={() => openReviewModal(record)} className="w-full px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-xs font-semibold">
                    Review in Detail
                  </button>
                </div>
              )}

              {/* Finalized Status Badge */}
              {["approved", "rejected"].includes(record.status) && (
                <div className="mt-3 p-2.5 rounded-lg text-center text-xs font-semibold bg-gray-50 border border-gray-100">
                  {record.status === "approved" && (
                    <div>
                      <span className="text-emerald-700 flex items-center justify-center gap-1"><HiCheckCircle className="w-4 h-4" /> Verification approved</span>
                      {record.badge && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          {record.badge === "verified" && <><HiCheckCircle className="w-3 h-3" /> Verified</>}
                          {record.badge === "pro" && <><HiShieldCheck className="w-3 h-3" /> Pro</>}
                          {record.badge === "top-rated" && <><HiShieldCheck className="w-3 h-3" /> Top Rated</>}
                        </div>
                      )}
                    </div>
                  )}
                  {record.status === "rejected" && (
                    <span className="text-rose-700 flex items-center justify-center gap-1"><HiXCircle className="w-4 h-4" /> Verification rejected</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {isModalOpen && selectedVerification && (
        <KYCReviewModal verification={selectedVerification} onClose={closeReviewModal} onReviewComplete={onReviewComplete} />
      )}
    </div>
  );
}

