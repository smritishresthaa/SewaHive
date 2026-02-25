import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { HiMapPin, HiCalendar, HiClock, HiUser, HiPhone } from "react-icons/hi2";
import ClientLayout from "../../layouts/ClientLayout";

export default function PaymentConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    console.log("💳 PaymentConfirmation mounted");
    console.log("Booking ID from URL:", bookingId);
    console.log("User:", user?.email, "Role:", user?.role);
    
    if (!bookingId) {
      console.error("❌ No bookingId in URL params!");
      toast.error("Invalid booking reference");
      navigate("/client/bookings");
      return;
    }
    
    fetchBooking();
  }, [bookingId]);

  async function fetchBooking() {
    try {
      console.log("🔍 Fetching booking:", bookingId);
      const res = await api.get(`/bookings/${bookingId}`);
      console.log("✅ Booking fetched successfully:", res.data);
      setBooking(res.data.booking);
    } catch (err) {
      console.error("❌ Error fetching booking:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      toast.error("Booking not found");
      navigate("/client/bookings");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!booking) return;

    setPaying(true);
    try {
      /**
       * ESCROW PAYMENT FLOW:
       * 
       * Step 1: Initiate payment (creates payment record with status = INITIATED)
       *         - Backend generates transaction UUID
       *         - Creates payment record linked to bookingId
       *         - Generates eSewa signature
       *         - Returns payment form data
       * 
       * Step 2: Redirect to eSewa checkout
       *         - User completes payment on eSewa portal
       * 
       * Step 3: eSewa redirects back to success/failure page
       *         - Backend verifies payment via eSewa status API
       *         - If verified:
       *           * payment.status = FUNDS_HELD (escrow)
       *           * booking.status = CONFIRMED
       *         - Funds held securely until service completion
       */
      console.log("Initiating payment for booking:", booking._id, "Amount:", booking.totalAmount);
      
      const { data } = await api.post('/payment/esewa/initiate', {
        bookingId: booking._id,
      });

      console.log("Payment initiation response:", data);

      if (!data.success || !data.form) {
        throw new Error('Failed to initiate payment - invalid response from server');
      }

      const { form } = data;

      // Step 2: Show loading page before redirect
      navigate(`/payment/processing/${booking._id}`);

      // Step 3: Create hidden form and auto-submit to eSewa after brief delay
      setTimeout(() => {
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
        esewaForm.submit();
      }, 500);
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const message = error.response?.data?.message || error.message || 'Failed to initiate payment';
      toast.error(message);
      setPaying(false);
    }
  }

  if (loading || !booking) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  const mode = booking.serviceId?.priceMode || booking.pricing?.mode || "fixed";
  const isHourlyStyle =
    mode === "fixed" &&
    Number(booking.pricing?.hourlyRate || booking.serviceId?.hourlyRate || 0) > 0 &&
    Number(booking.pricing?.includedHours || booking.serviceId?.includedHours || 0) <= 0;
  const baseLabel =
    mode === "fixed"
      ? isHourlyStyle
        ? "Minimum Service Charge"
        : "Fixed Service Price"
      : mode === "range"
      ? "Starting from / Range"
      : "Estimated Price — Final after inspection";
  const pricingHint =
    mode === "fixed"
      ? "Full amount is held in escrow."
      : mode === "range"
      ? "Range jobs collect minimum escrow first. Any approved increase requires client approval."
      : "Quote-required jobs are paid after quote acceptance.";

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Secure Payment</h1>
            <p className="text-gray-600 mt-2">Review your booking and complete payment</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Side - Booking Summary */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
                
                {/* Service Info */}
                <div className="space-y-4">
                  <div className="pb-4 border-b">
                    <p className="text-sm text-gray-500 mb-1">Service</p>
                    <p className="font-semibold text-lg text-gray-900">
                      {booking.serviceId?.title || "Service"}
                    </p>
                    {booking.serviceId?.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.serviceId.description}
                      </p>
                    )}
                  </div>

                  {/* Provider Info */}
                  <div className="pb-4 border-b">
                    <p className="text-sm text-gray-500 mb-2">Provider</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <HiUser className="text-emerald-600 text-xl" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {booking.providerId?.profile?.name || "Provider"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.providerId?.providerDetails?.categories?.[0] || "Service Provider"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule */}
                  {booking.type === "normal" && booking.schedule && (
                    <div className="pb-4 border-b">
                      <p className="text-sm text-gray-500 mb-2">Schedule</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <HiCalendar className="text-emerald-600" />
                          <span className="text-gray-900">
                            {new Date(booking.schedule.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HiClock className="text-emerald-600" />
                          <span className="text-gray-900">{booking.schedule.slot}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.type === "emergency" && (
                    <div className="pb-4 border-b">
                      <div className="flex items-center gap-2 text-orange-600 font-medium">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                        </svg>
                        <span>Emergency Booking - Immediate service</span>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="pb-4 border-b">
                    <p className="text-sm text-gray-500 mb-2">Service Location</p>
                    <div className="flex items-start gap-2 text-sm text-gray-900">
                      <HiMapPin className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <span className="block">{booking.addressText || booking.landmark || "Location specified"}</span>
                        {!!String(booking.landmark || "").trim() && (
                          <span className="block text-xs text-emerald-700">
                            Landmark: {String(booking.landmark).trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Additional Notes</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {booking.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Payment Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-900">Secure Payment</h2>
                </div>

                {/* Amount Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{baseLabel}</span>
                    <span className="font-medium text-gray-900">NPR {booking.price}</span>
                  </div>
                  {booking.emergencyFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Emergency Fee</span>
                      <span className="font-medium text-orange-600">NPR {booking.emergencyFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-3 border-t">
                    <span className="text-gray-900">Escrow payment now</span>
                    <span className="text-emerald-600">NPR {booking.totalAmount}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">{pricingHint}</p>

                {/* Payment Protection Message */}
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-800 flex items-start gap-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      <strong>How it works:</strong> Your payment will be held securely in escrow. Funds are released to the provider only after you confirm the service is completed satisfactorily.
                    </span>
                  </p>
                </div>

                {/* Payment Method Selector */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
                  <div className="space-y-2">
                    <div className="border-2 border-emerald-500 bg-emerald-50 rounded-lg p-4 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                          <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">eSewa Wallet</p>
                          <p className="text-xs text-gray-600">Secure and instant payment</p>
                        </div>
                        <img 
                          src="https://cdn.esewa.com.np/ui/images/logos/esewa_logo.png" 
                          alt="eSewa" 
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    {/* Future payment methods */}
                    <div className="border-2 border-gray-200 bg-gray-50 rounded-lg p-4 opacity-60 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Card Payment</p>
                          <p className="text-xs text-gray-600">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={paying}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Redirecting to eSewa...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span>Pay NPR {booking.totalAmount} via eSewa</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Funds are held safely until job completion. You can raise a dispute if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
