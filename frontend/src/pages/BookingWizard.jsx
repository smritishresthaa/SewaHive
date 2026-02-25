import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/axios";
import toast from "react-hot-toast";
import { HiSparkles, HiMapPin, HiClock, HiCalendarDays } from "react-icons/hi2";
import LocationPicker from "../components/UI/LocationPicker";
import { isKycApproved, normalizeKycStatus } from "../utils/kyc";

// Booking page with auto-filled client info (no re-typing profile details)
export default function BookingWizard() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking form state
  const [bookingType, setBookingType] = useState("normal");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [notes, setNotes] = useState("");

  // Prefilled contact + address from profile
  const [contact, setContact] = useState({
    name: user?.profile?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Location: use profile coordinates if available, else fallback to Kathmandu center
  const [location, setLocation] = useState({
    coordinates:
      user?.location?.coordinates?.length === 2
        ? user.location.coordinates
        : [85.3240, 27.7172],
    addressText: "",
    landmark: "",
  });

  useEffect(() => {
    fetchService();
  }, [serviceId]);

  async function fetchService() {
    try {
      const res = await api.get(`/services/${serviceId}`);
      setService(res.data.service);
    } catch (err) {
      toast.error("Service not found");
      navigate("/services");
    } finally {
      setLoading(false);
    }
  }

  const priceBreakdown = useMemo(() => {
    if (!service) return { base: 0, emergencyFee: 0, total: 0 };
    const mode = service.priceMode || "fixed";
    const base =
      mode === "range"
        ? Number(service.priceRange?.min || service.basePrice || 0)
        : mode === "quote_required"
        ? 0
        : Number(service.basePrice || 0);
    const emergencyFee =
      bookingType === "emergency" && mode !== "quote_required"
        ? Number(service.emergencyPrice || 0)
        : 0;
    const platformFee = 0; // set later if needed
    const total = base + emergencyFee + platformFee;
    return { base, emergencyFee, platformFee, total };
  }, [service, bookingType]);

  const pricingDisplay = useMemo(() => {
    if (!service) {
      return {
        headerLabel: "Fixed Price",
        summaryLabel: "Fixed Service Price",
        summaryValue: "NPR 0",
        disclaimer: "",
      };
    }

    const mode = service.priceMode || "fixed";
    if (mode === "range") {
      const min = Number(service.priceRange?.min || service.basePrice || 0);
      const max = Number(service.priceRange?.max || min);
      return {
        headerLabel: "Estimated Range",
        summaryLabel: "Starting from",
        summaryValue: `NPR ${min} - NPR ${max}`,
        disclaimer:
          "The minimum service fee is collected upfront. Extra charges only apply if you approve them during the job.",
      };
    }

    if (mode === "quote_required") {
      return {
        headerLabel: "Estimated Price — Final after inspection",
        summaryLabel: "Estimated Price — Final after inspection",
        summaryValue: "Pay after approval",
        disclaimer:
          "No payment is taken now. Provider sends a quote, you approve it, then escrow payment is collected.",
      };
    }

    const hourlyRate = Number(service.hourlyRate || 0);
    const includedHours = Number(service.includedHours || 0);
    const isHourlyStyle = hourlyRate > 0 && includedHours <= 0;

    return {
      headerLabel: isHourlyStyle ? "Minimum Service Charge" : "Fixed Service Price",
      summaryLabel: isHourlyStyle ? "Minimum Service Charge" : "Fixed Service Price",
      summaryValue: `NPR ${Number(service.basePrice || 0)}`,
      disclaimer: "Full amount is collected into escrow at booking.",
    };
  }, [service]);

  const isProviderVerified = useMemo(() => {
    // Check KYC status from backend response (normalized)
    const kycStatus = service?.providerKycStatus || service?.providerId?.kycStatus;
    const normalized = normalizeKycStatus(kycStatus);
    return isKycApproved(normalized);
  }, [service]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!service) return;

    if (!isProviderVerified) {
      toast.error("Provider is not verified. Booking is disabled.");
      return;
    }

    // For normal booking, require date/time
    if (bookingType === "normal" && (!date || !timeSlot)) {
      toast.error("Please select date and time");
      return;
    }

    // Validate coordinates
    if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      toast.error("Invalid location coordinates. Please set your location.");
      return;
    }

    setSubmitting(true);
    try {
      const payloadBase = {
        serviceId: service._id,
        providerId: service.providerId?._id || service.providerId,
        location: {
          type: "Point",
          coordinates: location.coordinates, // [lng, lat]
        },
        addressText: location.addressText || "",
        landmark: location.landmark || "",
        notes,
      };

      const endpoint = bookingType === "normal" ? "/bookings/create" : "/bookings/emergency-request";
      const requestBody = {
        ...payloadBase,
        type: bookingType,
      };

      if (bookingType === "normal") {
        requestBody.schedule = {
          date,
          slot: timeSlot,
        };
      }

      const res = await api.post(endpoint, requestBody);
        
      const bookingId = res.data.booking?._id || res.data.id;
      if (!bookingId) {
        throw new Error("No booking ID returned from server");
      }

      toast.success("Booking created! ✅");

      if ((service.priceMode || "fixed") === "quote_required") {
        navigate(`/client/bookings/${bookingId}`);
      } else {
        const redirectUrl = `/payment/confirm/${bookingId}`;
        sessionStorage.setItem("pendingPaymentRedirect", redirectUrl);
        window.location.href = redirectUrl;
      }
    } catch (err) {
      console.error("Booking error:", err?.response?.data);
      
      // Show detailed error message
      const errorMsg = err?.response?.data?.message || "Failed to create booking";
      const errors = err?.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        toast.error(
          <div>
            <p className="font-semibold">{errorMsg}</p>
            <ul className="mt-2 text-sm">
              {errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Booking</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {service.title}
            </h1>
            <p className="text-gray-600 mt-2 max-w-3xl">{service.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{pricingDisplay.headerLabel}</p>
            <p className="text-3xl font-bold text-gray-900">{pricingDisplay.summaryValue}</p>
            {service.emergencyPrice > 0 && (
              <p className="text-sm text-orange-600 font-medium">
                Emergency: NPR {service.emergencyPrice}
              </p>
            )}
          </div>
        </div>

        {!isProviderVerified && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            🚫 Not Verified - Booking Disabled. This provider cannot be booked until KYC is approved.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid lg:grid-cols-3 gap-6 items-start"
        >
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Type */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Type</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {["normal", "emergency"].map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setBookingType(type)}
                    disabled={!isProviderVerified}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      bookingType === type
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold capitalize">{type}</div>
                      {type === "emergency" && <HiSparkles className="text-orange-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {type === "normal"
                        ? "Pick a date & time"
                        : "Immediate request to providers"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule (only for normal) */}
            {bookingType === "normal" && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-4">Schedule</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <HiCalendarDays /> Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <HiClock /> Time
                    </label>
                    <input
                      type="time"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address & Notes */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
                <HiMapPin className="text-emerald-600" /> Service Location
              </div>

              <LocationPicker
                initialCoords={location.coordinates}
                initialAddress={location.addressText}
                initialLandmark={location.landmark}
                onLocationChange={(newLocation) => setLocation(newLocation)}
                label="Where should we provide the service?"
              />

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Any specifics your provider should know?"
                />
              </div>
            </div>
          </div>

          {/* Right column: summary & contact */}
          <div className="space-y-4">
            {/* Provider Trust Panel */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Provider Details</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-lg">
                  {service.providerId?.profile?.name?.charAt(0).toUpperCase() || "P"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    {service.providerId?.profile?.name || "Provider"}
                    {service.providerId?.providerDetails?.badges?.includes('Verified Provider') && (
                      <span className="text-emerald-500 text-sm" title="Verified Provider">✓</span>
                    )}
                  </p>
                  {service.providerId?.providerDetails?.trustScore > 0 && (
                    <p className="text-xs text-gray-500">
                      Trust Score: <span className="font-medium text-emerald-600">{service.providerId.providerDetails.trustScore}/100</span>
                    </p>
                  )}
                </div>
              </div>
              
              {service.providerId?.providerDetails?.badges && service.providerId.providerDetails.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {service.providerId.providerDetails.badges.map((badge, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Rating</span>
                  <span className="font-medium text-gray-900">
                    {service.providerId?.providerDetails?.metrics?.ratingQuality?.toFixed(1) || "New"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Jobs</span>
                  <span className="font-medium text-gray-900">
                    {service.providerId?.providerDetails?.metrics?.completedJobs || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Your Contact</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <input
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <input
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <input
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-4">Price Summary</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>{pricingDisplay.summaryLabel}</span>
                  <span>
                    {(service.priceMode || "fixed") === "quote_required"
                      ? "Pay after quote"
                      : `NPR ${priceBreakdown.base}`}
                  </span>
                </div>
                {bookingType === "emergency" && (
                  <div className="flex justify-between text-orange-600 font-medium">
                    <span>Emergency fee</span>
                    <span>NPR {priceBreakdown.emergencyFee}</span>
                  </div>
                )}
                {priceBreakdown.platformFee > 0 && (
                  <div className="flex justify-between">
                    <span>Platform fee</span>
                    <span>NPR {priceBreakdown.platformFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                  <span>
                    {(service.priceMode || "fixed") === "quote_required"
                      ? "Payable now"
                      : "Total Amount"}
                  </span>
                  <span>
                    {(service.priceMode || "fixed") === "quote_required"
                      ? "NPR 0"
                      : `NPR ${priceBreakdown.total}`}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-600">{pricingDisplay.disclaimer}</p>

              {/* Escrow Protection Message */}
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-800 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>
                    <strong>Payment Protection:</strong> Your payment will be held securely and released to the provider only after you confirm service completion.
                  </span>
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !isProviderVerified}
                className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {(service.priceMode || "fixed") === "quote_required"
                      ? "Submit Quote Request"
                      : "Confirm Booking & Proceed to Payment"}
                  </>
                )}
              </button>
              {!isProviderVerified && (
                <p className="text-xs text-center text-amber-700 mt-2">
                  Provider verification required before booking.
                </p>
              )}
              <p className="text-xs text-center text-gray-500 mt-3">
                You'll review payment details on the next step.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
