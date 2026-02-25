// frontend/src/components/DisputeModal.jsx
import { useState } from "react";
import { HiXMark, HiExclamationTriangle } from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function DisputeModal({ booking, onClose, onDisputeSubmitted }) {
  const [category, setCategory] = useState("service_quality");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: "service_quality", label: "Service quality issue", icon: "⭐" },
    { value: "payment_issue", label: "Payment issue", icon: "💳" },
    { value: "provider_behaviour", label: "Provider behaviour concern", icon: "👤" },
    { value: "safety_concern", label: "Safety concern", icon: "⚠️" },
    { value: "other", label: "Other", icon: "📝" },
  ];

  const handleFileAdd = (file) => {
    if (evidenceFiles.length >= 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    const newFile = {
      name: file.name,
      type: file.size > 5000000 ? "document" : "photo",
      size: file.size,
      file,
    };

    setEvidenceFiles([...evidenceFiles, newFile]);
  };

  const handleFileRemove = (index) => {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    files.forEach((file) => handleFileAdd(file));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (description.trim().length < 10) {
      toast.error("Please add a brief description (at least 10 characters)");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("bookingId", booking._id);
      formData.append("category", category);
      formData.append("description", description);

      evidenceFiles.forEach((file) => {
        formData.append("evidence", file.file);
      });

      const res = await api.post("/disputes/open", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Dispute submitted successfully");
      onDisputeSubmitted?.(res.data.dispute);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to open dispute:", err);
      toast.error(
        err.response?.data?.message || "Failed to open dispute"
      );
    } finally {
      setLoading(false);
    }
  }
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HiExclamationTriangle className="text-amber-600" />
              Open a Dispute
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Booking #
              {booking._id?.toString().slice(-6) || "..."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <HiXMark className="text-2xl text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Booking Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900">Booking summary</p>
            <div className="mt-2 text-sm text-blue-900 space-y-1">
              <p><strong>Provider:</strong> {booking.providerId?.profile?.name || "Provider"}</p>
              <p><strong>Service:</strong> {booking.serviceId?.title || "Unknown service"}</p>
              <p>
                <strong>Date:</strong>{" "}
                {booking.scheduledAt
                  ? new Date(booking.scheduledAt).toLocaleString()
                  : booking.requestedAt
                  ? new Date(booking.requestedAt).toLocaleString()
                  : "Not scheduled"}
              </p>
            </div>
            <p className="mt-3 text-xs text-blue-800">
              We’ll review this fairly and keep you updated.
            </p>
          </div>

          {submitted && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-semibold">✔ Dispute submitted</p>
              <p className="mt-1 text-sm">Admin will review it shortly. You’ll be notified of updates.</p>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Issue category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    category === cat.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-200"
                  }`}
                  disabled={submitted}
                >
                  <span className="text-2xl block mb-1">{cat.icon}</span>
                  <span className="text-xs font-medium text-gray-900">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened. Keep it short and clear."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              disabled={submitted}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length} / 2000 characters. A few sentences are enough.
            </p>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Evidence (optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                isDragging ? "border-emerald-400 bg-emerald-50" : "border-gray-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach((file) => {
                    handleFileAdd(file);
                  });
                }}
                className="hidden"
                id="evidence-upload"
                disabled={submitted}
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                <p className="text-gray-600">
                  Drag files here or <span className="text-emerald-600 font-medium">click to upload</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Evidence helps faster resolution. Photos and documents up to 5MB each.
                </p>
              </label>
            </div>

            {/* File List */}
            {evidenceFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {evidenceFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {file.name.slice(0, 50)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileRemove(idx)}
                      className="text-red-500 hover:text-red-700"
                      disabled={submitted}
                    >
                      <HiXMark />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || submitted || description.trim().length < 10}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitted ? "Submitted" : loading ? "Submitting..." : "Submit Dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
