// components/EsewaPaymentButton.jsx
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/axios';

export default function EsewaPaymentButton({ 
  bookingId, 
  amount, 
  disabled = false,
  onSuccess,
  onError,
  className = ""
}) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  async function handlePayment() {
    if (!bookingId || !amount) {
      toast.error('Invalid booking or amount');
      return;
    }

    setLoading(true);
    try {
      // Call backend to initiate payment
      const { data } = await api.post('/payment/esewa/initiate', {
        bookingId,
        amount,
      });

      if (!data.success || !data.form) {
        throw new Error('Failed to initiate payment');
      }

      const { form } = data;

      // Create hidden form and auto-submit to eSewa
      const esewaForm = document.createElement('form');
      esewaForm.method = 'POST';
      esewaForm.action = form.checkout_url;
      esewaForm.style.display = 'none';

      // Add all form fields
      Object.keys(form).forEach((key) => {
        if (key !== 'checkout_url') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = form[key];
          esewaForm.appendChild(input);
        }
      });

      document.body.appendChild(esewaForm);
      
      // Submit form to redirect to eSewa
      esewaForm.submit();
      
      // Note: Page will redirect, so loading state won't be visible after this
      toast.success('Redirecting to eSewa...');
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      const message = error.response?.data?.message || 'Failed to initiate payment';
      toast.error(message);
      setLoading(false);
      onError?.(error);
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`
        flex items-center justify-center gap-2 px-6 py-3 rounded-lg
        bg-green-600 hover:bg-green-700 text-white font-semibold
        disabled:opacity-50 disabled:cursor-not-allowed transition
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <span>Pay with eSewa</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        </>
      )}
    </button>
  );
}
