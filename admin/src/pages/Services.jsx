import React, { useEffect, useState } from 'react'
import api from '../utils/axios'
import {
  HiCheckBadge,
  HiExclamationTriangle,
  HiNoSymbol,
  HiSquares2X2,
  HiMagnifyingGlass,
  HiChevronDown,
  HiChevronRight,
  HiPencilSquare,
  HiPlusCircle,
  HiEye,
  HiTrash,
  HiEyeSlash,
  HiArrowPath,
  HiCurrencyDollar,
  HiStar,
  HiShieldCheck,
  HiChartBar,
  HiCheckCircle,
  HiXCircle,
  HiPauseCircle,
} from 'react-icons/hi2'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

/* ── Collapsible accordion wrapper ─────────────────────────────────────── */
function Accordion({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon className="w-4 h-4 text-gray-500" />
          {title}
        </span>
        {open ? (
          <HiChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <HiChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

/* ── Status badge chip ─────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    flagged: 'bg-orange-50 text-orange-700 ring-orange-200',
    suspended: 'bg-red-50 text-red-700 ring-red-200',
    inactive: 'bg-gray-100 text-gray-600 ring-gray-200',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-600 ring-gray-200'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  )
}

/* ── Icon-only action button with tooltip ──────────────────────────────── */
function ActionBtn({ icon: Icon, label, color = 'text-gray-500 hover:text-gray-700', onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-lg hover:bg-gray-100 transition ${color}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

const PIE_COLORS = ['#059669', '#f59e0b', '#ef4444']

/* ═════════════════════════════════════════════════════════════════════════ */
export default function Services() {
  /* ── state ───────────────────────────────────────────────────────────── */
  const [stats, setStats] = useState({
    activeServices: 0,
    flaggedServices: 0,
    suspendedServices: 0,
  })
  const [catStats, setCatStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
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

  const [modalState, setModalState] = useState({ type: null, category: null })
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

  /* ── data fetchers ───────────────────────────────────────────────────── */
  const fetchStats = async () => {
    if (document.hidden) return
    try {
      const res = await api.get('/admin/dashboard/stats')
      if (res.data.success) {
        setStats(res.data.data.services)
        setCatStats(res.data.data.categories)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError('Failed to load stats')
    }
  }

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true)
      const res = await api.get('/admin/categories/summary')
      if (res.data.success) setCategories(res.data.data)
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
      if (res.data.success) setFeaturedProviders(res.data.data)
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
      if (res.data.success) setModerationQueue(res.data.data)
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
      if (res.data.success) setAnalytics(res.data.data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  /* ── action handlers ─────────────────────────────────────────────────── */
  const handlePricingUpdate = async () => {
    try {
      setPricingSaving(true)
      await api.put('/admin/services/pricing', {
        ...pricing,
        categoryOverrides: categoryOverrides.map((o) => ({
          categoryId: o.categoryId,
          commission: o.commission,
          emergencySurcharge: o.emergencySurcharge,
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
    if (!category?._id) return openCreateCategoryModal(category)
    setModalState({ type: 'edit', category })
    setModalName(category.name || '')
    setModalSubcategories((category.subcategories || []).join(', '))
  }
  const openAddSubcategoryModal = (category) => {
    if (!category?._id) return openCreateCategoryModal(category)
    setModalState({ type: 'add-subcategory', category })
    setModalSubcategory('')
  }
  const openStatusToggleModal = (category) => {
    if (!category?._id) return openCreateCategoryModal(category)
    setModalState({ type: 'toggle-status', category })
  }
  const openDeleteModal = (category) => {
    if (!category?._id) return openCreateCategoryModal(category)
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
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      await api.put(`/admin/categories/${category._id}`, { name, subcategories })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error(err)
      setError('Failed to update category')
    }
  }

  const handleCategoryCreateSave = async () => {
    const name = modalName.trim()
    const description = modalDescription.trim()
    if (!name || !description) {
      setError('Name and description are required')
      return
    }
    const subcategories = modalSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      await api.post('/admin/categories', { name, description, subcategories })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error(err)
      setError('Failed to create category')
    }
  }

  const handleSubcategorySave = async () => {
    const category = modalState.category
    if (!category?._id) return
    const sub = modalSubcategory.trim()
    if (!sub) {
      setError('Subcategory name is required')
      return
    }
    try {
      await api.post('/admin/subcategories', { categoryId: category._id, name: sub })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to add subcategory')
    }
  }

  const handleStatusToggleConfirm = async () => {
    const category = modalState.category
    if (!category?._id) return
    try {
      const next = category.status === 'active' ? 'inactive' : 'active'
      await api.patch(`/admin/categories/${category._id}/status`, { status: next })
      await fetchCatalog()
      closeModal()
    } catch (err) {
      console.error(err)
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
      console.error(err)
      setError('Failed to delete category')
    }
  }

  const handleFeatureToggle = async (provider) => {
    try {
      await api.patch(`/admin/providers/${provider.id}/featured`, {
        featured: !provider.featured,
      })
      await fetchFeaturedProviders()
    } catch (err) {
      console.error(err)
      setError('Failed to update featured providers')
    }
  }

  const handleModerationAction = async (item, action) => {
    try {
      if (action === 'approve')
        await api.patch(`/admin/services/${item.id}/status`, { status: 'active' })
      else if (action === 'reject')
        await api.patch(`/admin/services/${item.id}/status`, {
          status: 'inactive',
          reason: 'Rejected by admin',
        })
      else if (action === 'suspend')
        await api.patch(`/admin/services/${item.id}/status`, {
          status: 'inactive',
          reason: 'Suspended by admin',
        })
      await fetchModerationQueue()
      await fetchStats()
    } catch (err) {
      console.error(err)
      setError('Failed to update service status')
    }
  }

  /* ── effects ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchStats()
    const iv = setInterval(fetchStats, 30000)
    const vis = () => {
      if (!document.hidden) fetchStats()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  useEffect(() => {
    fetchCatalog()
    fetchPricing()
    fetchFeaturedProviders()
    fetchAnalytics()
  }, [])

  useEffect(() => {
    fetchModerationQueue()
    const iv = setInterval(fetchModerationQueue, 30000)
    const vis = () => {
      if (!document.hidden) fetchModerationQueue()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  useEffect(() => {
    const iv = setInterval(fetchPricing, 30000)
    const vis = () => {
      if (!document.hidden) fetchPricing()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  useEffect(() => {
    const iv = setInterval(fetchAnalytics, 30000)
    const vis = () => {
      if (!document.hidden) fetchAnalytics()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchModerationQueue, 250)
    return () => clearTimeout(t)
  }, [serviceSearch, serviceStatusFilter])

  /* ── derived chart data ──────────────────────────────────────────────── */
  const barData = (analytics.topServices || []).slice(0, 6).map((s) => ({
    name: s.name?.length > 12 ? s.name.slice(0, 11) + '…' : s.name,
    fullName: s.name || '',
    bookings: s.bookings || 0,
  }))

  /* Custom bar chart X-axis tick — horizontal, clean, no angle */
  const BarXTick = ({ x, y, payload }) => (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={12}
        textAnchor="middle"
        fill="#6b7280"
        fontSize={10}
        fontWeight={500}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        {payload.value}
      </text>
    </g>
  )

  const pieData = [
    { name: 'Active', value: stats.activeServices },
    { name: 'Flagged', value: stats.flaggedServices },
    { name: 'Suspended', value: stats.suspendedServices },
  ].filter((d) => d.value > 0)

  const totalServices = stats.activeServices + stats.flaggedServices + stats.suspendedServices

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Service Management</h1>
        <button
          onClick={() => {
            fetchStats()
            fetchModerationQueue()
            fetchAnalytics()
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Refresh"
        >
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* ═══════ ROW 1 — KPI Cards (always 4 cols) ═══════ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Active Services',
            value: stats.activeServices,
            Icon: HiCheckBadge,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-500',
          },
          {
            label: 'Flagged',
            value: stats.flaggedServices,
            Icon: HiExclamationTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-500',
          },
          {
            label: 'Suspended',
            value: stats.suspendedServices,
            Icon: HiNoSymbol,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-500',
          },
          {
            label: 'Categories',
            value: catStats.totalCategories,
            Icon: HiSquares2X2,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-500',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow`}
          >
            <div className={`${kpi.bg} rounded-full p-2`}>
              <kpi.Icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ ROW 2 — Charts side-by-side (always 2 cols) ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bar chart — top services by booking count */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
            <HiChartBar className="w-4 h-4 text-gray-400" />
            Top Services by Bookings
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={28} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={<BarXTick />}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  interval={0}
                  height={32}
                />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                  cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                  formatter={(value) => [`${value} bookings`, '']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}
                />
                <Bar dataKey="bookings" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">
              {analyticsLoading ? 'Loading...' : 'No booking data yet'}
            </div>
          )}
        </div>

        {/* Donut chart — service status distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
            <HiSquares2X2 className="w-4 h-4 text-gray-400" />
            Service Status Distribution
          </h3>
          {totalServices > 0 ? (
            <div className="flex items-center justify-center gap-5">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-base font-bold text-gray-900 leading-none">{totalServices}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">Total</p>
                </div>
              </div>
              <div className="space-y-2">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">
              No service data yet
            </div>
          )}
        </div>
      </div>

      {/* ═══════ ROW 3 — Moderation Table ═══════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <HiShieldCheck className="w-4 h-4 text-gray-400" />
            Service Moderation
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-52 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <select
              value={serviceStatusFilter}
              onChange={(e) => setServiceStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Provider</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Flag Reason</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {moderationQueue.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 hover:bg-emerald-50/30 transition"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.service}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.provider}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.category}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">
                    {item.flagReason || '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <ActionBtn
                        icon={HiCheckCircle}
                        label="Approve"
                        color="text-emerald-500 hover:text-emerald-700"
                        onClick={() => handleModerationAction(item, 'approve')}
                      />
                      <ActionBtn
                        icon={HiXCircle}
                        label="Reject"
                        color="text-red-400 hover:text-red-600"
                        onClick={() => handleModerationAction(item, 'reject')}
                      />
                      <ActionBtn
                        icon={HiPauseCircle}
                        label="Suspend"
                        color="text-amber-500 hover:text-amber-700"
                        onClick={() => handleModerationAction(item, 'suspend')}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {moderationLoading && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-xs text-gray-400">
                    Loading moderation queue...
                  </td>
                </tr>
              )}
              {!moderationLoading && moderationQueue.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-xs text-gray-400">
                    No services match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════ ROW 4 — Collapsible: Category Catalog + Pricing ═══════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Category Catalog */}
        <Accordion icon={HiSquares2X2} title="Category Catalog" defaultOpen={false}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-gray-500">Manage categories and subcategories</p>
            <button
              onClick={() => openCreateCategoryModal()}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <HiPlusCircle className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Subs</th>
                  <th className="px-2 py-2">Providers</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat._id || `cat-${cat.name}`}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 transition"
                  >
                    <td className="px-2 py-2 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-2 py-2 text-gray-500">{cat.subcategories?.length || 0}</td>
                    <td className="px-2 py-2 text-gray-500">{cat.providersCount ?? '-'}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={cat.status} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <ActionBtn
                          icon={HiPencilSquare}
                          label="Edit"
                          color="text-blue-500 hover:text-blue-700"
                          onClick={() => openEditCategoryModal(cat)}
                        />
                        <ActionBtn
                          icon={HiPlusCircle}
                          label="Add Sub"
                          color="text-emerald-500 hover:text-emerald-700"
                          onClick={() => openAddSubcategoryModal(cat)}
                        />
                        <ActionBtn
                          icon={cat.status === 'active' ? HiEyeSlash : HiEye}
                          label={cat.status === 'active' ? 'Disable' : 'Enable'}
                          color="text-amber-500 hover:text-amber-700"
                          onClick={() => openStatusToggleModal(cat)}
                        />
                        <ActionBtn
                          icon={HiTrash}
                          label="Delete"
                          color="text-red-400 hover:text-red-600"
                          onClick={() => openDeleteModal(cat)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {catalogLoading && (
                  <tr>
                    <td colSpan="5" className="px-2 py-4 text-center text-[11px] text-gray-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!catalogLoading && categories.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-2 py-4 text-center text-[11px] text-gray-400">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        {/* Pricing & Commission Config */}
        <Accordion icon={HiCurrencyDollar} title="Pricing & Commission" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Platform Commission', key: 'platformCommission', suffix: '%' },
              { label: 'Processing Fee', key: 'processingFee', suffix: '%' },
              { label: 'Emergency Surcharge', key: 'emergencySurcharge', suffix: '%' },
              { label: 'Min Service Fee', key: 'minimumServiceFee', suffix: 'NPR' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  {f.label}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={pricing[f.key]}
                    onChange={(e) =>
                      setPricing({ ...pricing, [f.key]: Number(e.target.value) })
                    }
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="text-[11px] text-gray-400 w-8">{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-600">Promo Discount</span>
              <button
                onClick={() =>
                  setPricing({ ...pricing, promoDiscountEnabled: !pricing.promoDiscountEnabled })
                }
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  pricing.promoDiscountEnabled
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {pricing.promoDiscountEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <button
              onClick={handlePricingUpdate}
              disabled={pricingSaving}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {pricingSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Category overrides — compact */}
          {categoryOverrides.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                Category Overrides
              </p>
              <div className="space-y-1">
                {categoryOverrides.map((o) => (
                  <div
                    key={o.categoryId || o.categoryName}
                    className="flex items-center justify-between text-[11px] text-gray-600"
                  >
                    <span>{o.categoryName}</span>
                    <span>
                      {o.commission}% / {o.emergencySurcharge}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Accordion>
      </div>

      {/* ═══════ ROW 5 — Featured Providers (accordion) ═══════ */}
      <Accordion icon={HiStar} title="Featured Providers" defaultOpen={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {featuredProviders.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                  <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                  <td className="px-3 py-2 text-gray-600">{p.category}</td>
                  <td className="px-3 py-2 text-gray-600">{p.rating}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={p.featured ? 'active' : 'pending'} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleFeatureToggle(p)}
                      className={`text-[11px] font-semibold ${
                        p.featured
                          ? 'text-red-500 hover:text-red-700'
                          : 'text-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      {p.featured ? 'Remove' : 'Feature'}
                    </button>
                  </td>
                </tr>
              ))}
              {featuredLoading && (
                <tr>
                  <td colSpan="5" className="px-3 py-4 text-center text-[11px] text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!featuredLoading && featuredProviders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-3 py-4 text-center text-[11px] text-gray-400">
                    No providers available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Accordion>

      {/* ═══════ ROW 6 — Analytics (accordion) ═══════ */}
      <Accordion icon={HiChartBar} title="Service Analytics" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: 'Most Booked',
              data: analytics.topServices,
              valueKey: 'bookings',
              suffix: '',
            },
            {
              title: 'Trending Categories',
              data: analytics.trendingCategories,
              valueKey: 'growth',
              suffix: '',
            },
            {
              title: 'Top Providers',
              data: analytics.topProviders,
              valueKey: 'jobs',
              suffix: ' jobs',
            },
          ].map((section) => (
            <div key={section.title} className="border border-gray-100 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-600 mb-2">{section.title}</p>
              <div className="space-y-1.5">
                {(section.data || []).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                    <span className="font-semibold text-gray-900">
                      {item[section.valueKey]}
                      {section.suffix}
                    </span>
                  </div>
                ))}
                {analyticsLoading && <p className="text-[11px] text-gray-400">Loading...</p>}
                {!analyticsLoading && (section.data || []).length === 0 && (
                  <p className="text-[11px] text-gray-400">No data</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ═══════ MODAL ═══════ */}
      {modalState.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                {modalState.type === 'edit' && 'Edit Category'}
                {modalState.type === 'create' && 'Create Category'}
                {modalState.type === 'add-subcategory' && 'Add Subcategory'}
                {modalState.type === 'toggle-status' && 'Update Category Status'}
                {modalState.type === 'delete' && 'Delete Category'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 text-sm">
              {modalState.type === 'edit' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subcategories
                    </label>
                    <textarea
                      rows="2"
                      value={modalSubcategories}
                      onChange={(e) => setModalSubcategories(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Separated by commas"
                    />
                  </div>
                </>
              )}

              {modalState.type === 'create' && (
                <>
                  <p className="text-xs text-gray-500">
                    Create a managed category for this service group.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows="2"
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="What this category includes"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subcategories
                    </label>
                    <textarea
                      rows="2"
                      value={modalSubcategories}
                      onChange={(e) => setModalSubcategories(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      placeholder="Separated by commas"
                    />
                  </div>
                </>
              )}

              {modalState.type === 'add-subcategory' && (
                <>
                  <p className="text-xs text-gray-500">
                    Add a subcategory under{' '}
                    <span className="font-semibold">{modalState.category?.name}</span>.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subcategory Name
                    </label>
                    <input
                      type="text"
                      value={modalSubcategory}
                      onChange={(e) => setModalSubcategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {modalState.type === 'toggle-status' && (
                <>
                  <p className="text-xs text-gray-600">
                    {modalState.category?.status === 'active' ? 'Disable' : 'Enable'}{' '}
                    <span className="font-semibold">{modalState.category?.name}</span>?
                  </p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Disabling hides the category from providers and new listings.
                  </div>
                </>
              )}

              {modalState.type === 'delete' && (
                <>
                  <p className="text-xs text-gray-600">
                    Permanently remove{' '}
                    <span className="font-semibold">{modalState.category?.name}</span>?
                  </p>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    Categories with active services cannot be deleted.
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              {modalState.type === 'edit' && (
                <button
                  onClick={handleCategoryEditSave}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Save
                </button>
              )}
              {modalState.type === 'create' && (
                <button
                  onClick={handleCategoryCreateSave}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Create
                </button>
              )}
              {modalState.type === 'add-subcategory' && (
                <button
                  onClick={handleSubcategorySave}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  Add
                </button>
              )}
              {modalState.type === 'toggle-status' && (
                <button
                  onClick={handleStatusToggleConfirm}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                >
                  {modalState.category?.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              )}
              {modalState.type === 'delete' && (
                <button
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
