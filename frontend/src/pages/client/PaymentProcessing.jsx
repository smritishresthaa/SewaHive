import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function PaymentProcessing() {
  const { bookingId } = useParams();

  useEffect(() => {
    // Allow automatic navigation to eSewa without warning
    // The form will auto-submit and redirect to eSewa without user intervention
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Animated Logo/Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-spin" style={{ animationDuration: '3s' }}></div>
              
              {/* Inner pulsing circle */}
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Redirecting to eSewa
          </h1>
          <p className="text-gray-600 mb-6">
            Please do not close this page or press the back button.
          </p>

          {/* Loading Dots */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* Security Message */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-800 mb-1">
                  Secure Payment Gateway
                </p>
                <p className="text-xs text-emerald-700">
                  You will be redirected to eSewa's secure payment portal. Your payment details are encrypted and protected.
                </p>
              </div>
            </div>
          </div>

          {/* Booking Reference */}
          {bookingId && (
            <p className="text-xs text-gray-500 mt-6">
              Booking Reference: {bookingId.slice(-8).toUpperCase()}
            </p>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          If you are not redirected automatically, please contact support.
        </p>
      </div>
    </div>
  );
}
