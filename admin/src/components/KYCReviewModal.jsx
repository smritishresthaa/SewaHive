/**
 * KYCReviewModal - Admin interface for detailed KYC document review
 * Features:
 * - Document zoom and comparison
 * - Per-document approval/rejection with notes
 * - Profile match validation
 * - Screening status (cleared/flagged)
 * - Audit history
 * - Badge assignment
 */

import React, { useState } from "react";
import {
  HiXMark,
  HiCheckCircle,
  HiExclamationTriangle,
  HiDocumentText,
  HiUser,
  HiMapPin,
  HiEye,
} from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function KYCReviewModal({ verification, onClose, onReviewComplete }) {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [docReviews, setDocReviews] = useState({});
  const [adminComment, setAdminComment] = useState("");
  const [screeningStatus, setScreeningStatus] = useState(verification?.screeningStatus || "pending");
  const [flagReason, setFlagReason] = useState(verification?.flagReason || "");
  const [badge, setBadge] = useState(verification?.badge || "verified");
  const [submitting, setSubmitting] = useState(false);

  const allDocs = [
    ...(verification?.documents || []),
    ...(verification?.addressDocuments || []).map((doc) => ({ ...doc, isAddressDoc: true })),
  ];

  const handleDocReview = (docId, status, comment = "") => {
    setDocReviews((prev) => ({
      ...prev,
      [docId]: { docId, status, adminComment: comment },
    }));
  };

  async function handleSubmitReview() {
    if (Object.values(docReviews).length === 0) {
      toast.error("Please review at least one document");
      return;
    }

    setSubmitting(true);
    try {
      const docReviewsArray = Object.values(docReviews).map((review) => {
        const doc = allDocs.find((d) => d._id === review.docId);
        return {
          docId: review.docId,
          isAddressDoc: doc?.isAddressDoc || false,
          status: review.status,
          adminComment: review.adminComment || "",
          rejectionReason:
            review.status === "rejected"
              ? review.adminComment || "Document does not meet requirements"
              : null,
        };
      });

      const response = await api.patch(`/admin/verifications/${verification._id}/review`, {
        docReviews: docReviewsArray,
        adminComment,
        screeningStatus,
        flagReason: screeningStatus === "flagged" ? flagReason : null,
        badge,
      });

      console.log("Review submitted successfully:", response);
      toast.success("✅ KYC review submitted successfully!");
      
      // Ensure modal closes and refresh happens
      setTimeout(() => {
        onReviewComplete?.();
        onClose?.();
      }, 1000);
    } catch (err) {
      console.error("Review submission error:", err);
      const errorMessage = 
        err?.response?.data?.message || 
        err?.response?.data?.error ||
        err?.message || 
        "Failed to submit review";
      
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoc =
    allDocs.find((d) => d._id === selectedDocId) || allDocs[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-h-screen overflow-y-auto max-w-5xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-green-50 border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {verification?.providerId?.profile?.name || "Provider"}
            </h2>
            <p className="text-sm text-gray-600">KYC Verification Review</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 p-4">
          {/* Left: Document List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <HiDocumentText /> Documents
            </h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {allDocs.map((doc) => (
                <button
                  key={doc._id}
                  onClick={() => setSelectedDocId(doc._id)}
                  className={`w-full text-left p-2 rounded text-sm transition ${
                    selectedDocId === doc._id
                      ? "bg-emerald-100 border-l-4 border-l-emerald-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium capitalize">{doc.type.replace("-", " ")}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {doc.status === "approved" && "✅ Approved"}
                    {doc.status === "rejected" && "❌ Rejected"}
                    {doc.status === "pending" && "⏳ Pending"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Document Viewer */}
          <div className="lg:col-span-2 space-y-4">
            {selectedDoc && (
              <>
                {/* Document Display */}
                <div className="border rounded-lg bg-gray-100 p-2 flex items-center justify-center aspect-video overflow-auto">
                  {selectedDoc.url ? (
                    selectedDoc.url.endsWith(".pdf") ? (
                      <iframe
                        src={selectedDoc.url}
                        className="w-full h-full"
                        title={selectedDoc.type}
                      />
                    ) : (
                      <img
                        src={selectedDoc.url}
                        alt={selectedDoc.type}
                        style={{ transform: `scale(${zoomLevel})` }}
                        className="max-h-full max-w-full object-contain transition"
                      />
                    )
                  ) : (
                    <p className="text-gray-500">No preview</p>
                  )}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.2))}
                    className="text-sm px-2 py-1 border rounded hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))}
                    className="text-sm px-2 py-1 border rounded hover:bg-gray-100"
                  >
                    +
                  </button>
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm flex items-center gap-1 text-emerald-600 hover:underline ml-auto"
                  >
                    <HiEye className="w-4 h-4" /> Open Full
                  </a>
                </div>

                {/* Document Review Controls */}
                <div className="border rounded-lg p-3 bg-white space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDocReview(selectedDoc._id, "approved")}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition ${
                        docReviews[selectedDoc._id]?.status === "approved"
                          ? "bg-emerald-100 border-2 border-emerald-600 text-emerald-700"
                          : "border border-gray-300 hover:border-emerald-300"
                      }`}
                    >
                      <HiCheckCircle className="w-5 h-5" /> Approve
                    </button>
                    <button
                      onClick={() => handleDocReview(selectedDoc._id, "rejected")}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition ${
                        docReviews[selectedDoc._id]?.status === "rejected"
                          ? "bg-rose-100 border-2 border-rose-600 text-rose-700"
                          : "border border-gray-300 hover:border-rose-300"
                      }`}
                    >
                      <HiExclamationTriangle className="w-5 h-5" /> Reject
                    </button>
                  </div>

                  {docReviews[selectedDoc._id]?.status && (
                    <textarea
                      placeholder={
                        docReviews[selectedDoc._id].status === "rejected"
                          ? "Reason for rejection (e.g., 'Blurry', 'Expired ID')"
                          : "Comments (optional)"
                      }
                      value={
                        docReviews[selectedDoc._id]?.adminComment || ""
                      }
                      onChange={(e) =>
                        handleDocReview(
                          selectedDoc._id,
                          docReviews[selectedDoc._id].status,
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full border rounded p-2 text-sm"
                    />
                  )}
                </div>

                {/* Document Metadata */}
                <div className="border rounded-lg p-3 bg-gray-50 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Type:</span> {selectedDoc.type}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span> {(selectedDoc.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                  {selectedDoc.blurScore && (
                    <p>
                      <span className="font-medium">Clarity:</span> {Math.round(selectedDoc.blurScore)}
                      /100
                    </p>
                  )}
                  {selectedDoc.adminComment && (
                    <p>
                      <span className="font-medium">Previous Note:</span> {selectedDoc.adminComment}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile Match Check */}
        {verification?.profileMatch && (
          <div className="border-t p-4 bg-amber-50">
            <div className="flex items-center gap-2 mb-2">
              <HiUser className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Profile Validation</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Name Match</p>
                <p className="font-semibold">
                  {verification.profileMatch.nameMatch
                    ? "✅ Matches"
                    : verification.profileMatch.nameMatch === false
                    ? "❌ Mismatch"
                    : "⏳ Not checked"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">DOB Match</p>
                <p className="font-semibold">
                  {verification.profileMatch.dobMatch
                    ? "✅ Matches"
                    : verification.profileMatch.dobMatch === false
                    ? "❌ Mismatch"
                    : "⏳ Not checked"}
                </p>
              </div>
            </div>
            {verification.profileMatch.notes && (
              <p className="text-sm text-amber-700 mt-2">
                ⚠️ {verification.profileMatch.notes}
              </p>
            )}
          </div>
        )}

        {/* Screening & Flags */}
        <div className="border-t p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Screening Status
            </label>
            <select
              value={screeningStatus}
              onChange={(e) => setScreeningStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="pending">Pending Screening</option>
              <option value="cleared">Cleared</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {screeningStatus === "flagged" && (
            <textarea
              placeholder="Reason for flag (e.g., 'Suspicious pattern', 'Manual verification needed')"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Badge Assignment
            </label>
            <select
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="verified">Verified ✔️</option>
              <option value="pro">Pro ⭐</option>
              <option value="top-rated">Top Rated 🏆</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Overall Comment (Visible to Provider)
            </label>
            <textarea
              placeholder="Summary for provider..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Audit History */}
        {verification?.auditLogs && verification.auditLogs.length > 0 && (
          <div className="border-t p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Audit History</h3>
            <div className="space-y-1 text-sm">
              {[...verification.auditLogs].reverse().map((log, idx) => (
                <div key={idx} className="text-gray-600">
                  <span className="font-medium">{log.action}</span> — {log.note || "-"}{" "}
                  <span className="text-xs text-gray-500">
                    {new Date(log.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitReview}
            disabled={submitting || Object.values(docReviews).length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
