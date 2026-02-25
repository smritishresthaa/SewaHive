import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNavbar from "../components/Navbar/TopNavbar";
import { HiStar, HiMapPin, HiCheckCircle, HiClock, HiFire } from "react-icons/hi2";
import api from "../utils/axios";

export default function PublicProviderProfile() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProvider();
  }, [providerId]);
  
  async function fetchProvider() {
    try {
      setLoading(true);
      const res = await api.get(`/providers/public/${providerId}`);
      setProvider(res.data);
    } catch (err) {
      console.error("Failed to load provider:", err);
    } finally {
      setLoading(false);
    }
  }
  
  function handleBookService(serviceId) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/booking/${serviceId}`);
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-12 w-12 border-4 border-brand-700 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }
  
  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Provider not found</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
          <div className="flex gap-6 items-start">
            <img 
              src={provider.avatar || "https://via.placeholder.com/120"}
              alt={provider.name}
              className="w-32 h-32 rounded-full object-cover"
            />
            
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-2">
                <h1 className="text-3xl font-bold">{provider.name}</h1>
                {provider.isVerified && (
                  <HiCheckCircle className="text-emerald-500 text-2xl" title="Verified Provider" />
                )}
              </div>
              
              {provider.bio && (
                <p className="text-gray-600 mb-4">{provider.bio}</p>
              )}
              
              {/* Trust Signals */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="text-sm">
                  <p className="text-gray-600">Rating</p>
                  <div className="flex items-center gap-1">
                    <HiStar className="text-yellow-500" />
                    <span className="font-bold">{provider.rating.average.toFixed(1)}</span>
                    <span className="text-gray-500">({provider.rating.count})</span>
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-600">Jobs Completed</p>
                  <p className="font-bold text-lg">{provider.completedJobs}</p>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-600">Response Time</p>
                  <div className="flex items-center gap-1">
                    <HiClock className="text-blue-500" />
                    <span className="font-bold">{Math.round(provider.responseTimeMinutes)}m</span>
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-600">Repeat Clients</p>
                  <p className="font-bold">{provider.repeatClients}</p>
                </div>
              </div>
              
              {/* Badges */}
              {provider.badges?.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {provider.badges.map((badge, i) => {
                    let style = "bg-gray-100 text-gray-700 border-gray-200";
                    let icon = "🛡️";
                    let label = badge;

                    if (badge === 'verified' || badge === 'Verified Provider') {
                      style = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20";
                      icon = "✅";
                      label = "Verified Provider";
                    } else if (badge === 'pro' || badge === 'Pro Provider') {
                      style = "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20";
                      icon = "💠";
                      label = "Pro Provider";
                    } else if (badge === 'top-rated' || badge === 'Top Rated') {
                      style = "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20";
                      icon = "🏆";
                      label = "Top Rated";
                    }

                    return (
                      <span 
                        key={i}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${style}`}
                      >
                        <span className="text-lg">{icon}</span> {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Specializations</h2>
          <div className="flex flex-wrap gap-3">
            {provider.approvedCategories?.length > 0 ? (
              provider.approvedCategories.map((cat, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-full font-medium"
                >
                  <span className="text-lg">{cat.icon}</span>
                  {cat.name}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No specializations listed</p>
            )}
          </div>
        </div>
        
        {/* About */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-4">About</h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <p className="text-sm text-gray-600">Experience</p>
                <p className="font-semibold">{provider.yearsOfExperience} years in the field</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trust Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-700 h-2 rounded-full"
                      style={{ width: `${provider.trustScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-lg">{provider.trustScore}/100</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="font-semibold">{Math.round(provider.completionRate)}%</p>
              </div>
            </div>
          </div>
          
          {provider.specializations?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-bold mb-4">Specializations</h2>
              <div className="space-y-2">
                {provider.specializations.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-700">
                    <span className="w-2 h-2 bg-brand-700 rounded-full" />
                    {spec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Portfolio */}
        {provider.portfolio?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Portfolio</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {provider.portfolio.map((item, i) => (
                <a 
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg overflow-hidden bg-gray-100 h-40 hover:shadow-lg transition-all"
                >
                  <img 
                    src={item.url}
                    alt="Portfolio item"
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Services Offered */}
        {provider.services?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">Services Offered</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {provider.services.map(service => (
                <div 
                  key={service._id}
                  className="border rounded-lg overflow-hidden hover:shadow-lg transition-all"
                >
                  {service.image && (
                    <img 
                      src={service.image}
                      alt={service.title}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-xs text-gray-600 mb-1">{service.category}</p>
                    <h3 className="font-bold text-sm mb-1 line-clamp-2">{service.title}</h3>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="font-bold">NPR {service.price}</p>
                      <button
                        onClick={() => handleBookService(service._id)}
                        className="text-sm px-3 py-1 bg-brand-700 text-white rounded hover:bg-brand-800 transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Reviews */}
        {provider.recentReviews?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {provider.recentReviews.map(review => (
                <div key={review._id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3 mb-2">
                    <img 
                      src={review.clientAvatar || "https://via.placeholder.com/40"}
                      alt={review.clientName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{review.clientName}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HiStar 
                            key={i}
                            className={i < review.rating ? "text-yellow-500" : "text-gray-300"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}