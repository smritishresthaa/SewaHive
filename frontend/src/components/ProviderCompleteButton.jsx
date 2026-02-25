// components/ProviderCompleteButton.jsx
import { useState } from 'react';
import { HiCheckCircle } from 'react-icons/hi2';
import api from '../utils/axios';
import toast from 'react-hot-toast';

export default function ProviderCompleteButton({ booking, onComplete }) {
  const [loading, setLoading] = useState(false);

  async function handleMarkComplete() {
    if (!window.confirm('Mark this job as complete?')) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payment/escrow/provider-mark-complete', {
        bookingId: booking._id,
      });

      toast.success('Job marked as complete! Waiting for client confirmation.');
      onComplete?.();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to mark complete';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (booking.status !== 'in-progress' && booking.status !== 'confirmed') {
    return null;
  }

  return (
    <button
      onClick={handleMarkComplete}
      disabled={loading}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <HiCheckCircle className="w-5 h-5" />
      {loading ? 'Marking Complete...' : 'Mark Job Completed'}
    </button>
  );
}
