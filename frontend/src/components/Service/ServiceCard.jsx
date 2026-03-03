import { HiStar, HiArrowRight, HiCheckCircle, HiCube, HiShieldCheck, HiTrophy } from "react-icons/hi2";
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
export default function ServiceCard({ 
  service, 
  provider, 
  onBook 
}) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const categoryName = service.categoryName || service.category?.name || "Service";
  const categoryIcon = service.categoryIcon || service.category?.icon || null;
  
  const isProvider = isAuthenticated && user?.role === "provider";
  
  function handleViewProfile() {
    navigate(`/provider/${provider._id}`);
  }
  
  function handleBook() {
    // RBAC: Providers cannot book services
    if (isAuthenticated && isProvider) {
      toast.error("Providers cannot book services. Please use a client account.");
      return;
    }
    
    // RBAC: Unauthenticated users get redirected to login
    if (!isAuthenticated) {
      toast("Please log in to book a service");
      navigate("/login", { state: { returnTo: `/services` } });
      return;
    }
    
    // Authenticated client — proceed with booking
    if (onBook) {
      onBook(service._id);
    } else {
      navigate(`/booking/${service._id}`);
    }
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all overflow-hidden group flex flex-col h-full">
      
      {/* IMAGE SECTION (Top) */}
      <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden">
        {service.images?.[0] ? (
          <img
            src={service.images[0]}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiCube className="w-16 h-16 text-emerald-400" />
          </div>
        )}
        
        {/* Category Badge (Corner) */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-brand-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1">
          <HiCube className="w-3 h-3 text-emerald-600" />
          {categoryName}
        </div>
        
        {/* Rating Badge (Corner) */}
        {provider.rating?.average > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1 text-sm font-semibold">
            <HiStar className="text-yellow-500" />
            <span>{provider.rating.average.toFixed(1)}</span>
            <span className="text-xs text-gray-600">({provider.rating.count})</span>
          </div>
        )}
      </div>
      
      {/* SERVICE INFO (Middle) */}
      <div className="p-4 flex-1 flex flex-col">
        
        {/* Service Title & Category */}
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
          {service.title}
        </h3>
        
        {service.subcategoryName && (
          <p className="text-xs text-gray-500 mb-3">
            in <span className="text-brand-700 font-medium">{service.subcategoryName}</span>
          </p>
        )}
        
        {/* Service Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
          {service.description || "Professional service at your doorstep"}
        </p>
        
        {/* Provider Mini Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={provider.avatar || "https://via.placeholder.com/40"}
              alt={provider.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <p className="font-semibold text-sm text-gray-900">{provider.name}</p>
                {provider.kycStatus === "approved" && (
                  <HiCheckCircle className="text-emerald-500 w-4 h-4" title="Verified" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                {provider.completionRate}% completion • {Math.round(provider.responseTimeMinutes)}m avg response
              </p>
            </div>
          </div>
          
          {/* Badges */}
          {provider.badges?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {provider.badges.map((badge, i) => {
                let style = "bg-gray-100 text-gray-600";
                let label = badge;

                function getBadgeIcon(b) {
                  if (b === 'verified' || b === 'Verified Provider') return <HiCheckCircle className="w-3.5 h-3.5" />;
                  if (b === 'pro' || b === 'Pro Provider') return <HiShieldCheck className="w-3.5 h-3.5" />;
                  if (b === 'top-rated' || b === 'Top Rated') return <HiTrophy className="w-3.5 h-3.5" />;
                  return <HiShieldCheck className="w-3.5 h-3.5" />;
                }

                if (badge === 'verified' || badge === 'Verified Provider') {
                  style = "bg-green-100 text-green-700 ring-1 ring-green-600/20";
                  label = "Verified";
                } else if (badge === 'pro' || badge === 'Pro Provider') {
                  style = "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20";
                  label = "Pro";
                } else if (badge === 'top-rated' || badge === 'Top Rated') {
                  style = "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20";
                  label = "Top Rated";
                }

                return (
                  <span 
                    key={i}
                    className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${style}`}
                  >
                    {getBadgeIcon(badge)} {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Price Section */}
        <div className="border-t pt-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">
            {service.priceMode === "fixed"
              ? "Service Price"
              : service.priceMode === "range"
              ? "Starting from"
              : "Quote required"}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {service.priceMode === "quote_required"
              ? "Quote"
              : service.priceMode === "range"
              ? `NPR ${service.priceRange?.min || service.basePrice} - NPR ${service.priceRange?.max || service.basePrice}`
              : `NPR ${service.basePrice}`}
          </p>
        </div>
      </div>
      
      {/* ACTIONS (Bottom) */}
      <div className="border-t px-4 py-3 bg-gray-50 flex gap-2">
        <button
          onClick={handleViewProfile}
          className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium text-sm flex items-center justify-center gap-1"
        >
          Profile
          <HiArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleBook}
          disabled={isProvider}
          className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm ${
            isProvider
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
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