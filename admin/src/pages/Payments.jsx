import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  HiBanknotes, HiArrowsRightLeft, HiCheckCircle, HiClock, HiXCircle,
  HiChartBar, HiReceiptPercent, HiArrowUturnLeft, HiExclamationTriangle,
  HiMagnifyingGlass,
} from 'react-icons/hi2'
import api from '../utils/axios'

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'


const DASHBOARD_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getRangeBounds(range, from, to) {
  const now = new Date()
  if (range === 'today') {
    const start = startOfDay(now)
    return { start, end: addDays(start, 1) }
  }
  if (range === 'week') {
    const current = startOfDay(now)
    const day = current.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const start = addDays(current, -diffToMonday)
    return { start, end: addDays(start, 7) }
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
  }
  if (range === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    return { start, end: new Date(now.getFullYear() + 1, 0, 1) }
  }
  if (range === 'custom' && from && to) {
    const start = startOfDay(new Date(from))
    const end = addDays(startOfDay(new Date(to)), 1)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) {
      return { start, end }
    }
  }
  return null
}

function buildRangeParams(range, fromDate, toDate, extra = {}) {
  const params = new URLSearchParams(extra)
  params.set('range', range)
  if (range === 'custom' && fromDate && toDate) {
    params.set('from', fromDate)
    params.set('to', toDate)
  }
  return params
}

function formatSelectedRange(range, fromDate, toDate) {
  if (range === 'today') return 'Today'
  if (range === 'week') return 'This Week'
  if (range === 'month') return 'This Month'
  if (range === 'year') return 'This Year'
  if (range === 'custom' && fromDate && toDate) return `${fromDate} → ${toDate}`
  return 'Selected Range'
}

