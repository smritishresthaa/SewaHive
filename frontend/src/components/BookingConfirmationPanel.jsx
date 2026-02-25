// components/BookingConfirmationPanel.jsx
import { useState } from 'react';
import { HiCheckCircle, HiExclamationTriangle } from 'react-icons/hi2';
import api from '../utils/axios';
import toast from 'react-hot-toast';

export default function BookingConfirmationPanel({ booking, onConfirm, onDispute }) {
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    reason: 'SERVICE_NOT_COMPLETED',
    description: '',
  });

  async function handleConfirm() {
    if (!window.confirm('Confirm that the service has been completed to your satisfaction?')) {
      return;
    }

    setConfirming(true);
    try {
      const { data } = await api.post('/payment/escrow/confirm-completion', {
        bookingId: booking._id,
      });

      toast.success('Service confirmed! Payment released to provider.');
      onConfirm?.();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to confirm';
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  }

  async function handleDispute() {
    if (!disputeForm.description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setDisputing(true);
    try {
      const { data } = await api.post('/payment/escrow/raise-dispute', {
        bookingId: booking._id,
        reason: disputeForm.reason,
        description: disputeForm.description,
        evidenceUrls: [],
      });

      toast.success('Dispute raised. Admin will review within 24 hours.');
      onDispute?.(data.disputeId);
      setShowDisputeForm(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to raise dispute';
      toast.error(msg);
    } finally {
      setDisputing(false);
    }
  }

  if (booking.status !== 'provider_completed' && booking.status !== 'awaiting_client_confirmation') {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 shadow-lg">
      <div className="flex items-start gap-4 mb-6">
        <HiCheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Service Completed
          </h3>
          <p className="text-gray-600 text-sm">
            The provider has marked this service as complete. Please review the work and confirm.
          </p>
        </div>
      </div>

      {!showDisputeForm ? (
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {confirming ? 'Confirming...' : '✓ Confirm Completion & Release Payment'}
          </button>

          <button
            onClick={() => setShowDisputeForm(true)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-xl transition border border-red-200"
          >
            <HiExclamationTriangle className="w-5 h-5 inline mr-2" />
            I Have an Issue / Dispute
          </button>

          <p className="text-xs text-gray-500 text-center">
            By confirming, you acknowledge the service is complete and payment will be released.
          </p>
        </div>
      ) : (
        <div className="space-y-4 bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-gray-900">Raise a Dispute</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's the issue?
            </label>
            <select
              value={disputeForm.reason}
              onChange={(e) =>
                setDisputeForm({ ...disputeForm, reason: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="SERVICE_NOT_COMPLETED">Service not completed</option>
              <option value="POOR_QUALITY">Poor quality work</option>
              <option value="PROVIDER_UNAVAILABLE">Provider unavailable</option>
              <option value="DIFFERENT_FROM_DESCRIPTION">Different from description</option>
              <option value="SAFETY_ISSUE">Safety/Health issue</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe the issue
            </label>
            <textarea
              value={disputeForm.description}
              onChange={(e) =>
                setDisputeForm({ ...disputeForm, description: e.target.value })
              }
              rows={4}
              placeholder="Please be as specific as possible..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDispute}
              disabled={disputing}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {disputing ? 'Raising Dispute...' : 'Raise Dispute'}
            </button>
            <button
              onClick={() => setShowDisputeForm(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-red-700">
            Admin will review both sides and make a fair decision within 24 hours.
          </p>
        </div>
      )}
    </div>
  );
}
