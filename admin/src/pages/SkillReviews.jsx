import { useState, useEffect } from "react";
import api from "../utils/axios";
import toast from "react-hot-toast";
import { HiCheckCircle, HiXCircle, HiExclamationTriangle, HiClipboardDocumentList } from "react-icons/hi2";

export default function SkillReviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending_review");

  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [page, statusFilter]);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await api.get(`/admin/skills-review?status=${statusFilter}&page=${page}&limit=10`);
      setItems(res.data.items || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch skill reviews", err);
      toast.error("Failed to load skill reviews");
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (status) => {
    if (!selectedItem) return;
    
    if (status === "needs_correction" && !feedback.trim()) {
      return toast.error("Feedback is required when requesting corrections");
    }

    try {
      setActionLoading(true);
      await api.put(`/admin/skills-review/${selectedItem.providerId}/${selectedItem.proof.categoryId._id}`, {
        status,
        adminFeedback: feedback
      });
      
      toast.success(`Skill proof marked as ${status.replace("_", " ")}`);
      setSelectedItem(null);
      setFeedback("");
      fetchItems(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update skill proof");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Category Skill Reviews</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Review provider portfolios and experience to unlock categories</p>
        </div>
        
        <select 
          className="border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="pending_review">Pending Review</option>
          <option value="needs_correction">Needs Correction</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-4"><HiClipboardDocumentList className="mx-auto w-10 h-10 text-gray-300" /></div>
          <h3 className="text-lg font-medium text-gray-900">No skill proofs found</h3>
          <p className="text-gray-500">There are no skill proofs matching the current filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Provider</th>
                <th className="p-4 font-semibold text-gray-600">Category</th>
                <th className="p-4 font-semibold text-gray-600">Submitted</th>
                <th className="p-4 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{item.providerName}</div>
                    <div className="text-sm text-gray-500">{item.providerEmail}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.proof.categoryId?.name || "Unknown"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(item.proof.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setFeedback(item.proof.adminFeedback || "");
                      }}
                      className="text-emerald-600 hover:text-emerald-900 font-medium text-sm"
                    >
                      Review Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-gray-50">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border rounded bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border rounded bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Review Skill Proof</h2>
                <p className="text-gray-600">
                  Provider: <span className="font-medium">{selectedItem.providerName}</span>
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700">
                <HiXCircle className="text-3xl" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Category Requested</h3>
                <p className="text-lg font-medium text-gray-900">{selectedItem.proof.categoryId?.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Tools & Equipment</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.proof.tools && selectedItem.proof.tools.length > 0 ? (
                    selectedItem.proof.tools.map((tool, i) => (
                      <span key={i} className="px-2 py-1 bg-white border text-gray-700 rounded text-xs">{tool}</span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">None listed</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Experience Description</h3>
              <div className="bg-gray-50 p-4 rounded-2xl border whitespace-pre-wrap text-gray-800">
                {selectedItem.proof.experienceDescription || "No description provided."}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Work Portfolio</h3>
                 
                 {/* Before Photos */}
                 {selectedItem.proof.portfolio?.some(p => p.type === 'before') && (
                   <div className="mb-4">
                     <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded mb-2 inline-block">Before Service</span>
                     <div className="grid grid-cols-3 gap-2">
                       {selectedItem.proof.portfolio.filter(p => p.type === 'before').map((img, i) => (
                         <a key={i} href={img.url} target="_blank" rel="noreferrer">
                           <img src={img.url} className="w-full h-24 object-cover rounded shadow-sm border hover:opacity-75 transition" alt="Before" />
                         </a>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* After Photos */}
                 {selectedItem.proof.portfolio?.some(p => p.type === 'after') && (
                   <div className="mb-4">
                     <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded mb-2 inline-block">After Service</span>
                     <div className="grid grid-cols-3 gap-2">
                       {selectedItem.proof.portfolio.filter(p => p.type === 'after').map((img, i) => (
                         <a key={i} href={img.url} target="_blank" rel="noreferrer">
                           <img src={img.url} className="w-full h-24 object-cover rounded shadow-sm border hover:opacity-75 transition" alt="After" />
                         </a>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* General/Other Photos */}
                 {selectedItem.proof.portfolio?.some(p => !['before', 'after'].includes(p.type)) && (
                   <div>
                     <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded mb-2 inline-block">General Work Samples</span>
                     <div className="grid grid-cols-3 gap-2">
                       {selectedItem.proof.portfolio.filter(p => !['before', 'after'].includes(p.type)).map((img, i) => (
                         <a key={i} href={img.url} target="_blank" rel="noreferrer">
                           <img src={img.url} className="w-full h-24 object-cover rounded shadow-sm border hover:opacity-75 transition" alt="Work" />
                         </a>
                       ))}
                     </div>
                   </div>
                 )}

                 {(!selectedItem.proof.portfolio || selectedItem.proof.portfolio.length === 0) && (
                   <span className="text-gray-500 text-sm italic">No portfolio images uploaded.</span>
                 )}
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Certificates</h3>
                 {selectedItem.proof.certificates?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedItem.proof.certificates.map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noreferrer">
                          <img src={img.url} className="w-full h-24 object-cover rounded shadow-sm border hover:opacity-75 transition" alt="Certificate" />
                        </a>
                      ))}
                    </div>
                 ) : <span className="text-gray-500 text-sm italic">No certificates uploaded.</span>}
              </div>
            </div>


            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">Admin Feedback (Required for corrections/rejections)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain why this needs correction or was rejected..."
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                disabled={actionLoading}
              >
                Cancel
              </button>
              
              {selectedItem.proof.status !== "rejected" && (
                <button
                  onClick={() => handleAction("rejected")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <HiXCircle /> Reject
                </button>
              )}

              {selectedItem.proof.status !== "needs_correction" && (
                <button
                  onClick={() => handleAction("needs_correction")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <HiExclamationTriangle /> Request Correction
                </button>
              )}

              {selectedItem.proof.status !== "approved" && (
                <button
                  onClick={() => handleAction("approved")}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <HiCheckCircle /> Approve Category
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}