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
  const [refundTarget, setRefundTarget] = useState(null)

  const fetchAll = async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/payment/transactions/admin?limit=200'),
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
    fetchAll()
    const iv = setInterval(() => { if (!document.hidden) fetchAll() }, 30000)
    const vis = () => { if (!document.hidden) fetchAll() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis) }
  }, [])

  /* ── daily revenue chart (last 30 days, RELEASED only) ── */
  const chartData = useMemo(() => {
    const days = 30
    const now = new Date()
    const buckets = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      buckets[key] = 0
    }
    payments.forEach(p => {
      if (p.status !== 'RELEASED' || !p.createdAt) return
      const key = new Date(p.createdAt).toISOString().slice(0, 10)
      if (buckets[key] !== undefined) buckets[key] += Number(p.amount || 0)
    })
    return Object.entries(buckets).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue,
    }))
  }, [payments])

  /* ── commission breakdown ── */
  const commission = useMemo(() => {
    const gross = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + Number(p.amount || 0), 0)
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

  const chartTotal = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="space-y-4 min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ─── KPI STRIP ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
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

      {/* ─── CHARTS ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Revenue Trend (8 cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HiChartBar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Daily Revenue — Last 30 Days</span>
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
          <table className="w-full text-sm">
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
                const comm = Number(p.platformCommission ?? (amt * 0.15))
                const payout = Number(p.providerPayout ?? (amt * 0.85))
                return (
                  <tr key={p._id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                    <td className="py-2.5 px-4 text-gray-800">{p.clientId?.profile?.name || p.clientId?.email || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{p.providerId?.profile?.name || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-600 max-w-[140px] truncate">{p.bookingId?.serviceTitle || '—'}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-gray-900">NPR {fmt(amt)}</td>
                    <td className="py-2.5 px-4 font-mono text-gray-500">NPR {fmt(comm)}</td>
                    <td className="py-2.5 px-4 font-mono text-gray-700">NPR {fmt(payout)}</td>
                    <td className="py-2.5 px-4"><StatusChip status={p.status} /></td>
                    <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
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
