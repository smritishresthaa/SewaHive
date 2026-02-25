// pages/client/PaymentSuccess.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiCheckCircle } from 'react-icons/hi';
import api from '../../utils/axios';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const bookingId = searchParams.get('booking_id');
  const transactionUuid = searchParams.get('transaction_uuid');

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  async function fetchBookingDetails() {
    try {
      const { data } = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-30 animate-pulse" />
            <HiCheckCircle className="relative w-24 h-24 md:w-32 md:h-32 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Your payment has been processed successfully.
          </p>
        </div>

        {/* Transaction Details */}
        {!loading && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-4 text-lg">Transaction Details</h2>
            
            {transactionUuid && (
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-mono text-sm text-gray-900 bg-white px-3 py-1 rounded">
                  {transactionUuid.slice(0, 30)}...
                </span>
              </div>
            )}

            {booking && (
              <>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Booking ID</span>
                  <span className="font-mono text-sm text-gray-900">
                    {bookingId?.slice(-8).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-semibold text-green-600 text-xl">
                    NPR {booking.totalAmount?.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium text-gray-900">
                    {booking.serviceId?.title || 'Service'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {booking.status}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* What's Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span>📋</span>
            <span>What's Next?</span>
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Your booking has been confirmed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>The service provider has been notified</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>You'll receive updates via notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Track your booking status in the dashboard</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/client/bookings')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition"
          >
            View My Bookings
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
          Need help? Contact us at{' '}
          <a href="mailto:support@sewahive.com" className="text-green-600 hover:underline">
            support@sewahive.com
          </a>
        </p>
      </div>
    </div>
  );
}
