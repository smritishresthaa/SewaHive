import {
  HiStar,
  HiArrowRight,
  HiCheckCircle,
  HiCube,
  HiShieldCheck,
  HiTrophy,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

/**
 * Rich Service Card Component
 *
 * Props:
 * - service: { _id, title, description, categoryId, subcategoryId, images, basePrice, priceRange, priceMode }
 * - provider: { _id, name, avatar, kycStatus, badges, rating, completionRate, responseTimeMinutes }
 * - onBook: callback when "Book Now" clicked
 */
export default function ServiceCard({ service, provider, onBook }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const categoryName = service.categoryName || service.category?.name || "Service";
  const isProvider = isAuthenticated && user?.role === "provider";

  function handleViewProfile() {
    navigate(`/provider/${provider._id}`);
  }

  function handleBook() {
    if (isAuthenticated && isProvider) {
      toast.error("Providers cannot book services. Please use a client account.");
      return;
    }

    if (!isAuthenticated) {
      toast("Please log in to book a service");
      navigate("/login", { state: { returnTo: `/services` } });
      return;
    }

    if (onBook) {
      onBook(service._id);
    } else {
      navigate(`/booking/${service._id}`);
    }
  }

  function getBadgeIcon(badge) {
    if (badge === "verified" || badge === "Verified Provider") {
      return <HiCheckCircle className="h-3.5 w-3.5" />;
    }
    if (badge === "pro" || badge === "Pro Provider") {
      return <HiShieldCheck className="h-3.5 w-3.5" />;
    }
    if (badge === "top-rated" || badge === "Top Rated") {
      return <HiTrophy className="h-3.5 w-3.5" />;
    }
    return <HiShieldCheck className="h-3.5 w-3.5" />;
  }

  function getBadgeStyles(badge) {
    if (badge === "verified" || badge === "Verified Provider") {
      return { style: "bg-green-100 text-green-700 ring-1 ring-green-600/20", label: "Verified" };
    }
    if (badge === "pro" || badge === "Pro Provider") {
      return { style: "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20", label: "Pro" };
    }
    if (badge === "top-rated" || badge === "Top Rated") {
      return { style: "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20", label: "Top Rated" };
    }
    return { style: "bg-gray-100 text-gray-600", label: badge };
  }

  const providerResponse =
    provider.responseTimeMinutes || provider.responseTimeMinutes === 0
      ? `${Math.round(provider.responseTimeMinutes)}m avg response`
      : "Response time N/A";

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg w-full max-w-full">
      {/* IMAGE SECTION */}
      <div className="relative h-36 xs:h-44 sm:h-48 overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200">
        {service.images?.[0] ? (
          <img
            src={service.images[0]}
            alt={service.title}
            className="h-full w-full max-w-full object-cover transition-transform duration-300 group-hover:scale-110"
            draggable="false"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <HiCube className="h-14 w-14 text-emerald-400 sm:h-16 sm:w-16" />
          </div>
        )}

        <div className="absolute left-2 top-2 xs:left-3 xs:top-3 inline-flex max-w-[70vw] sm:max-w-[70%] items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-brand-700 backdrop-blur xs:px-3 xs:py-1.5 xs:text-[11px] sm:px-4 sm:py-2 sm:text-xs">
          <HiCube className="h-3 w-3 flex-shrink-0 text-emerald-600" />
          <span className="truncate">{categoryName}</span>
        </div>

        {provider.rating?.average > 0 && (
          <div className="absolute right-2 top-2 xs:right-3 xs:top-3 inline-flex max-w-[40vw] sm:max-w-[42%] items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold backdrop-blur xs:px-2.5 xs:py-1.5 sm:px-3 sm:text-sm">
            <HiStar className="flex-shrink-0 text-yellow-500" />
            <span>{provider.rating.average.toFixed(1)}</span>
            <span className="truncate text-[10px] xs:text-[11px] text-gray-600 sm:text-xs">
              ({provider.rating.count})
            </span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 lg:p-5">
        <h3 className="mb-1 line-clamp-2 text-base xs:text-lg sm:text-xl font-bold text-gray-900 break-words">
          {service.title}
        </h3>

        {service.subcategoryName && (
          <p className="mb-2 xs:mb-3 text-xs sm:text-sm text-gray-500 break-words">
            in <span className="font-medium text-brand-700">{service.subcategoryName}</span>
          </p>
        )}

        <p className="mb-3 xs:mb-4 line-clamp-2 flex-1 text-sm sm:text-base text-gray-600 break-words">
          {service.description || "Professional service at your doorstep"}
        </p>

        {/* Provider mini card */}
        <div className="mb-3 xs:mb-4 rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-3">
          <div className="mb-2 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
            <img
              src={provider.avatar || "https://via.placeholder.com/40"}
              alt={provider.name}
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <p className="truncate text-sm font-semibold text-gray-900 break-words max-w-full">
                  {provider.name}
                </p>
                {provider.kycStatus === "approved" && (
                  <HiCheckCircle
                    className="h-4 w-4 flex-shrink-0 text-emerald-500"
                    title="Verified"
                  />
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {provider.completionRate}% completion • {providerResponse}
              </p>
            </div>
          </div>

          {provider.badges?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {provider.badges.map((badge, i) => {
                const { style, label } = getBadgeStyles(badge);

                return (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
                  >
                    {getBadgeIcon(badge)} {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-3 xs:mb-4 border-t pt-2 xs:pt-3">
          <p className="mb-1 text-xs sm:text-sm text-gray-500">
            {service.priceMode === "fixed"
              ? "Service Price"
              : service.priceMode === "range"
              ? "Starting from"
              : "Quote required"}
          </p>
          <p className="break-words text-lg xs:text-xl sm:text-2xl font-bold text-gray-900">
            {service.priceMode === "quote_required"
              ? "Quote"
              : service.priceMode === "range"
              ? `NPR ${service.priceRange?.min || service.basePrice} - NPR ${
                  service.priceRange?.max || service.basePrice
                }`
              : `NPR ${service.basePrice}`}
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col gap-2 border-t bg-gray-50 px-3 sm:px-4 py-3 sm:flex-row sm:gap-3">
        <button
          onClick={handleViewProfile}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white w-full sm:w-auto"
        >
          Profile
          <HiArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleBook}
          disabled={isProvider}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors w-full sm:w-auto ${
            isProvider
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-brand-700 text-white hover:bg-brand-800"
          }`}
          title={isProvider ? "Providers cannot book services" : ""}
        >
          Book Now
        </button>
      </div>
    </div>
  );
}