import { useState, useEffect } from 'react'
import api from '../utils/axios'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  HiUsers, HiBriefcase, HiCheckBadge, HiClock,
  HiCalendarDays, HiCheckCircle, HiArrowPath, HiXCircle,
  HiExclamationTriangle, HiShieldCheck, HiCurrencyDollar,
  HiChevronRight,
} from 'react-icons/hi2'
import { Link } from 'react-router-dom'

/* ── tiny helpers ──────────────────────────────────────────────────────── */
const BORDER_COLORS = {
  emerald: 'border-emerald-500', blue: 'border-blue-500', purple: 'border-purple-500',
  amber: 'border-amber-500', red: 'border-red-500', indigo: 'border-indigo-500',
  green: 'border-green-500', orange: 'border-orange-500',
}
const BG_COLORS = {
  emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50',
  amber: 'bg-amber-50', red: 'bg-red-50', indigo: 'bg-indigo-50',
  green: 'bg-green-50', orange: 'bg-orange-50',
}
const TEXT_COLORS = {
  emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600',
  amber: 'text-amber-600', red: 'text-red-600', indigo: 'text-indigo-600',
  green: 'text-green-600', orange: 'text-orange-600',
}

function KPI({ icon: Icon, label, value, sub, color = 'emerald' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 hover:shadow-md transition-shadow border-l-4 ${BORDER_COLORS[color] || 'border-gray-300'}`}>
      <div className={`${BG_COLORS[color] || 'bg-gray-50'} rounded-full p-2`}>
        <Icon className={`w-5 h-5 ${TEXT_COLORS[color] || 'text-gray-600'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function StatusChip({ status }) {
  const map = {
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    ongoing: 'bg-blue-50 text-blue-700 ring-blue-200',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
    declined: 'bg-red-50 text-red-700 ring-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${map[status] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [stats, setStats] = useState({
    users: { totalUsers: 0, totalProviders: 0, verifiedProviders: 0, pendingVerifications: 0 },
    bookings: { totalBookings: 0, completedBookings: 0, ongoingBookings: 0, cancelledBookings: 0 },
    admin: { pendingDisputes: 0, pendingVerifications: 0 },
    payments: { totalRevenue: 0, totalTransactions: 0, completedTransactions: 0, pendingTransactions: 0, failedTransactions: 0 },
    recentBookings: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
    setupRealtimeListener()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  function setupRealtimeListener() {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    let source
    let retryTimer

    const connect = () => {
      source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`)
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload?.event === 'notification') {
            const type = payload?.notification?.type
            if (['verification_approved','verification_rejected','verification_needs_correction','verification_submitted'].includes(type)) {
              fetchDashboardData()
            }
          }
        } catch (err) {
          console.error('Error parsing notification', err)
        }
      }
      source.onerror = () => {
        source.close()
        if (!retryTimer) {
          retryTimer = setTimeout(() => { retryTimer = null; connect() }, 5000)
        }
      }
    }
    connect()
    return () => { if (source) source.close(); if (retryTimer) clearTimeout(retryTimer) }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true); setError('')
      const response = await api.get('/admin/dashboard/stats')
      setStats(response.data.data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally { setLoading(false) }
  }

  if (loading && !stats.users.totalUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const completionRate = stats.bookings.totalBookings
    ? Math.round((stats.bookings.completedBookings / stats.bookings.totalBookings) * 100)
    : 0

  /* chart data */
  const bookingPie = [
    { name: 'Completed', value: stats.bookings.completedBookings, color: '#059669' },
    { name: 'Ongoing', value: stats.bookings.ongoingBookings, color: '#3b82f6' },
    { name: 'Cancelled', value: stats.bookings.cancelledBookings, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const userPie = [
    { name: 'Clients', value: stats.users.totalUsers, color: '#3b82f6' },
    { name: 'Providers', value: stats.users.totalProviders, color: '#8b5cf6' },
  ].filter(d => d.value > 0)

  const revenueFormatted = ((stats.payments?.totalRevenue || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })

  /* Simulated area chart data — last 30 days from recentBookings */
  const areaData = (() => {
    const days = 30
    const now = new Date()
    const buckets = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      buckets[d.toISOString().slice(5, 10)] = 0
    }
    ;(stats.recentBookings || []).forEach(b => {
      const key = new Date(b.createdAt).toISOString().slice(5, 10)
      if (buckets[key] !== undefined) buckets[key]++
    })
    return Object.entries(buckets).map(([date, count]) => ({ date, bookings: count }))
  })()

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Real-time overview of SewaHive platform</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Refresh"
        >
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ═══ ROW 1 — 3 Gradient Action Cards (side by side) ═══ */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/verification"
          className="rounded-2xl px-4 py-3 text-white shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <HiShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none">{stats.admin.pendingVerifications}</p>
              <p className="text-[10px] text-white/80 mt-0.5 font-medium truncate">Pending Verifications</p>
            </div>
          </div>
        </Link>

        <Link
          to="/disputes"
          className="rounded-2xl px-4 py-3 text-white shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <HiExclamationTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none">{stats.admin.pendingDisputes}</p>
              <p className="text-[10px] text-white/80 mt-0.5 font-medium truncate">Active Disputes</p>
            </div>
          </div>
        </Link>

        <div
          className="rounded-2xl px-4 py-3 text-white shadow-sm relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)' }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <HiCurrencyDollar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-none">NPR {revenueFormatted}</p>
              <p className="text-[10px] text-white/80 mt-0.5 font-medium truncate">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 2 — 8 KPI cards (4 per row) ═══ */}
      <div className="grid grid-cols-4 gap-3">
        <KPI icon={HiUsers} label="Total Clients" value={stats.users.totalUsers} color="blue" />
        <KPI icon={HiBriefcase} label="Total Providers" value={stats.users.totalProviders} color="purple" />
        <KPI icon={HiCheckBadge} label="Verified" value={stats.users.verifiedProviders} color="green" />
        <KPI icon={HiClock} label="Pending KYC" value={stats.users.pendingVerifications} color="orange" />
        <KPI icon={HiCalendarDays} label="Total Bookings" value={stats.bookings.totalBookings} color="indigo" />
        <KPI icon={HiCheckCircle} label="Completed" value={stats.bookings.completedBookings} sub={`${completionRate}%`} color="green" />
        <KPI icon={HiClock} label="Ongoing" value={stats.bookings.ongoingBookings} color="blue" />
        <KPI icon={HiXCircle} label="Cancelled" value={stats.bookings.cancelledBookings} color="red" />
      </div>

      {/* ═══ ROW 3 — Full-width Area Chart ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Booking Trend <span className="text-[10px] font-normal text-gray-400 ml-1">Last 30 days</span></h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-gray-500">Bookings</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="#10b981"
              fill="url(#emeraldFill)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ ROW 4 — Two Donut Cards SIDE BY SIDE ═══ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Donut Card 1: Booking Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Booking Status</h3>
          {bookingPie.length > 0 ? (
            <div className="flex items-center justify-center gap-5">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={bookingPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {bookingPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-base font-bold text-gray-900 leading-none">{stats.bookings.totalBookings}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">Total</p>
                </div>
              </div>
              <div className="space-y-2">
                {bookingPie.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">No booking data</div>
          )}
        </div>

        {/* Donut Card 2: User Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">User Distribution</h3>
          {userPie.length > 0 ? (
            <div className="flex items-center justify-center gap-5">
              <div className="relative flex-shrink-0">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={userPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {userPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-base font-bold text-gray-900 leading-none">{stats.users.totalUsers + stats.users.totalProviders}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5">Total</p>
                </div>
              </div>
              <div className="space-y-2">
                {userPie.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">No user data</div>
          )}
        </div>
      </div>

      {/* ═══ ROW 5 — Recent Bookings Table ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Recent Bookings</h3>
          <Link to="/bookings" className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
            View All <HiChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {stats.recentBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <HiCalendarDays className="w-7 h-7 mb-1" />
            <p className="text-xs">No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-1.5">Client</th>
                  <th className="px-4 py-1.5">Provider</th>
                  <th className="px-4 py-1.5">Status</th>
                  <th className="px-4 py-1.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.slice(0, 5).map(booking => (
                  <tr key={booking._id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-[9px]">
                          {booking.clientId?.profile?.name?.charAt(0) || 'C'}
                        </div>
                        <span className="font-medium text-gray-900 text-xs">
                          {booking.clientId?.profile?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-gray-600">
                      {booking.providerId?.profile?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-1.5">
                      <StatusChip status={booking.status} />
                    </td>
                    <td className="px-4 py-1.5 text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400 pb-1">
        Real-time data &middot; Updates every 30s &middot; Last refreshed: {new Date().toLocaleTimeString()}
      </p>
    </div>
  )
}
