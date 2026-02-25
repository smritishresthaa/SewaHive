import React, { useEffect, useState } from 'react'
import api from '../utils/axios'

export default function Services() {
  const [stats, setStats] = useState({
    activeServices: 0,
    flaggedServices: 0,
    suspendedServices: 0,
  })
  const [error, setError] = useState(null)
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all')
  const [pricing, setPricing] = useState({
    platformCommission: 15,
    processingFee: 2.5,
    emergencySurcharge: 12,
    minimumServiceFee: 2.0,
    promoDiscountEnabled: true,
  })
  const [categories, setCategories] = useState([])
  const [categoryOverrides, setCategoryOverrides] = useState([])
  const [featuredProviders, setFeaturedProviders] = useState([])
  const [moderationQueue, setModerationQueue] = useState([])
  const [analytics, setAnalytics] = useState({
    topServices: [],
    trendingCategories: [],
    topProviders: [],
  })
  const [modalState, setModalState] = useState({
    type: null,
    category: null,
  })
  const [modalName, setModalName] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [modalSubcategories, setModalSubcategories] = useState('')
  const [modalSubcategory, setModalSubcategory] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const [moderationLoading, setModerationLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchStats = async () => {
    if (document.hidden) return

    try {
      const res = await api.get('/admin/dashboard/stats')
      if (res.data.success) {
        setStats(res.data.data.services)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError('Failed to load stats')
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const PageSection = ({ title, icon, description, children }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <p className="text-gray-600 text-sm mb-6">{description}</p>
      {children}
    </div>
  )

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true)
      const res = await api.get('/admin/categories/summary')
      if (res.data.success) {
        setCategories(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
      setError('Failed to load categories')
    } finally {
      setCatalogLoading(false)
    }
  }

  const fetchPricing = async () => {
    try {
      setPricingLoading(true)
      const res = await api.get('/admin/services/pricing')
      if (res.data.success) {
        setPricing({
          platformCommission: res.data.data.platformCommission,
          processingFee: res.data.data.processingFee,
          emergencySurcharge: res.data.data.emergencySurcharge,
          minimumServiceFee: res.data.data.minimumServiceFee,
          promoDiscountEnabled: res.data.data.promoDiscountEnabled,
        })
        setCategoryOverrides(res.data.data.categoryOverrides || [])
      }
    } catch (err) {
      console.error('Failed to load pricing:', err)
      setError('Failed to load pricing settings')
    } finally {
      setPricingLoading(false)
    }
  }

  const fetchFeaturedProviders = async () => {
    try {
      setFeaturedLoading(true)
      const res = await api.get('/admin/providers/featured', { params: { scope: 'all' } })
      if (res.data.success) {
        setFeaturedProviders(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load featured providers:', err)
      setError('Failed to load featured providers')
    } finally {
      setFeaturedLoading(false)
    }
  }

  const fetchModerationQueue = async () => {
    try {
      setModerationLoading(true)
      const params = {}
      if (serviceSearch.trim()) params.search = serviceSearch.trim()
      if (serviceStatusFilter !== 'all') params.status = serviceStatusFilter

      const res = await api.get('/admin/services/moderation', { params })
      if (res.data.success) {
        setModerationQueue(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load moderation queue:', err)
      setError('Failed to load moderation queue')
    } finally {
      setModerationLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const res = await api.get('/admin/services/analytics')
      if (res.data.success) {
        setAnalytics(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handlePricingUpdate = async () => {
    try {
      setPricingSaving(true)
      await api.put('/admin/services/pricing', {
        ...pricing,
        categoryOverrides: categoryOverrides.map((override) => ({
          categoryId: override.categoryId,
          commission: override.commission,
          emergencySurcharge: override.emergencySurcharge,
        })),
      })
      await fetchPricing()
    } catch (err) {
      console.error('Failed to update pricing:', err)
      setError('Failed to update pricing')
    } finally {
      setPricingSaving(false)
    }
  }

  const closeModal = () => {
    setModalState({ type: null, category: null })
    setModalName('')
    setModalDescription('')
    setModalSubcategories('')
    setModalSubcategory('')
  }

  const openCreateCategoryModal = (category) => {
    setModalState({ type: 'create', category: category || null })
    setModalName(category?.name || '')
    setModalDescription('')
    setModalSubcategories((category?.subcategories || []).join(', '))
  }

  const openEditCategoryModal = (category) => {
    if (!category?._id) {
      openCreateCategoryModal(category)
      return
    }

    setModalState({ type: 'edit', category })
    setModalName(category.name || '')
    setModalSubcategories((category.subcategories || []).join(', '))
  }

  const openAddSubcategoryModal = (category) => {
    if (!category?._id) {
      openCreateCategoryModal(category)
      return
    }

    setModalState({ type: 'add-subcategory', category })
    setModalSubcategory('')
  }

  const openStatusToggleModal = (category) => {
    if (!category?._id) {
      openCreateCategoryModal(category)
      return
    }

    setModalState({ type: 'toggle-status', category })
  }

  const openDeleteModal = (category) => {
    if (!category?._id) {
      openCreateCategoryModal(category)
      return
    }

    setModalState({ type: 'delete', category })
  }

  const handleCategoryEditSave = async () => {
    const category = modalState.category
    if (!category?._id) return

    const name = modalName.trim()
    if (!name) {
      setError('Category name is required')
      return
    }

    const subcategories = modalSubcategories
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      await api.put(`/admin/categories/${category._id}`, {
        name,
        subcategories,
      })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error('Failed to update category:', err)
      setError('Failed to update category')
    }
  }

  const handleCategoryCreateSave = async () => {
    const name = modalName.trim()
    const description = modalDescription.trim()

    if (!name || !description) {
      setError('Category name and description are required')
      return
    }

    const subcategories = modalSubcategories
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      await api.post('/admin/categories', {
        name,
        description,
        subcategories,
      })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error('Failed to create category:', err)
      setError('Failed to create category')
    }
  }

  const handleSubcategorySave = async () => {
    const category = modalState.category
    if (!category?._id) return

    const subcategory = modalSubcategory.trim()
    if (!subcategory) {
      setError('Subcategory name is required')
      return
    }

    try {
      await api.post('/admin/subcategories', {
        categoryId: category._id,
        name: subcategory,
      })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error('Failed to add subcategory:', err)
      setError(err.response?.data?.message || 'Failed to add subcategory')
    }
  }

  const handleStatusToggleConfirm = async () => {
    const category = modalState.category
    if (!category?._id) return

    try {
      const nextStatus = category.status === 'active' ? 'inactive' : 'active'
      await api.patch(`/admin/categories/${category._id}/status`, { status: nextStatus })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error('Failed to update category status:', err)
      setError('Failed to update category status')
    }
  }

  const handleDeleteConfirm = async () => {
    const category = modalState.category
    if (!category?._id) return

    try {
      await api.delete(`/admin/categories/${category._id}`)
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error('Failed to delete category:', err)
      setError('Failed to delete category')
    }
  }

  const handleFeatureToggle = async (provider) => {
    try {
      await api.patch(`/admin/providers/${provider.id}/featured`, { featured: !provider.featured })
      await fetchFeaturedProviders()
    } catch (err) {
      console.error('Failed to update featured providers:', err)
      setError('Failed to update featured providers')
    }
  }

  const handleModerationAction = async (item, action) => {
    try {
      if (action === 'approve') {
        await api.patch(`/admin/services/${item.id}/status`, { status: 'active' })
      } else if (action === 'reject') {
        await api.patch(`/admin/services/${item.id}/status`, {
          status: 'inactive',
          reason: 'Rejected by admin',
        })
      } else if (action === 'suspend') {
        await api.patch(`/admin/services/${item.id}/status`, {
          status: 'inactive',
          reason: 'Suspended by admin',
        })
      }

      await fetchModerationQueue()
      await fetchStats()
    } catch (err) {
      console.error('Failed to update service status:', err)
      setError('Failed to update service status')
    }
  }

  useEffect(() => {
    fetchCatalog()
    fetchPricing()
    fetchFeaturedProviders()
    fetchAnalytics()
  }, [])

  useEffect(() => {
    fetchModerationQueue()
    const interval = setInterval(fetchModerationQueue, 30000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchModerationQueue()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchPricing, 30000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPricing()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAnalytics()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const delay = setTimeout(fetchModerationQueue, 250)
    return () => clearTimeout(delay)
  }, [serviceSearch, serviceStatusFilter])

  const getStatusBadge = (status) => {
    const base = 'px-2 py-1 rounded-full text-xs font-medium'
    if (status === 'active') return `${base} bg-green-100 text-green-700`
    if (status === 'pending') return `${base} bg-yellow-100 text-yellow-700`
    if (status === 'flagged') return `${base} bg-orange-100 text-orange-700`
    if (status === 'suspended') return `${base} bg-red-100 text-red-700`
    if (status === 'inactive') return `${base} bg-gray-200 text-gray-600`
    return `${base} bg-gray-100 text-gray-700`
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Service Management</h1>

      <PageSection
        icon="📚"
        title="Service Catalog Manager"
        description="Manage categories, subcategories, and availability"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-gray-500">
            Create and organize service categories for providers.
          </p>
          <button
            onClick={() => openCreateCategoryModal()}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            Create Category
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subcategories</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Providers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category._id || `derived-${category.name}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {category.subcategories?.length ? category.subcategories.join(', ') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{category.providersCount}</td>
                  <td className="px-4 py-3">
                    <span className={getStatusBadge(category.status)}>{category.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditCategoryModal(category)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openAddSubcategoryModal(category)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Add Subcategory
                      </button>
                      <button
                        onClick={() => openStatusToggleModal(category)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                      >
                        {category.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openDeleteModal(category)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {catalogLoading && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading categories...
                  </td>
                </tr>
              )}
              {!catalogLoading && categories.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection
        icon="💵"
        title="Pricing & Commission Control"
        description="Set platform economics, emergency pricing, and category overrides"
      >
        <div className="border rounded-lg p-5 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" title="Platform cut from each booking">
                Platform Commission
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pricing.platformCommission}
                  onChange={(e) => setPricing({ ...pricing, platformCommission: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Processing Fee</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pricing.processingFee}
                  onChange={(e) => setPricing({ ...pricing, processingFee: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Surcharge</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pricing.emergencySurcharge}
                  onChange={(e) => setPricing({ ...pricing, emergencySurcharge: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Service Fee</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pricing.minimumServiceFee}
                  onChange={(e) => setPricing({ ...pricing, minimumServiceFee: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600 text-sm">NPR</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Promotional Discount</span>
              <button
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  pricing.promoDiscountEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
                onClick={() =>
                  setPricing({ ...pricing, promoDiscountEnabled: !pricing.promoDiscountEnabled })
                }
              >
                {pricing.promoDiscountEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <button
              onClick={handlePricingUpdate}
              disabled={pricingSaving}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-60"
            >
              {pricingSaving ? 'Saving...' : 'Update Pricing'}
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Category Overrides</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                      Commission
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                      Emergency Surcharge
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categoryOverrides.map((override) => (
                    <tr key={override.categoryId || override.categoryName}>
                      <td className="px-4 py-2 font-medium text-gray-900">{override.categoryName}</td>
                      <td className="px-4 py-2 text-gray-700">{override.commission}%</td>
                      <td className="px-4 py-2 text-gray-700">{override.emergencySurcharge}%</td>
                      <td className="px-4 py-2">
                        <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                          Edit Override
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pricingLoading && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">
                        Loading pricing...
                      </td>
                    </tr>
                  )}
                  {!pricingLoading && categoryOverrides.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">
                        No category overrides yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        icon="⭐"
        title="Featured Providers"
        description="Manually promote top providers for homepage visibility"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Featured</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {featuredProviders.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{provider.name}</td>
                  <td className="px-4 py-3 text-gray-700">{provider.category}</td>
                  <td className="px-4 py-3 text-gray-700">{provider.rating}</td>
                  <td className="px-4 py-3">
                    <span className={provider.featured ? getStatusBadge('active') : getStatusBadge('pending')}>
                      {provider.featured ? 'Featured' : 'Available'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleFeatureToggle(provider)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {provider.featured ? 'Remove' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
              {featuredLoading && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading providers...
                  </td>
                </tr>
              )}
              {!featuredLoading && featuredProviders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                    No providers available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection
        icon="🛡️"
        title="Service Moderation"
        description="Review and moderate service listings (Auto-updates every 30s)"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.activeServices}</p>
            <p className="text-gray-600 text-sm mt-2">Active Services</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{stats.flaggedServices}</p>
            <p className="text-gray-600 text-sm mt-2">Flagged for Review</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.suspendedServices}</p>
            <p className="text-gray-600 text-sm mt-2">Suspended</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Search services, providers, categories"
            className="w-full md:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={serviceStatusFilter}
            onChange={(e) => setServiceStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Flag Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moderationQueue.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.service}</td>
                  <td className="px-4 py-3 text-gray-700">{item.provider}</td>
                  <td className="px-4 py-3 text-gray-700">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={getStatusBadge(item.status)}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.flagReason}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleModerationAction(item, 'approve')}
                        className="text-xs font-semibold text-green-600 hover:text-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerationAction(item, 'reject')}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleModerationAction(item, 'suspend')}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {moderationLoading && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading moderation queue...
                  </td>
                </tr>
              )}
              {!moderationLoading && moderationQueue.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                    No services match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection
        icon="📈"
        title="Service Analytics"
        description="Track demand, category growth, and top-performing providers"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Most Booked Services</p>
            <div className="space-y-3">
              {analytics.topServices.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{service.name}</span>
                  <span className="font-semibold text-gray-900">{service.bookings}</span>
                </div>
              ))}
              {analyticsLoading && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
              {!analyticsLoading && analytics.topServices.length === 0 && (
                <div className="text-sm text-gray-500">No data available.</div>
              )}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Trending Categories</p>
            <div className="space-y-3">
              {analytics.trendingCategories.map((category) => (
                <div key={category.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="font-semibold text-green-600">{category.growth}</span>
                </div>
              ))}
              {analyticsLoading && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
              {!analyticsLoading && analytics.trendingCategories.length === 0 && (
                <div className="text-sm text-gray-500">No data available.</div>
              )}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Top Providers</p>
            <div className="space-y-3">
              {analytics.topProviders.map((provider) => (
                <div key={provider.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{provider.name}</span>
                  <span className="font-semibold text-gray-900">{provider.jobs} jobs</span>
                </div>
              ))}
              {analyticsLoading && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
              {!analyticsLoading && analytics.topProviders.length === 0 && (
                <div className="text-sm text-gray-500">No data available.</div>
              )}
            </div>
          </div>
        </div>
      </PageSection>

      {modalState.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalState.type === 'edit' && 'Edit Category'}
                {modalState.type === 'create' && 'Create Category'}
                {modalState.type === 'add-subcategory' && 'Add Subcategory'}
                {modalState.type === 'toggle-status' && 'Update Category Status'}
                {modalState.type === 'delete' && 'Delete Category'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {modalState.type === 'edit' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategories</label>
                    <textarea
                      rows="3"
                      value={modalSubcategories}
                      onChange={(e) => setModalSubcategories(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Add subcategories separated by commas"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Changes apply immediately across listings.</p>
                </>
              )}

              {modalState.type === 'create' && (
                <>
                  <p className="text-sm text-gray-600">
                    Create a managed category to enable admin actions for this service group.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      rows="3"
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Describe what this category includes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategories</label>
                    <textarea
                      rows="2"
                      value={modalSubcategories}
                      onChange={(e) => setModalSubcategories(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Add subcategories separated by commas"
                    />
                  </div>
                </>
              )}

              {modalState.type === 'add-subcategory' && (
                <>
                  <p className="text-sm text-gray-600">
                    Add a new subcategory under <span className="font-semibold">{modalState.category?.name}</span>.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory Name</label>
                    <input
                      type="text"
                      value={modalSubcategory}
                      onChange={(e) => setModalSubcategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              {modalState.type === 'toggle-status' && (
                <>
                  <p className="text-sm text-gray-600">
                    You are about to {modalState.category?.status === 'active' ? 'disable' : 'enable'} the
                    category <span className="font-semibold">{modalState.category?.name}</span>.
                  </p>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                    Disabling a category hides it from providers and new listings.
                  </div>
                </>
              )}

              {modalState.type === 'delete' && (
                <>
                  <p className="text-sm text-gray-600">
                    This will permanently remove <span className="font-semibold">{modalState.category?.name}</span>.
                  </p>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    Categories with active services cannot be deleted. Disable them instead.
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              {modalState.type === 'edit' && (
                <button
                  onClick={handleCategoryEditSave}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                >
                  Save Changes
                </button>
              )}
              {modalState.type === 'add-subcategory' && (
                <button
                  onClick={handleSubcategorySave}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                >
                  Add Subcategory
                </button>
              )}
              {modalState.type === 'create' && (
                <button
                  onClick={handleCategoryCreateSave}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                >
                  Create Category
                </button>
              )}
              {modalState.type === 'toggle-status' && (
                <button
                  onClick={handleStatusToggleConfirm}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700"
                >
                  {modalState.category?.status === 'active' ? 'Disable Category' : 'Enable Category'}
                </button>
              )}
              {modalState.type === 'delete' && (
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  Delete Category
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
