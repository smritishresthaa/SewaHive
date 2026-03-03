import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axios";
import toast from "react-hot-toast";
import { HiPlus, HiPencil, HiTrash, HiEye, HiEyeSlash, HiChevronDown, HiChevronRight, HiDocumentText, HiExclamationTriangle, HiArrowRight, HiSquares2X2, HiCheckCircle, HiXCircle, HiNoSymbol, HiClipboardDocumentList, HiBoltSlash, HiMagnifyingGlass, HiXMark } from "react-icons/hi2";

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [showServicesModal, setShowServicesModal] = useState(null);
  const [categoryServices, setCategoryServices] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [subcategoryModal, setSubcategoryModal] = useState({
    open: false,
    mode: "add",
    category: null,
    subcategory: null,
  });
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    description: "",
    status: "active",
    sortOrder: 0,
    suggestedPriceMode: "",
  });
  const [subcategorySaving, setSubcategorySaving] = useState(false);
  
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
  });
  const [statsError, setStatsError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    image: "",
    iconKey: "",
    sortOrder: 0,
    recommendedPriceRange: { min: 0, max: 10000 },
    suggestedPriceMode: "",
    adminNotes: "",
    emergencyServiceAllowed: false,
    kycVerificationRequired: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [search, statusFilter]);

  // Auto-refresh categories every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchCategories();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCategories();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return;
      
      try {
        const res = await api.get('/admin/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data.categories);
          setStatsError(null);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStatsError('Failed to load stats');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch pending category requests count
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const res = await api.get('/admin/category-requests?status=pending');
        setPendingRequestsCount(res.data.requests?.length || 0);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      }
    };

    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPendingRequests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function fetchCategories() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const res = await api.get(`/admin/categories?${params}`);
      setCategories(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenForm(category = null) {
    setImageFile(null);
    setImagePreview(null);
    if (category) {
      setEditingId(category._id);
      setImagePreview(category.image || null);
      setFormData({
        name: category.name,
        description: category.description,
        icon: category.icon || "",
        image: category.image || "",
        iconKey: category.iconKey || "",
        sortOrder: Number.isFinite(Number(category.sortOrder)) ? Number(category.sortOrder) : 0,
        recommendedPriceRange: category.recommendedPriceRange || {
          min: 0,
          max: 10000,
        },
        suggestedPriceMode: category.suggestedPriceMode || "",
        adminNotes: category.adminNotes || "",
        emergencyServiceAllowed: category.emergencyServiceAllowed || false,
        kycVerificationRequired: category.kycVerificationRequired || false,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        icon: "",
        image: "",
        iconKey: "",
        sortOrder: 0,
        recommendedPriceRange: { min: 0, max: 10000 },
        suggestedPriceMode: "",
        adminNotes: "",
        emergencyServiceAllowed: false,
        kycVerificationRequired: false,
      });
    }
    setShowForm(true);
  }

  async function fetchCategoryServices(categoryId) {
    try {
      setLoadingServices(true);
      const res = await api.get(`/admin/categories/${categoryId}/services`);
      setCategoryServices(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load services");
    } finally {
      setLoadingServices(false);
    }
  }

  function handleViewServices(category) {
    setShowServicesModal(category);
    fetchCategoryServices(category._id);
  }

  function toggleExpandRow(categoryId) {
    setExpandedRows(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }

  async function handleDeleteCategory(categoryId) {
    try {
      await api.delete(`/admin/categories/${categoryId}`);
      setCategories(categories.filter(c => c._id !== categoryId));
      toast.success("Category deleted successfully");
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.description) {
      toast.error("Name and description are required");
      return;
    }

    try {
      let savedCategory;

      if (editingId) {
        // Update
        const res = await api.put(`/admin/categories/${editingId}`, formData);
        savedCategory = res.data.data;
      } else {
        // Create
        const res = await api.post("/admin/categories", formData);
        savedCategory = res.data.data;
      }

      // Upload image if a new file was selected
      if (imageFile && savedCategory?._id) {
        setUploadingImage(true);
        try {
          const fd = new FormData();
          fd.append("image", imageFile);
          const imgRes = await api.post(
            `/admin/categories/${savedCategory._id}/image`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          savedCategory = imgRes.data.data.category || savedCategory;
          savedCategory.image = imgRes.data.data.image;
        } catch (imgErr) {
          console.error("Image upload failed:", imgErr);
          toast.error("Category saved but image upload failed");
        } finally {
          setUploadingImage(false);
        }
      }

      if (editingId) {
        setCategories(categories.map((c) => (c._id === editingId ? savedCategory : c)));
        toast.success("Category updated successfully");
      } else {
        setCategories([savedCategory, ...categories]);
        toast.success("Category created successfully");
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save category");
    }
  }

  async function handleToggleStatus(categoryId, currentStatus) {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await api.patch(`/admin/categories/${categoryId}/status`, {
        status: newStatus,
      });
      
      // Refresh categories to get updated data
      await fetchCategories();
      toast.success(`Category ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
      setShowDisableConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  }

  function openSubcategoryModal(category, subcategory = null) {
    setSubcategoryModal({
      open: true,
      mode: subcategory ? "edit" : "add",
      category,
      subcategory,
    });
    setSubcategoryForm({
      name: subcategory?.name || "",
      description: subcategory?.description || "",
      status: subcategory?.status || "active",
      sortOrder: Number.isFinite(Number(subcategory?.sortOrder)) ? Number(subcategory.sortOrder) : 0,
      suggestedPriceMode: subcategory?.suggestedPriceMode || "",
    });
  }

  function closeSubcategoryModal() {
    setSubcategoryModal({ open: false, mode: "add", category: null, subcategory: null });
    setSubcategoryForm({ name: "", description: "", status: "active", sortOrder: 0, suggestedPriceMode: "" });
  }

  async function handleSubcategorySave() {
    if (!subcategoryForm.name.trim()) {
      toast.error("Subcategory name is required");
      return;
    }

    setSubcategorySaving(true);
    try {
      if (subcategoryModal.mode === "edit" && subcategoryModal.subcategory?._id) {
        await api.put(`/admin/subcategories/${subcategoryModal.subcategory._id}`, {
          name: subcategoryForm.name,
          description: subcategoryForm.description,
          status: subcategoryForm.status,
          sortOrder: Number(subcategoryForm.sortOrder) || 0,
          suggestedPriceMode: subcategoryForm.suggestedPriceMode || "",
        });
        toast.success("Subcategory updated");
      } else {
        await api.post('/admin/subcategories', {
          categoryId: subcategoryModal.category?._id,
          name: subcategoryForm.name,
          description: subcategoryForm.description,
          status: subcategoryForm.status,
          sortOrder: Number(subcategoryForm.sortOrder) || 0,
          suggestedPriceMode: subcategoryForm.suggestedPriceMode || "",
        });
        toast.success("Subcategory created");
      }

      await fetchCategories();
      closeSubcategoryModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save subcategory");
    } finally {
      setSubcategorySaving(false);
    }
  }

  async function handleSubcategoryStatus(subcategory, nextStatus) {
    try {
      await api.patch(`/admin/subcategories/${subcategory._id}/status`, { status: nextStatus });
      await fetchCategories();
      toast.success(`Subcategory ${nextStatus === 'active' ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update subcategory status");
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Manage service categories (Auto-updates every 30s)</p>
        </div>
        <div className="flex gap-3">
          {/* Category Requests Button */}
          {pendingRequestsCount > 0 && (
            <button
              onClick={() => navigate('/category-requests')}
              className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <HiDocumentText className="w-5 h-5" />
              <span>Category Requests</span>
              <span className="ml-1 px-2.5 py-0.5 bg-blue-800 rounded-full text-xs font-bold">
                {pendingRequestsCount}
              </span>
            </button>
          )}
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            <HiPlus className="w-5 h-5" />
            New Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsError && (
        <div className="mb-4 p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4" /> {statsError}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Categories', value: stats.totalCategories, Icon: HiSquares2X2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
          { label: 'Active', value: stats.activeCategories, Icon: HiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
          { label: 'Inactive', value: stats.inactiveCategories, Icon: HiNoSymbol, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-400' },
          { label: 'Pending Requests', value: pendingRequestsCount, Icon: HiClipboardDocumentList, color: pendingRequestsCount > 0 ? 'text-blue-600' : 'text-gray-400', bg: pendingRequestsCount > 0 ? 'bg-blue-50' : 'bg-gray-50', border: pendingRequestsCount > 0 ? 'border-blue-500' : 'border-gray-400', onClick: () => navigate('/category-requests') },
        ].map(kpi => (
          <div key={kpi.label} onClick={kpi.onClick} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow ${kpi.onClick ? 'cursor-pointer' : ''}`}>
            <div className={`${kpi.bg} rounded-full p-2`}><kpi.Icon className={`w-5 h-5 ${kpi.color}`} /></div>
            <div>
              <p className="text-[10px] text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
              {kpi.onClick && pendingRequestsCount > 0 && (
                <p className="text-[10px] text-blue-600 font-semibold mt-0.5 flex items-center gap-0.5">Review <HiArrowRight className="w-2.5 h-2.5" /></p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 inset-y-0 flex items-center pointer-events-none">
                <HiMagnifyingGlass className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-500">No categories found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                <tr>
                  <th className="w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Icon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" title="Click to view services">
                    Services
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" title="Auto-calculated from actual services">
                    Price Range
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <React.Fragment key={category._id}>
                    <tr className={`hover:bg-green-50 transition ${category.status === 'inactive' ? 'opacity-60' : ''}`}>
                      <td className="px-2">
                        {(category.subcategories?.length > 0 || category.analytics) && (
                          <button
                            onClick={() => toggleExpandRow(category._id)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Expand details"
                          >
                            {expandedRows[category._id] ? (
                              <HiChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <HiChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {category.icon ? (
                          <span className="text-3xl">{category.icon}</span>
                        ) : category.image ? (
                          <img src={category.image} alt={category.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <span className="text-green-700 text-lg font-bold">{category.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            {category.name}
                            {category.emergencyServiceAllowed && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded" title="Emergency services allowed">
                                Emergency
                              </span>
                            )}
                            {category.kycVerificationRequired && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded" title="KYC verification required">
                                <HiCheckCircle className="w-3 h-3" /> KYC Req
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {category.description.substring(0, 50)}{category.description.length > 50 ? '...' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleViewServices(category)}
                          className="flex flex-col gap-1 hover:bg-blue-50 p-2 rounded transition"
                          title="Click to view services"
                        >
                          <span className="text-sm font-semibold text-blue-600 cursor-pointer">
                            {category.serviceCount || 0} total
                          </span>
                          <span className="text-xs text-green-600">
                            {category.activeServiceCount || 0} active
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {category.dynamicPriceRange ? (
                            <>
                              <div className="font-medium text-green-700">₹{category.dynamicPriceRange.min.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">to ₹{category.dynamicPriceRange.max.toLocaleString()}</div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium">₹{category.recommendedPriceRange?.min || 0}</div>
                              <div className="text-xs text-gray-500">to ₹{category.recommendedPriceRange?.max || 10000}</div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${
                            category.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-gray-100 text-gray-600 ring-gray-200"
                          }`}
                        >
                          {category.status === "active"
                            ? <HiCheckCircle className="w-3.5 h-3.5" />
                            : <HiXCircle className="w-3.5 h-3.5" />}
                          {category.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium">{formatDate(category.createdAt)}</div>
                          <div className="text-gray-500 mt-1">
                            {category.createdBy?.profile?.name || category.createdBy?.email?.split('@')[0] || "Admin"}
                          </div>
                        </div>
                      </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => handleOpenForm(category)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                          title="Edit category"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openSubcategoryModal(category)}
                          className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-lg transition"
                          title="Add subcategory"
                        >
                          <HiPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewServices(category)}
                          className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition"
                          title="View services"
                        >
                          <HiDocumentText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDisableConfirm(category)}
                          className={`p-2 rounded-lg transition ${
                            category.status === "active"
                              ? "hover:bg-orange-100 text-orange-600"
                              : "hover:bg-green-100 text-green-600"
                          }`}
                          title={category.status === "active" ? "Disable category" : "Enable category"}
                        >
                          {category.status === "active" ? (
                            <HiEyeSlash className="w-4 h-4" />
                          ) : (
                            <HiEye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(category)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                          title="Delete category"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expandable Row for Subcategories and Analytics */}
                  {expandedRows[category._id] && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="px-12 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Subcategories */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm text-gray-700">Subcategories</h4>
                              <button
                                onClick={() => openSubcategoryModal(category)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                              >
                                Add Subcategory
                              </button>
                            </div>
                            {(category.subcategoriesDetailed || []).length === 0 ? (
                              <div className="text-xs text-gray-500">No subcategories yet.</div>
                            ) : (
                              <div className="space-y-2">
                                {(category.subcategoriesDetailed || []).map((sub) => (
                                  <div key={sub._id} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                                    <div>
                                      <div className="text-sm font-medium text-gray-800">{sub.name}</div>
                                      {sub.description && (
                                        <div className="text-xs text-gray-500">{sub.description}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                          sub.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}
                                      >
                                        {sub.status}
                                      </span>
                                      <button
                                        onClick={() => openSubcategoryModal(category, sub)}
                                        className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                        title="Edit subcategory"
                                      >
                                        <HiPencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSubcategoryStatus(
                                            sub,
                                            sub.status === 'active' ? 'inactive' : 'active'
                                          )
                                        }
                                        className={`p-1 rounded ${
                                          sub.status === 'active'
                                            ? 'hover:bg-orange-100 text-orange-600'
                                            : 'hover:bg-green-100 text-green-600'
                                        }`}
                                        title={sub.status === 'active' ? 'Disable subcategory' : 'Enable subcategory'}
                                      >
                                        {sub.status === 'active' ? (
                                          <HiEyeSlash className="w-4 h-4" />
                                        ) : (
                                          <HiEye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Analytics */}
                          {category.analytics && (
                            <div>
                              <h4 className="font-semibold text-sm text-gray-700 mb-2">Category Analytics</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-500">Providers</div>
                                  <div className="text-lg font-bold text-gray-900">{category.analytics.providerCount}</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-500">Bookings</div>
                                  <div className="text-lg font-bold text-gray-900">{category.analytics.totalBookings}</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-500">Revenue</div>
                                  <div className="text-lg font-bold text-green-600">₹{category.analytics.revenue.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? "Edit Category" : "New Category"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Plumbing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe this service category"
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image
                </label>
                {(imagePreview || formData.image) && (
                  <div className="mb-2 relative inline-block">
                    <img
                      src={imagePreview || formData.image}
                      alt="Category cover"
                      className="h-32 w-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setFormData({ ...formData, image: "" });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      X
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Image must be under 5MB");
                        return;
                      }
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, or WebP. Max 5MB. Recommended: 1200x800px.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon Key
                  </label>
                  <input
                    type="text"
                    value={formData.iconKey}
                    onChange={(e) =>
                      setFormData({ ...formData, iconKey: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., cleaning, plumbing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Pricing Mode
                </label>
                <select
                  value={formData.suggestedPriceMode}
                  onChange={(e) => setFormData({ ...formData, suggestedPriceMode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">No suggestion</option>
                  <option value="fixed">Fixed</option>
                  <option value="range">Range</option>
                  <option value="quote_required">Quote Required</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formData.recommendedPriceRange.min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommendedPriceRange: {
                          ...formData.recommendedPriceRange,
                          min: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formData.recommendedPriceRange.max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommendedPriceRange: {
                          ...formData.recommendedPriceRange,
                          max: parseInt(e.target.value) || 10000,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={formData.adminNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, adminNotes: e.target.value })
                  }
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Internal notes for this category"
                />
              </div>


              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emergencyServiceAllowed}
                    onChange={(e) => setFormData({ ...formData, emergencyServiceAllowed: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Emergency Services</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.kycVerificationRequired}
                    onChange={(e) => setFormData({ ...formData, kycVerificationRequired: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="inline-flex items-center gap-1 text-sm text-gray-700"><HiCheckCircle className="w-4 h-4 text-emerald-600" /> KYC Required</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploadingImage}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? "Uploading Image..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {subcategoryModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-2">
              {subcategoryModal.mode === 'edit' ? 'Edit Subcategory' : 'New Subcategory'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {subcategoryModal.category?.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Deep Cleaning"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Optional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={subcategoryForm.status}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={subcategoryForm.sortOrder}
                    onChange={(e) =>
                      setSubcategoryForm({
                        ...subcategoryForm,
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Pricing Mode
                </label>
                <select
                  value={subcategoryForm.suggestedPriceMode}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, suggestedPriceMode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- No suggestion --</option>
                  <option value="fixed">Fixed Pricing</option>
                  <option value="range">Price Range</option>
                  <option value="quote_required">Quote Required</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Guidance only - providers can choose any pricing mode</p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={closeSubcategoryModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubcategorySave}
                disabled={subcategorySaving}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-60"
              >
                {subcategorySaving ? 'Saving...' : 'Save Subcategory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Services in {showServicesModal.name}</h2>
              <button
                onClick={() => setShowServicesModal(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            
            {loadingServices ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : categoryServices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No services found in this category</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Service</th>
                      <th className="px-4 py-2 text-left">Provider</th>
                      <th className="px-4 py-2 text-left">Price</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categoryServices.map((service) => (
                      <tr key={service._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{service.title}</div>
                          <div className="text-xs text-gray-500">{service.subcategory || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{service.providerId?.profile?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{service.providerId?.email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{service.pricing?.basePrice || 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            service.isActive && !service.adminDisabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {service.isActive && !service.adminDisabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <HiTrash className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Category</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
            </p>
            
            {showDeleteConfirm.serviceCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <HiExclamationTriangle className="w-4 h-4 text-amber-500 inline mr-1" /> This category has <strong>{showDeleteConfirm.serviceCount} services</strong>. 
                  You must reassign or delete them first.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(showDeleteConfirm._id)}
                disabled={showDeleteConfirm.serviceCount > 0}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  showDeleteConfirm.serviceCount > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                showDisableConfirm.status === 'active' ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                <HiExclamationTriangle className={`w-6 h-6 ${
                  showDisableConfirm.status === 'active' ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {showDisableConfirm.status === 'active' ? 'Disable' : 'Enable'} Category
                </h3>
                <p className="text-sm text-gray-600">Confirm this action</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-2">
              {showDisableConfirm.status === 'active' ? (
                <>Disabling <strong>{showDisableConfirm.name}</strong> will hide all related services from providers.</>
              ) : (
                <>Enable <strong>{showDisableConfirm.name}</strong> and make it visible again?</>
              )}
            </p>
            
            {showDisableConfirm.status === 'active' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">
                  <HiExclamationTriangle className="w-4 h-4 text-amber-500 inline mr-1" /> <strong>{showDisableConfirm.activeServiceCount || 0} active services</strong> will be automatically disabled.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDisableConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleStatus(showDisableConfirm._id, showDisableConfirm.status)}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  showDisableConfirm.status === 'active'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {showDisableConfirm.status === 'active' ? 'Disable' : 'Enable'} Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
