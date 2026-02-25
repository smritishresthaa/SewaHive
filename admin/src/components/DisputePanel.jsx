// admin/src/components/DisputePanel.jsx
import { useState, useEffect } from 'react';
import { HiXMark, HiCheckCircle, HiExclamationTriangle } from 'react-icons/hi2';
import api from '../utils/axios';
import toast from 'react-hot-toast';

export default function DisputePanel({ dispute, onClose, onResolved }) {
  const [resolving, setResolving] = useState(false);
  const [decision, setDecision] = useState('');
  const [refundAmount, setRefundAmount] = useState(dispute?.amount || 0);
  const [notes, setNotes] = useState('');

  async function handleResolve() {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    setResolving(true);
    try {
      const payload = {
        decisionType: decision,
        refundAmount: decision === 'REFUND_PARTIAL' ? refundAmount : 0,
        notes,
      };

      await api.post(`/payments/admin/disputes/${dispute._id}/resolve`, payload);

      toast.success('Dispute resolved!');
      onResolved?.();
      onClose?.();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to resolve';
      toast.error(msg);
    } finally {
      setResolving(false);
    }
  }

  const releaseAmount = decision === 'REFUND_PARTIAL' 
    ? dispute.amount - refundAmount 
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-red-50 border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HiExclamationTriangle className="w-6 h-6 text-orange-600" />
              Review Dispute
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Dispute ID: {dispute._id?.substring(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition"
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dispute Details */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-900 mb-3">Dispute Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600">Reason</p>
                <p className="font-medium text-gray-900">{dispute.reason?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-600">Amount in Dispute</p>
                <p className="font-bold text-lg text-gray-900">NPR {dispute.amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Raised By</p>
                <p className="font-medium text-gray-900">
                  {dispute.openedBy?.email} (Client)
                </p>
              </div>
            </div>
          </div>

          {/* Client Complaint */}
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="text-sm font-semibold text-gray-900 mb-2">Client's Complaint</p>
            <p className="text-gray-700 text-sm">{dispute.message}</p>
            {dispute.evidence?.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {dispute.evidence.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Evidence {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Provider Response */}
          {dispute.providerResponse?.text && (
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="text-sm font-semibold text-gray-900 mb-2">Provider's Response</p>
              <p className="text-gray-700 text-sm">{dispute.providerResponse.text}</p>
              {dispute.providerResponse?.images?.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {dispute.providerResponse.images.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      Response {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Decision */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-4">Your Decision</h3>

            <div className="space-y-4">
              {/* Decision Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white/50 transition">
                  <input
                    type="radio"
                    value="RELEASE_FULL"
                    checked={decision === 'RELEASE_FULL'}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Release Full Payment to Provider</p>
                    <p className="text-xs text-gray-600">Client's complaint not valid</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white/50 transition">
                  <input
                    type="radio"
                    value="REFUND_FULL"
                    checked={decision === 'REFUND_FULL'}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Full Refund to Client</p>
                    <p className="text-xs text-gray-600">Provider at fault</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white/50 transition">
                  <input
                    type="radio"
                    value="REFUND_PARTIAL"
                    checked={decision === 'REFUND_PARTIAL'}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Split Payment</p>
                    <p className="text-xs text-gray-600">Partial refund, partial to provider</p>
                  </div>
                </label>
              </div>

              {/* Partial Refund Slider */}
              {decision === 'REFUND_PARTIAL' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Refund to Client: NPR {refundAmount?.toLocaleString()}
                  </p>
                  <input
                    type="range"
                    min="0"
                    max={dispute.amount}
                    step="10"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-between text-xs text-gray-600">
                    <span>Refund to Client</span>
                    <span>Release to Provider</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs font-medium text-gray-900">
                    <span>NPR {refundAmount?.toLocaleString()}</span>
                    <span>NPR {releaseAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Why this decision?)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Document your reasoning for audit trail..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!decision || resolving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <HiCheckCircle className="w-5 h-5" />
            {resolving ? 'Resolving...' : 'Resolve Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}
