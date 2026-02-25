import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProviderLayout from "../../layouts/ProviderLayout";
import api from "../../utils/axios";
import toast from "react-hot-toast";
import { isKycApproved, normalizeKycStatus } from "../../utils/kyc";

export default function ServiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [inactiveCategory, setInactiveCategory] = useState(null);
  const [inactiveSubcategory, setInactiveSubcategory] = useState(null);
  const [showCategoryRequestModal, setShowCategoryRequestModal] = useState(false);
  const [categoryRequest, setCategoryRequest] = useState({
    name: "",
    description: "",
    justification: "",
  });
  const [kycStatus, setKycStatus] = useState(null); // PHASE 2A: Track KYC status
  const [form, setForm] = useState({
    categoryId: "",
    subcategoryId: "",
    title: "",
    description: "",
    
    // Pricing mode
    priceMode: "fixed", // fixed, range, quote_required
    
    // Fixed price fields
    basePrice: "",
    emergencyPrice: "",
    includedHours: "",
    hourlyRate: "",
    fixedRate: "",
    
    // Range price fields
    priceRangeMin: "",
    priceRangeMax: "",
    
    // Quote mode
    quoteDescription: "",
    visitFee: "",
    
    availability: [],
    images: [],
  });

  useEffect(() => {
    fetchCategories();
    fetchKycStatus(); // PHASE 2A: Check KYC status
    if (isEdit) {
      fetchService();
    }
  }, [id]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      return;
    }
    fetchSubcategories(form.categoryId);
  }, [form.categoryId]);

  // PHASE 2A: Fetch KYC status
  async function fetchKycStatus() {
    try {
      const res = await api.get("/providers/verification");
      setKycStatus(res.data?.verification || null);
    } catch (err) {
      console.error("Failed to load KYC status:", err);
      setKycStatus(null);
    }
  }

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
            fetchCategories();
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

  async function fetchCategories() {
    try {
      const res = await api.get("/providers/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      // Fallback: use legacy categories
      toast.info("Using default categories");
    }
  }

  async function fetchSubcategories(categoryId) {
    try {
      setLoadingSubcategories(true);
      const res = await api.get("/providers/subcategories", { params: { categoryId } });
      setSubcategories(res.data.subcategories || []);
    } catch (err) {
      console.error("Failed to load subcategories:", err);
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function fetchService() {
    try {
      const res = await api.get(`/services/${id}`);
      const service = res.data.service;
      if (service.categoryId?.status === "inactive") {
        setInactiveCategory(service.categoryId);
      }
      if (service.subcategoryId?.status === "inactive") {
        setInactiveSubcategory(service.subcategoryId);
      }
      setForm({
        categoryId: service.categoryId?._id || service.categoryId || "",
        subcategoryId: service.subcategoryId?._id || service.subcategoryId || "",
        title: service.title || "",
        description: service.description || "",
        priceMode: service.priceMode || "fixed",
        basePrice: service.basePrice || "",
        emergencyPrice: service.emergencyPrice || "",
        includedHours: service.includedHours || "",
        hourlyRate: service.hourlyRate || "",
        fixedRate: service.fixedRate || "",
        priceRangeMin: service.priceRange?.min || "",
        priceRangeMax: service.priceRange?.max || "",
        quoteDescription: service.quoteDescription || "",
        visitFee: service.visitFee || "",
        availability: service.availability || [],
        images: service.images || [],
      });
    } catch (err) {
      console.log("Service endpoint not available:", err.message);
      // Silently navigate back if service doesn't exist
      navigate("/provider/services");
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCategoryChange(e) {
    const selectedId = e.target.value;
    setForm({ ...form, categoryId: selectedId, subcategoryId: "" });
    setInactiveSubcategory(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (!form.title || !form.categoryId || !form.description) {
      toast.error("Please fill title, category, and description");
      return;
    }

    // Validate pricing
    if (form.priceMode === "fixed" && !form.basePrice) {
      toast.error("Please enter base price for fixed pricing");
      return;
    }
    if (form.priceMode === "range" && (!form.priceRangeMin || !form.priceRangeMax)) {
      toast.error("Please enter min and max price for range pricing");
      return;
    }
    if (form.priceMode === "quote_required" && !form.quoteDescription) {
      toast.error("Please describe what needs quote for quote-based pricing");
      return;
    }

    const normalizedKycStatus = normalizeKycStatus(kycStatus?.status);
    const canPublish = isKycApproved(normalizedKycStatus);
    if (!canPublish) {
      toast.error(
        "⚠️ KYC verification required to publish services. Your service will be saved as a draft.",
        { duration: 5000 }
      );
    }

    setLoading(true);

    try {
      const payload = {
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
        title: form.title,
        description: form.description,
        priceMode: form.priceMode,
      };

      // Add pricing based on mode
      if (form.priceMode === "fixed") {
        payload.basePrice = Number(form.basePrice);
        payload.emergencyPrice = Number(form.emergencyPrice) || 0;
        payload.includedHours = Number(form.includedHours) || 0;
        payload.hourlyRate = Number(form.hourlyRate) || 0;
        payload.fixedRate = Number(form.fixedRate) || 0;
      } else if (form.priceMode === "range") {
        payload.basePrice = Number(form.priceRangeMin); // fallback
        payload.priceRange = {
          min: Number(form.priceRangeMin),
          max: Number(form.priceRangeMax),
        };
      } else if (form.priceMode === "quote_required") {
        payload.basePrice = 0; // Placeholder
        payload.quoteDescription = form.quoteDescription;
        payload.visitFee = Number(form.visitFee) || 0;
      }

      if (isEdit) {
        await api.post(`/services/update/${id}`, payload);
        toast.success("Service updated successfully ✅");
      } else {
        payload.isActive = canPublish;
        await api.post("/services/create", payload);
        toast.success("Service created successfully ✅");
      }

      navigate("/provider/services");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save service");
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryRequest(e) {
    e.preventDefault();
    
    if (!categoryRequest.name || !categoryRequest.justification) {
      toast.error("Please fill category name and justification");
      return;
    }

    try {
      const res = await api.post("/providers/category-requests", categoryRequest);
      toast.success("Category request submitted! Awaiting admin approval ⏳");
      setShowCategoryRequestModal(false);
      setCategoryRequest({ name: "", description: "", justification: "" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit request");
    }
  }

  const availableCategories = inactiveCategory && !categories.find((cat) => cat._id === inactiveCategory._id)
    ? [inactiveCategory, ...categories]
    : categories;

  const availableSubcategories = inactiveSubcategory && !subcategories.find((sub) => sub._id === inactiveSubcategory._id)
    ? [inactiveSubcategory, ...subcategories]
    : subcategories;

  const selectedCategory = availableCategories.find((cat) => cat._id === form.categoryId);
  const categoryInactive = selectedCategory?.status === "inactive";
  const selectedSubcategory = availableSubcategories.find((sub) => sub._id === form.subcategoryId);



  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Service" : "Create New Service"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEdit ? "Update your service details" : "Add a new service offering"}
          </p>
        </div>

        {/* PHASE 2A: KYC Warning Banner */}
        {kycStatus && normalizeKycStatus(kycStatus.status) !== "approved" && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">KYC Verification Required</h3>
                <p className="text-sm text-amber-800 mt-1">
                  {normalizeKycStatus(kycStatus.status) === "pending_review"
                    ? "Your KYC is under review. You can create draft services, but cannot publish them until approved."
                    : normalizeKycStatus(kycStatus.status) === "needs_correction"
                    ? "Your KYC needs correction. Please fix and resubmit to publish services."
                    : "You must complete KYC verification to publish services. You can save drafts in the meantime."}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/provider/verification")}
                  className="text-sm text-amber-700 hover:text-amber-900 underline font-medium mt-2"
                >
                  Go to KYC Verification →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Service Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Title *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Professional Home Cleaning"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Service Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe what you offer, your experience, and what makes your service unique..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            {categoryInactive && (
              <div className="mt-3 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
                Category disabled. Existing services can be edited, but you cannot create new services under this category.
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Service Category *
            </label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleCategoryChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium"
              required
            >
              <option value="">🔍 Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
            
            {/* Selected Category Info Card */}
            {form.categoryId && (
              <div className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-2">
                {selectedCategory ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{selectedCategory.icon || '📦'}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{selectedCategory.name}</h4>
                        <p className="text-sm text-gray-600">{selectedCategory.description}</p>
                      </div>
                    </div>

                    {/* Requirements Badges */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedCategory.kycVerificationRequired && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                          🔐 KYC Required
                        </span>
                      )}
                      {selectedCategory.emergencyServiceAllowed && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                          ⚡ Emergency Available
                        </span>
                      )}
                    </div>

                    {/* Price Range Info */}
                    {selectedCategory.recommendedPriceRange && (
                      <div className="text-xs text-gray-600 pt-2 border-t border-green-200">
                        💰 Typical range: NPR {selectedCategory.recommendedPriceRange.min?.toLocaleString()} - {selectedCategory.recommendedPriceRange.max?.toLocaleString()}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
            
            {/* Request New Category */}
            <button
              type="button"
              onClick={() => setShowCategoryRequestModal(true)}
              className="mt-4 w-full px-4 py-2.5 border-2 border-dashed border-green-400 text-green-700 hover:bg-green-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Don't see your category? Request one →
            </button>
          </div>

          {/* Subcategory Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Subcategory <span className="text-xs text-gray-500">(recommended)</span>
            </label>
            <select
              name="subcategoryId"
              value={form.subcategoryId}
              onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium"
              disabled={!form.categoryId || loadingSubcategories}
            >
              <option value="">Select a subcategory</option>
              {availableSubcategories.map((sub) => (
                <option key={sub._id} value={sub._id} disabled={sub.status === "inactive"}>
                  {sub.name}
                  {sub.status === "inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
            {form.categoryId && !loadingSubcategories && availableSubcategories.length === 0 && (
              <div className="mt-2 text-xs text-gray-500">No subcategories available for this category.</div>
            )}
            {selectedSubcategory?.status === "inactive" && (
              <div className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
                Selected subcategory is inactive. Choose another to publish new changes.
              </div>
            )}
          </div>

          {/* Pricing Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pricing Model *
            </label>
            {selectedCategory?.suggestedPriceMode && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Suggested for this category:</strong> {" "}
                  {selectedCategory.suggestedPriceMode === "fixed" && "Fixed Pricing"}
                  {selectedCategory.suggestedPriceMode === "range" && "Price Range"}
                  {selectedCategory.suggestedPriceMode === "quote_required" && "Quote Required"}
                  {". You can choose any pricing model that works for you."}
                </p>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-3">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: form.priceMode === 'fixed' ? '#10b981' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="priceMode"
                  value="fixed"
                  checked={form.priceMode === "fixed"}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Fixed Service Price</p>
                  <p className="text-xs text-gray-600">For standard services</p>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: form.priceMode === 'range' ? '#10b981' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="priceMode"
                  value="range"
                  checked={form.priceMode === "range"}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Price Range</p>
                  <p className="text-xs text-gray-600">Min to Max pricing</p>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: form.priceMode === 'quote_required' ? '#10b981' : '#d1d5db' }}>
                <input
                  type="radio"
                  name="priceMode"
                  value="quote_required"
                  checked={form.priceMode === "quote_required"}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Quote Required</p>
                  <p className="text-xs text-gray-600">Uncertain jobs</p>
                </div>
              </label>
            </div>
          </div>

          {/* Pricing Fields (Dynamic based on mode) */}
          {form.priceMode === "fixed" && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Fixed Pricing</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Service Price / Minimum Service Charge (NPR) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={form.basePrice}
                    onChange={handleChange}
                    placeholder="500"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Price (NPR)
                  </label>
                  <input
                    type="number"
                    name="emergencyPrice"
                    value={form.emergencyPrice}
                    onChange={handleChange}
                    placeholder="1000"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Included Hours
                  </label>
                  <input
                    type="number"
                    name="includedHours"
                    value={form.includedHours}
                    onChange={handleChange}
                    placeholder="1"
                    min="0"
                    step="0.25"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (NPR)
                  </label>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={form.hourlyRate}
                    onChange={handleChange}
                    placeholder="300"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {form.priceMode === "range" && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Price (NPR) *
                  </label>
                  <input
                    type="number"
                    name="priceRangeMin"
                    value={form.priceRangeMin}
                    onChange={handleChange}
                    placeholder="500"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Price (NPR) *
                  </label>
                  <input
                    type="number"
                    name="priceRangeMax"
                    value={form.priceRangeMax}
                    onChange={handleChange}
                    placeholder="2000"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Clients will see "Rs. {form.priceRangeMin || 0} - Rs. {form.priceRangeMax || 0}"
              </p>
            </div>
          )}

          {form.priceMode === "quote_required" && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Quote-Based Pricing</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What details do clients need to provide for a quote? *
                </label>
                <textarea
                  name="quoteDescription"
                  value={form.quoteDescription}
                  onChange={handleChange}
                  rows="3"
                  placeholder="e.g. 'Please describe the damage/issue in detail, provide photos if possible, and let me know your location and available time slots.'"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Fee (NPR) <span className="text-xs text-gray-500">(optional charge to visit and inspect)</span>
                </label>
                <input
                  type="number"
                  name="visitFee"
                  value={form.visitFee}
                  onChange={handleChange}
                  placeholder="500"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Leave blank or set to 0 if no visit fee. This can be charged when client books a site inspection.
                </p>
              </div>

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 With quote-based pricing, clients request a service and you provide a custom quote. This is great for jobs where the cost depends on inspection.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : isEdit ? "Update Service" : "Create Service"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/provider/services")}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          
          {/* PHASE 2A: Draft Mode Notice */}
          {kycStatus && normalizeKycStatus(kycStatus.status) !== "approved" && (
            <div className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              📝 Service will be saved as <strong>draft</strong> until your KYC is approved.
            </div>
          )}
        </form>
      </div>

      {/* Category Request Modal */}
      {showCategoryRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Request a New Category</h3>
                <p className="text-sm text-gray-600 mt-1">Can't find the right category? Submit a request for admin approval</p>
              </div>
              <button
                onClick={() => setShowCategoryRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Existing Categories Reference */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-3">📋 Existing Categories:</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 8).map((cat) => (
                  <span key={cat._id} className="inline-flex items-center gap-1 bg-white border border-blue-200 px-3 py-1 rounded-full text-xs text-gray-700">
                    {cat.icon || '📦'} {cat.name}
                  </span>
                ))}
                {categories.length > 8 && (
                  <span className="text-xs text-blue-700">+ {categories.length - 8} more</span>
                )}
              </div>
            </div>

            <form onSubmit={handleCategoryRequest} className="space-y-5">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📝 Category Name *
                </label>
                <input
                  type="text"
                  value={categoryRequest.name}
                  onChange={(e) => setCategoryRequest({ ...categoryRequest, name: e.target.value })}
                  placeholder="e.g., Plumbing Services, Home Tutoring, Event Planning"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Be specific. For example: "Electrical Wiring" instead of just "Electrical"</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📄 Brief Description (Optional)
                </label>
                <textarea
                  value={categoryRequest.description}
                  onChange={(e) => setCategoryRequest({ ...categoryRequest, description: e.target.value })}
                  placeholder="What does this category cover? E.g., 'Professional cleaning services for homes and offices'"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Justification */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ✨ Why do you need this category? *
                </label>
                <textarea
                  value={categoryRequest.justification}
                  onChange={(e) => setCategoryRequest({ ...categoryRequest, justification: e.target.value })}
                  placeholder="Explain how you'll use this category and what services you'll offer. This helps admins understand your request better."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">💡 Detailed justification = faster approval</p>
              </div>

              {/* Note */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>⏳ What happens next:</strong> An admin will review your request within 24 hours. You'll be notified of approval or rejection.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryRequestModal(false)}
                  className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
