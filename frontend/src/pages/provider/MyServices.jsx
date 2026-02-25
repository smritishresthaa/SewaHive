import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProviderLayout from "../../layouts/ProviderLayout";
import { HiPlus, HiPencil, HiTrash, HiEye } from "react-icons/hi2";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";

export default function MyServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState(null);

  useEffect(() => {
    fetchServices();
    fetchKycStatus();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    let source;
    let retryTimer;

    const connect = () => {
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === "admin_update" && payload?.action === "category_status_changed") {
            fetchServices();
            return;
          }

          if (payload?.event === "notification") {
            const type = payload?.notification?.type;
            if (type === "service_flagged" || type === "service_restored") {
              fetchServices();
            }
          }
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        source.close();
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      if (source) source.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  async function fetchServices() {
    try {
      const res = await api.get("/services/my-services");
      setServices(res.data.services || []);
    } catch (err) {
      console.log("Services endpoint not available yet:", err.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKycStatus() {
    try {
      const res = await api.get("/providers/verification");
      setKycStatus(res.data?.verification || null);
    } catch (err) {
      setKycStatus(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await api.delete(`/services/delete/${id}`);
      toast.success("Service deleted successfully");
      fetchServices();
    } catch (err) {
      toast.error("Failed to delete service");
    }
  }

  async function toggleActive(id, currentStatus) {
    try {
      const canPublish = isKycApproved(normalizeKycStatus(kycStatus?.status));
      if (!currentStatus && !canPublish) {
        toast.error("KYC approval required to activate services.");
        return;
      }
      await api.post(`/services/update/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(currentStatus ? "Service deactivated" : "Service activated");
      fetchServices();
    } catch (err) {
      toast.error("Failed to update service status");
    }
  }

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto">
        {normalizeKycStatus(kycStatus?.status) !== "approved" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ KYC approval required to activate services. You can edit drafts, but publishing is disabled.
          </div>
        )}
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your service offerings
            </p>
          </div>
          <button
            onClick={() => navigate("/provider/services/create")}
            className="bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-800 transition-colors"
          >
            <HiPlus className="text-lg" />
            Add Service
          </button>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🛠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No services yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first service to start receiving bookings
            </p>
            <button
              onClick={() => navigate("/provider/services/create")}
              className="bg-brand-700 text-white px-6 py-2 rounded-lg hover:bg-brand-800 transition-colors"
            >
              Create Service
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                {/* Service Image */}
                <div className="h-48 bg-gray-200 rounded-t-xl overflow-hidden">
                  {service.images?.[0] ? (
                    <img
                      src={service.images[0]}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl">
                      🔧
                    </div>
                  )}
                </div>

                {/* Service Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {service.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        service.adminDisabled
                          ? "bg-red-100 text-red-700"
                          : service.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {service.adminDisabled ? "Restricted" : service.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {service.categoryId?.status === "inactive" && (
                    <div className="mb-3 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
                      Category disabled. You can edit this service, but new services under this category are blocked.
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {service.description || "No description"}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Category</span>
                      <p className="text-sm font-medium text-brand-700">
                        {service.categoryId?.name || service.category || "Uncategorized"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {service.priceMode === "fixed"
                          ? "Fixed Service Price"
                          : service.priceMode === "range"
                          ? "Range"
                          : "Quote required"}
                      </span>
                      <p className="text-lg font-bold text-gray-900">
                        {service.priceMode === "quote_required"
                          ? "Pay after approval"
                          : service.priceMode === "range"
                          ? `NPR ${service.priceRange?.min || service.basePrice} - NPR ${
                              service.priceRange?.max || service.basePrice
                            }`
                          : `NPR ${service.basePrice}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <HiEye className="text-sm" />
                    <span>{service.views || 0} views</span>
                    <span className="mx-1">•</span>
                    <span>{service.bookingsCount || 0} bookings</span>
                    {service.ratingAvg > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <span>⭐ {service.ratingAvg.toFixed(1)}</span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(`/provider/services/edit/${service._id}`)
                      }
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <HiPencil />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(service._id, service.isActive)}
                      disabled={
                        service.adminDisabled ||
                        (!service.isActive && !isKycApproved(normalizeKycStatus(kycStatus?.status)))
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        service.adminDisabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : !service.isActive &&
                            !isKycApproved(normalizeKycStatus(kycStatus?.status))
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-brand-100 text-brand-700 hover:bg-brand-200"
                      }`}
                    >
                      {service.adminDisabled
                        ? "Restricted"
                        : service.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(service._id)}
                      className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      <HiTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
