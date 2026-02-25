// pages/client/PaymentFailure.jsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiXCircle } from 'react-icons/hi';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get('error');
  const transactionUuid = searchParams.get('transaction_uuid');

  const errorMessages = {
    no_data: 'No payment data received from eSewa',
    invalid_data: 'Invalid payment response data',
    payment_not_found: 'Payment record not found',
    payment_incomplete: 'Payment could not be completed',
    verification_failed: 'Payment verification failed',
    unknown: 'An unknown error occurred',
  };

  const errorMessage = errorMessages[error] || 'Payment was unsuccessful';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-400 rounded-full blur-2xl opacity-30 animate-pulse" />
            <HiXCircle className="relative w-24 h-24 md:w-32 md:h-32 text-red-600" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Payment Failed
          </h1>
          <p className="text-gray-600 text-lg">
            {errorMessage}
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>What Happened?</span>
          </h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">•</span>
              <span>Your payment could not be processed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">•</span>
              <span>No money has been deducted from your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold mt-0.5">•</span>
              <span>Your booking is still pending payment</span>
            </li>
          </ul>

          {transactionUuid && transactionUuid !== 'unknown' && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-xs text-red-700">
                <span className="font-semibold">Reference: </span>
                <span className="font-mono">{transactionUuid}</span>
              </p>
            </div>
          )}
        </div>

        {/* Troubleshooting Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Troubleshooting Tips</span>
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">1.</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">2.</span>
              <span>Verify your eSewa account has sufficient balance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">3.</span>
              <span>Make sure you entered correct credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">4.</span>
              <span>Try again after a few minutes</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/client/bookings')}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Try Payment Again
          </button>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Support */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Need help? Contact our support team at{' '}
          <a href="mailto:support@sewahive.com" className="text-red-600 hover:underline">
            support@sewahive.com
          </a>
        </p>
      </div>
    </div>
  );
}
