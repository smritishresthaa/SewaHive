import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft, HiExclamationTriangle, HiCheckCircle, HiXMark, HiDocumentText } from "react-icons/hi2";
import api from "../utils/axios";
import toast from "react-hot-toast";

export default function DisputeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [tab, setTab] = useState("details"); // details, request-info, resolve

  // Request info form state
  const [requestFields, setRequestFields] = useState([]);
  const [infoRequestReason, setInfoRequestReason] = useState("");

  // Resolve form state
  const [resolutionType, setResolutionType] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");

  useEffect(() => {
    fetchDispute();
  }, [id]);

  async function fetchDispute() {
    try {
      setLoading(true);
      const res = await api.get(`/disputes/${id}`);
      setDispute(res.data);
    } catch (err) {
      console.error("Failed to load dispute:", err);
      toast.error("Failed to load dispute");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (requestFields.length === 0) {
      toast.error("Please specify what information you need");
      return;
    }

    try {
      setRequestingInfo(true);
      await api.patch(`/disputes/${id}/request-info`, {
        fields: requestFields,
        reason: infoRequestReason,
      });
      toast.success("Information request sent to user");
      setRequestFields([]);
      setInfoRequestReason("");
      setTab("details");
      fetchDispute();
    } catch (err) {
      console.error("Failed to request info:", err);
      toast.error(err.response?.data?.message || "Failed to request information");
    } finally {
      setRequestingInfo(false);
    }
  }

  async function handleResolve() {
    if (!resolutionType) {
      toast.error("Please select a resolution type");
      return;
    }

    if (["refund_full", "refund_partial"].includes(resolutionType) && !refundAmount) {
      toast.error("Please enter refund amount");
      return;
    }

    try {
      setResolving(true);
      await api.post(`/disputes/${id}/resolve`, {
        resolutionType,
        refundAmount: refundAmount ? parseFloat(refundAmount) : 0,
        reason: resolutionReason,
      });
      toast.success("Dispute resolved successfully");
      setTab("details");
      fetchDispute();
    } catch (err) {
      console.error("Failed to resolve dispute:", err);
      toast.error(err.response?.data?.message || "Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  }

  const addRequestField = () => {
    setRequestFields([...requestFields, ""]);
  };

  const removeRequestField = (index) => {
    setRequestFields(requestFields.filter((_, i) => i !== index));
  };

  const updateRequestField = (index, value) => {
    const updated = [...requestFields];
    updated[index] = value;
    setRequestFields(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-600"></div>
          <p className="mt-2 text-gray-600">Loading dispute details...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <HiExclamationTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">Dispute not found</p>
          <button
            onClick={() => navigate("/admin/disputes")}
            className="mt-4 text-emerald-600 hover:text-emerald-700"
          >
            Back to Disputes
          </button>
        </div>
      </div>
    );
  }

  const categoryLabels = {
    service_quality: "Service quality issue",
    payment_issue: "Payment issue",
    provider_behaviour: "Provider behaviour concern",
    safety_concern: "Safety concern",
    other: "Other",
  };

  const statusColors = {
    opened: "bg-red-50 text-red-700",
    under_review: "bg-blue-50 text-blue-700",
    resolved: "bg-green-50 text-green-700",
    rejected: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/disputes")}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <HiArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dispute #{dispute._id.slice(-8).toUpperCase()}</h1>
              <p className="mt-1 text-gray-600">
                Booking #{(dispute.bookingId?._id || dispute.bookingId).toString().slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <span className={`inline-block rounded-full px-4 py-2 font-semibold capitalize ${statusColors[dispute.status] || "bg-gray-50 text-gray-700"}`}>
            {dispute.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Key Details */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <DetailCard
            label="Category"
            value={categoryLabels[dispute.category] || dispute.category}
            icon={<HiExclamationTriangle className="h-5 w-5 text-orange-600" />}
          />
          <DetailCard
            label="Raised By"
            value={dispute.raisedByRole.charAt(0).toUpperCase() + dispute.raisedByRole.slice(1)}
            icon={<HiExclamationTriangle className="h-5 w-5 text-blue-600" />}
          />
          <DetailCard
            label="Date Opened"
            value={new Date(dispute.createdAt).toLocaleDateString()}
            icon={<HiExclamationTriangle className="h-5 w-5 text-gray-600" />}
          />
          <DetailCard
            label="Days Open"
            value={Math.floor((new Date() - new Date(dispute.createdAt)) / (1000 * 60 * 60 * 24))}
            icon={<HiExclamationTriangle className="h-5 w-5 text-gray-600" />}
          />
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setTab("details")}
              className={`pb-4 font-medium transition ${
                tab === "details"
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Details & Evidence
            </button>
            <button
              onClick={() => setTab("request-info")}
              className={`pb-4 font-medium transition ${
                tab === "request-info"
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Request Information
            </button>
            <button
              onClick={() => setTab("resolve")}
              className={`pb-4 font-medium transition ${
                tab === "resolve"
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Resolve Dispute
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-50 rounded-lg p-6">
          {tab === "details" && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Dispute Description</h3>
                <p className="whitespace-pre-wrap rounded-lg bg-white px-4 py-3 text-gray-700">
                  {dispute.description}
                </p>
              </div>

              {/* Evidence Files */}
              {dispute.evidenceFiles && dispute.evidenceFiles.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Evidence Files</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {dispute.evidenceFiles.map((file, idx) => (
                      <div key={idx} className="rounded-lg bg-white p-4">
                        {file.mimeType?.startsWith("image/") ? (
                          <img
                            src={file.url || file.downloadUrl}
                            alt={`Evidence ${idx + 1}`}
                            className="mb-2 h-40 w-full rounded object-cover"
                          />
                        ) : (
                          <div className="mb-2 h-40 w-full rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 flex items-center gap-1"><HiDocumentText className="w-3.5 h-3.5" /> {file.originalName}</span>
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-900">{file.originalName}</p>
                        <p className="text-xs text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <a
                          href={file.url || file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                        >
                          Download →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requested Info Status */}
              {dispute.requestedInfo && dispute.requestedInfo.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Information Requested</h3>
                  <div className="space-y-3">
                    {dispute.requestedInfo.map((req, idx) => (
                      <div key={idx} className="rounded-lg bg-white p-4">
                        <p className="text-sm text-gray-600">Field {idx + 1}:</p>
                        <p className="font-medium text-gray-900">{req.field}</p>
                        {req.response && (
                          <div className="mt-2 rounded border-l-4 border-green-500 bg-green-50 p-3">
                            <p className="text-xs font-semibold text-green-700">RESPONSE PROVIDED:</p>
                            <p className="mt-1 text-sm text-gray-700">{req.response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Details */}
              {dispute.resolutionDetails && (
                <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                  <h3 className="mb-2 font-semibold text-green-900">Resolution Details</h3>
                  <p className="text-sm text-green-800">
                    <strong>Type:</strong> {dispute.resolutionDetails.resolutionType?.replace(/_/g, " ")}
                  </p>
                  {dispute.resolutionDetails.refundAmount > 0 && (
                    <p className="text-sm text-green-800">
                      <strong>Refund Amount:</strong> Rs. {dispute.resolutionDetails.refundAmount}
                    </p>
                  )}
                  {dispute.resolutionDetails.reason && (
                    <p className="mt-2 text-sm text-green-800">
                      <strong>Reason:</strong> {dispute.resolutionDetails.reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "request-info" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900">Information Fields Needed</label>
                <p className="mt-1 text-sm text-gray-600">Add the fields/information you need from the user</p>
              </div>

              <div className="space-y-3">
                {requestFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={field}
                      onChange={(e) => updateRequestField(idx, e.target.value)}
                      placeholder="e.g., Photos of service, Payment receipt..."
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeRequestField(idx)}
                      className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200"
                    >
                      <HiXMark size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addRequestField}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                + Add Field
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-900">Reason for Request</label>
                <textarea
                  value={infoRequestReason}
                  onChange={(e) => setInfoRequestReason(e.target.value)}
                  placeholder="Explain why you need this information..."
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleRequestInfo}
                disabled={requestingInfo || requestFields.length === 0}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-400 hover:bg-blue-700"
              >
                {requestingInfo ? "Requesting..." : "Request Information"}
              </button>
            </div>
          )}

          {tab === "resolve" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900">Resolution Type</label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">— Select Resolution —</option>
                  <option value="refund_full">Full Refund</option>
                  <option value="refund_partial">Partial Refund</option>
                  <option value="reservice">Reservice Required</option>
                  <option value="booking_valid">Booking Valid - No Action</option>
                  <option value="warning">Provider Warning</option>
                </select>
              </div>

              {["refund_full", "refund_partial"].includes(resolutionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-900">Refund Amount (Rs)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900">Resolution Reason</label>
                <textarea
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  <HiExclamationTriangle className="w-4 h-4 text-amber-500 inline mr-1" /> This action will finalize the dispute. Both parties will be notified of the resolution.
                </p>
              </div>

              <button
                onClick={handleResolve}
                disabled={resolving || !resolutionType}
                className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:bg-gray-400 hover:bg-green-700"
              >
                {resolving ? "Resolving..." : "Resolve Dispute"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>
    </div>
  );
}
