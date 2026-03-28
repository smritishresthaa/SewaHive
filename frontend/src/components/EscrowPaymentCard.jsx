// components/EscrowPaymentCard.jsx
import { HiCheckCircle, HiShieldCheck, HiInformationCircle, HiCreditCard, HiWrenchScrewdriver, HiBanknotes } from 'react-icons/hi2';
import EsewaPaymentButton from './EsewaPaymentButton';

export default function EscrowPaymentCard({ booking, disabled = false }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-6 border border-emerald-200 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <HiShieldCheck className="w-6 h-6 text-emerald-600" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Secure Payment (Escrow)</h3>
      </div>

      {/* Trust Message */}
      <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-emerald-200">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <HiInformationCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              How Escrow Works
            </p>
            <ol className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center gap-1.5"><HiCreditCard className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="font-medium">You pay now</span> - Funds are securely held</li>
              <li className="flex items-center gap-1.5"><HiWrenchScrewdriver className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="font-medium">Service is done</span> - Provider completes work</li>
              <li className="flex items-center gap-1.5"><HiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="font-medium">You confirm</span> - Review and approve completion</li>
              <li className="flex items-center gap-1.5"><HiBanknotes className="w-4 h-4 text-emerald-600 shrink-0" /> <span className="font-medium">Payment releases</span> - Provider receives payment</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 space-y-2 border border-gray-200">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600">Service Price</span>
          <span className="font-medium">NPR {booking.price?.toLocaleString()}</span>
        </div>
        {booking.emergencyFee > 0 && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Emergency Fee</span>
            <span className="font-medium text-orange-600">NPR {booking.emergencyFee?.toLocaleString()}</span>
          </div>
        )}
        {booking.platformFee > 0 && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Platform Fee</span>
            <span className="font-medium">NPR {booking.platformFee?.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="font-semibold text-gray-900">Total (Held Securely)</span>
          <span className="text-base sm:text-lg font-bold text-emerald-600">
            NPR {booking.totalAmount?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment Button */}
      <EsewaPaymentButton
        bookingId={booking._id}
        amount={booking.totalAmount}
        disabled={disabled}
        className="w-full"
      />

      {/* Safety Info */}
      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <p className="text-xs text-emerald-800">
          <HiCheckCircle className="w-4 h-4 inline mr-2" />
          <span className="font-medium">100% Secure & Protected</span> - Funds held by platform until you confirm service completion
        </p>
      </div>
    </div>
  );
}