function buildRevenueTrendData(payments, range, fromDate, toDate) {
  const bounds = getRangeBounds(range, fromDate, toDate)
  if (!bounds) return []

  const buckets = []
  const cursor = new Date(bounds.start)
  while (cursor < bounds.end) {
    const key = cursor.toISOString().slice(0, 10)
    buckets.push({
      key,
      label:
        range === 'today'
          ? cursor.toLocaleTimeString('en-US', { hour: 'numeric' })
          : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  const bucketMap = new Map(buckets.map((item) => [item.key, item]))
  ;(payments || []).forEach((payment) => {
    if (payment.status !== 'RELEASED' || !getPaymentRelevantDate(payment)) return
    const key = new Date(getPaymentRelevantDate(payment)).toISOString().slice(0, 10)
    const bucket = bucketMap.get(key)
    if (bucket) bucket.revenue += Number(payment.amount || 0)
  })

  return buckets.map(({ label, revenue }) => ({ date: label, revenue }))
}

const getPaymentRelevantDate = (payment) => {
  const status = String(payment?.status || '').toUpperCase()
  if (status === 'RELEASED') return payment?.releasedAt || payment?.escrowReleasedAt || payment?.clientConfirmedAt || payment?.updatedAt || payment?.createdAt || null
  if (status === 'REFUNDED') return payment?.refundedAt || payment?.updatedAt || payment?.createdAt || null
  if (status === 'PARTIALLY_REFUNDED') return payment?.refundedAt || payment?.releasedAt || payment?.escrowReleasedAt || payment?.updatedAt || payment?.createdAt || null
  if (status === 'FUNDS_HELD') return payment?.verifiedAt || payment?.updatedAt || payment?.createdAt || null
  if (status === 'DISPUTED') return payment?.disputedAt || payment?.updatedAt || payment?.createdAt || null
  return payment?.updatedAt || payment?.createdAt || null
}

const getRefundAmount = (payment) => {
  const explicit = [
    payment?.refundAmount,
    payment?.refundedAmount,
    payment?.partialRefundAmount,
    payment?.adminDecision?.refundAmount,
    payment?.disputeResolution?.refundAmount,
  ].find((value) => value != null && Number(value) > 0)

  if (explicit != null) return Number(explicit)

  const status = String(payment?.status || '').toUpperCase()
  if (status === 'REFUNDED') return Number(payment?.amount || 0)

  if (status === 'PARTIALLY_REFUNDED') {
    const released = Number(
      payment?.providerPayout ??
      payment?.providerEarnings ??
      payment?.releasedAmount ??
      payment?.providerSettlement ??
      0
    )
    return Math.max(0, Number(payment?.amount || 0) - released)
  }

  return 0
}

const getProviderPayout = (payment) => {
  const explicit = [
    payment?.providerPayout,
    payment?.providerEarnings,
    payment?.releasedAmount,
    payment?.providerSettlement,
    payment?.resolutionDetails?.providerPayout,
    payment?.adminDecision?.providerPayout,
  ].find((value) => value != null && Number(value) >= 0)

  if (explicit != null) return Number(explicit)

  const status = String(payment?.status || '').toUpperCase()
  const amount = Number(payment?.amount || 0)
  const refund = getRefundAmount(payment)

  if (status === 'REFUNDED') return 0
  if (status === 'PARTIALLY_REFUNDED') return Math.max(0, amount - refund)

  return Number((amount * 0.85).toFixed(2))
}


/* ─── status chip ───────────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const MAP = {
    RELEASED:          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    FUNDS_HELD:        'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    INITIATED:         'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    FAILED:            'bg-red-50 text-red-700 ring-1 ring-red-200',
    DISPUTED:          'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    REFUNDED:          'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    PARTIALLY_REFUNDED:'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  }
  const LABELS = {
    RELEASED: 'Released', FUNDS_HELD: 'Funds Held', INITIATED: 'Initiated',
    FAILED: 'Failed', DISPUTED: 'Disputed', REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partial Refund',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${MAP[status] || 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'}`}>
      {LABELS[status] || status || 'Unknown'}
    </span>
  )
}

/* ─── refund modal ───────────────────────────────────────────────────────── */
function RefundModal({ payment, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) { toast.error('Please enter a reason'); return }
    setLoading(true)
    try {
      await api.post(`/payment/refund/${payment._id}`, { reason })
      toast.success('Refund processed successfully')
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Refund failed')
    } finally {
      setLoading(false)
    }
  }

  const clientName = payment?.clientId?.profile?.name || payment?.clientId?.email || 'client'
  const amount = Number(payment?.amount || 0)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="rounded-2xl bg-white shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex justify-center mb-4">
          <HiExclamationTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-gray-900 text-center mb-1">Confirm Refund</h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          This will refund <span className="font-semibold text-gray-800">NPR {fmt(amount)}</span> to {clientName}. This action cannot be undone.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for refund..."
          rows={2}
          className="rounded-xl border border-gray-200 p-3 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-200 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading} className="bg-red-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-red-700 transition disabled:opacity-60">
            {loading ? 'Processing...' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── custom tooltip ─────────────────────────────────────────────────────── */
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold font-mono text-emerald-700">NPR {fmt(payload[0]?.value)}</p>
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────────────── */
export default function Payments() {
  const [stats, setStats]       = useState({ totalRevenue: 0, totalTransactions: 0, completedTransactions: 0, pendingTransactions: 0, failedTransactions: 0 })
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRange, setSelectedRange] = useState('month')
  const [appliedRange, setAppliedRange] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedCustomFrom, setAppliedCustomFrom] = useState('')
  const [appliedCustomTo, setAppliedCustomTo] = useState('')
  const [refundTarget, setRefundTarget] = useState(null)

  const fetchAll = async (range = appliedRange, fromDate = appliedCustomFrom, toDate = appliedCustomTo) => {
    try {
      const params = buildRangeParams(range, fromDate, toDate, { limit: '200' })
      const statsQuery = buildRangeParams(range, fromDate, toDate)
      const [statsRes, txRes] = await Promise.all([
        api.get(`/admin/dashboard/stats?${statsQuery.toString()}`),
        api.get(`/payment/transactions/admin?${params.toString()}`),
      ])
      if (statsRes.data.success) setStats(statsRes.data.data.payments)
      if (txRes.data.success) setPayments(txRes.data.payments || [])
    } catch (err) {
      console.error('Failed to load payments', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedRange !== 'custom') {
      setAppliedRange(selectedRange)
    }
  }, [selectedRange])

  useEffect(() => {
    fetchAll(appliedRange, appliedCustomFrom, appliedCustomTo)

    const iv = setInterval(() => { if (!document.hidden) fetchAll(appliedRange, appliedCustomFrom, appliedCustomTo) }, 30000)
    const vis = () => { if (!document.hidden) fetchAll(appliedRange, appliedCustomFrom, appliedCustomTo) }
    document.addEventListener('visibilitychange', vis)

    const token = localStorage.getItem('accessToken')
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    let source
    let retryTimer

    const shouldRefreshFromNotification = (notification = {}) => {
      const type = String(notification?.type || '').toLowerCase()
      const category = String(notification?.category || '').toLowerCase()
      return (
        type.includes('payment') ||
        type.includes('refund') ||
        type.includes('booking') ||
        type.includes('dispute') ||
        type.includes('wallet') ||
        category === 'payment' ||
        category === 'booking' ||
        category === 'dispute'
      )
    }

    const connect = () => {
      if (!token) return
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`)
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload?.event === 'notification' && shouldRefreshFromNotification(payload?.notification)) {
            fetchAll(appliedRange, appliedCustomFrom, appliedCustomTo)
          }
        } catch (err) {
          console.error('Failed to process payment stream update', err)
        }
      }
      source.onerror = () => {
        source?.close()
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null
            connect()
          }, 5000)
        }
      }
    }

    connect()

    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', vis)
      source?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [appliedRange, appliedCustomFrom, appliedCustomTo])

  const chartData = useMemo(() => buildRevenueTrendData(payments, appliedRange, appliedCustomFrom, appliedCustomTo), [payments, appliedRange, appliedCustomFrom, appliedCustomTo])

  const selectedRangeLabel = formatSelectedRange(appliedRange, appliedCustomFrom, appliedCustomTo)

  /* ── commission breakdown ── */
  const commission = useMemo(() => {
    const gross = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + Math.max(0, Number(p.amount || 0) - getRefundAmount(p)), 0)
    return {
      gross,
      platform: Number((gross * 0.15).toFixed(2)),
      provider: Number((gross * 0.85).toFixed(2)),
    }
  }, [payments])

  const pieData = [
    { name: 'Commission', value: commission.platform },
    { name: 'Payout', value: commission.provider },
  ]
  const PIE_COLORS = ['#059669', '#3b82f6']

  /* ── filtered table ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      const clientName = p.clientId?.profile?.name || p.clientId?.email || ''
      const providerName = p.providerId?.profile?.name || ''
      const serviceTitle = p.bookingId?.serviceTitle || ''
      return [clientName, providerName, serviceTitle, String(p._id)].join(' ').toLowerCase().includes(q)
    })
  }, [payments, search, statusFilter])

  /* ── KPI data ── */
  const kpis = [
    { label: 'Total Revenue', value: `NPR ${fmt(stats.totalRevenue)}`, Icon: HiBanknotes,       iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', border: 'border-l-emerald-500' },
    { label: 'Transactions',  value: stats.totalTransactions,           Icon: HiArrowsRightLeft, iconBg: 'bg-blue-100',    iconColor: 'text-blue-700',    border: 'border-l-blue-500'    },
    { label: 'Completed',     value: stats.completedTransactions,        Icon: HiCheckCircle,     iconBg: 'bg-green-100',   iconColor: 'text-green-700',   border: 'border-l-green-500'   },
    { label: 'Pending',       value: stats.pendingTransactions,          Icon: HiClock,           iconBg: 'bg-amber-100',   iconColor: 'text-amber-700',   border: 'border-l-amber-500'   },
    { label: 'Failed',        value: stats.failedTransactions,           Icon: HiXCircle,         iconBg: 'bg-red-100',     iconColor: 'text-red-700',     border: 'border-l-red-500'     },
  ]

  const chartTotal = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + Math.max(0, Number(p.amount || 0) - getRefundAmount(p)), 0)

  return (
    <div className="space-y-4 min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ─── KPI STRIP ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 border-l-4 ${kpi.border}`}>
            <div className={`${kpi.iconBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <kpi.Icon className={`w-5 h-5 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">{kpi.label}</p>
              <p className="text-xl font-bold font-mono text-gray-900 leading-none truncate">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="flex flex-col gap-3 lg:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {DASHBOARD_RANGES.map((item) => {
            const active = selectedRange === item.value

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedRange(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {selectedRange === 'custom' && (
          <div className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row sm:items-end lg:w-auto">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!customFrom || !customTo || customFrom > customTo) return
                  setAppliedCustomFrom(customFrom)
                  setAppliedCustomTo(customTo)
                  setAppliedRange('custom')
                }}
                disabled={!customFrom || !customTo || customFrom > customTo}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomFrom('')
                  setCustomTo('')
                  setAppliedCustomFrom('')
                  setAppliedCustomTo('')
                  setSelectedRange('month')
                  setAppliedRange('month')
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ─── CHARTS ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

        {/* Revenue Trend (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HiChartBar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Revenue Trend — {selectedRangeLabel}</span>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-600">NPR {fmt(chartTotal)}</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={4} tickLine={false} axisLine={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Commission Breakdown (4 cols) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiReceiptPercent className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Commission Breakdown</span>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Gross Booking Value</span>
              <span className="text-sm font-semibold font-mono text-gray-900">NPR {fmt(commission.gross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Platform Commission (15%)</span>
              <span className="text-sm font-semibold font-mono text-emerald-600">NPR {fmt(commission.platform)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Provider Payouts (85%)</span>
              <span className="text-sm font-semibold font-mono text-blue-600">NPR {fmt(commission.provider)}</span>
            </div>
          </div>
          <div className="h-px bg-gray-100 my-3" />
          {commission.gross > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-1">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-[10px] text-gray-500">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-xs text-gray-400">No released payments yet</div>
          )}
        </div>
      </div>

      {/* ─── TRANSACTIONS TABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-800 flex-1">Transactions</span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search client, provider, service..."
                className="rounded-xl bg-gray-50 border border-gray-200 pl-8 pr-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Statuses</option>
              <option value="RELEASED">Released</option>
              <option value="FUNDS_HELD">Funds Held</option>
              <option value="INITIATED">Initiated</option>
              <option value="DISPUTED">Disputed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="text-left py-2.5 px-4">Client</th>
                <th className="text-left py-2.5 px-4">Provider</th>
                <th className="text-left py-2.5 px-4">Service</th>
                <th className="text-left py-2.5 px-4">Amount</th>
                <th className="text-left py-2.5 px-4">Commission</th>
                <th className="text-left py-2.5 px-4">Provider Payout</th>
                <th className="text-left py-2.5 px-4">Status</th>
                <th className="text-left py-2.5 px-4">Date</th>
                <th className="text-left py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">Loading transactions...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No transactions found</td></tr>
              ) : filtered.map(p => {
                const amt = Number(p.amount || 0)
                const refund = getRefundAmount(p)
                const payout = getProviderPayout(p)
                const comm = Number(p.platformCommission ?? Math.max(0, amt - refund - payout))
                return (
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                    <td className="py-2.5 px-4 text-gray-800">{p.clientId?.profile?.name || p.clientId?.email || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{p.providerId?.profile?.name || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-600 max-w-[140px] truncate">{p.bookingId?.serviceTitle || '—'}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-gray-900">
                      NPR {fmt(amt)}
                      {refund > 0 && <div className="text-[10px] text-red-500">Refunded: NPR {fmt(refund)}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-gray-500">NPR {fmt(comm)}</td>
                    <td className="py-2.5 px-4 font-mono text-gray-700">
                      NPR {fmt(payout)}
                      {p.status === 'PARTIALLY_REFUNDED' && <div className="text-[10px] text-amber-600">Partial settlement released</div>}
                    </td>
                    <td className="py-2.5 px-4"><StatusChip status={p.status} /></td>
                    <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{fmtDate(getPaymentRelevantDate(p))}</td>
                    <td className="py-2.5 px-4">
                      {p.status === 'FUNDS_HELD' && (
                        <button
                          onClick={() => setRefundTarget(p)}
                          title="Process Refund"
                          className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition"
                        >
                          <HiArrowUturnLeft className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── REFUND MODAL ─────────────────────────────────────────────────── */}
      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => { setRefundTarget(null); fetchAll() }}
        />
      )}
    </div>
  )
}