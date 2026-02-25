import { useState, useEffect } from 'react'
import api from '../utils/axios'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiCheckCircle, HiClock, HiExclamationTriangle, HiUser } from 'react-icons/hi2'

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
            // Refresh dashboard when verification status changes
            if ([
              'verification_approved',
              'verification_rejected',
              'verification_needs_correction',
              'verification_submitted',
            ].includes(type)) {
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
          retryTimer = setTimeout(() => {
            retryTimer = null
            connect()
          }, 5000)
        }
      }
    }

    connect()

    return () => {
      if (source) source.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/admin/dashboard/stats')
      setStats(response.data.data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats.users.totalUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const getCompletionRate = () => {
    if (stats.bookings.totalBookings === 0) return 0
    return Math.round((stats.bookings.completedBookings / stats.bookings.totalBookings) * 100)
  }

  // Chart data
  const bookingStatusData = [
    { name: 'Completed', value: stats.bookings.completedBookings, color: '#10b981' },
    { name: 'Ongoing', value: stats.bookings.ongoingBookings, color: '#3b82f6' },
    { name: 'Cancelled', value: stats.bookings.cancelledBookings, color: '#ef4444' },
  ]

  const userDistributionData = [
    { name: 'Clients', value: stats.users.totalUsers, color: '#3b82f6' },
    { name: 'Providers', value: stats.users.totalProviders, color: '#8b5cf6' },
  ]

  const StatCard = ({ icon: Icon, label, value, subtext, trend, color = 'emerald' }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-${color}-50 flex items-center justify-center`}>
          <Icon className={`text-2xl text-${color}-600`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <HiArrowTrendingUp /> : <HiArrowTrendingDown />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value.toLocaleString()}</p>
      {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time overview of your SewaHive platform</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards - Users Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 Users & Providers</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={HiUser} label="Total Clients" value={stats.users.totalUsers} color="blue" trend={12} />
          <StatCard icon={HiUser} label="Total Providers" value={stats.users.totalProviders} color="purple" trend={8} />
          
          {/* Dynamic Verified Providers Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <HiCheckCircle className="text-2xl text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">Verified Providers</p>
            <p className="text-3xl font-bold text-gray-900">{stats.users.verifiedProviders}</p>
          </div>
          
          <StatCard icon={HiClock} label="Pending Verification" value={stats.users.pendingVerifications} color="orange" />
        </div>
      </div>

      {/* Analytics Row - Charts */}
      <div className="mb-8 grid lg:grid-cols-2 gap-6">
        {/* Booking Status Distribution - Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">📊 Booking Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-8 mt-6">
            {bookingStatusData.map((item) => (
              <div key={item.name} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-xs text-gray-600">{item.name}</p>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User Distribution - Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">👤 User Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {userDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-8 mt-6">
            {userDistributionData.map((item) => (
              <div key={item.name} className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-xs text-gray-600">{item.name}</p>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards - Bookings Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Bookings & Jobs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={HiCheckCircle} label="Total Bookings" value={stats.bookings.totalBookings} color="indigo" />
          <StatCard 
            icon={HiCheckCircle} 
            label="Completed Jobs" 
            value={stats.bookings.completedBookings} 
            subtext={`${getCompletionRate()}% completion rate`}
            color="green"
          />
          <StatCard icon={HiClock} label="Ongoing Jobs" value={stats.bookings.ongoingBookings} color="blue" />
          <StatCard icon={HiExclamationTriangle} label="Cancelled" value={stats.bookings.cancelledBookings} color="red" />
        </div>
      </div>

      {/* Admin Actions Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Admin Actions Required</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Pending Verifications */}
          <a 
            href="/verification"
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-6 hover:shadow-lg transition cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/90 text-sm font-medium mb-2">Provider Verifications</p>
                <p className="text-5xl font-bold">{stats.admin.pendingVerifications}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-white/70">Awaiting review</p>
          </a>

          {/* Pending Disputes */}
          <a 
            href="/disputes"
            className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 hover:shadow-lg transition cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/90 text-sm font-medium mb-2">Active Disputes</p>
                <p className="text-5xl font-bold">{stats.admin.pendingDisputes}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 2.523a6 6 0 008.367 8.367z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-white/70">Need resolution</p>
          </a>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/90 text-sm font-medium mb-2">Total Revenue</p>
                <p className="text-4xl font-bold">₨ {((stats.payments?.totalRevenue || 0) / 100000).toFixed(1)}L</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.16 5.314l4.897-1.596A1 1 0 0114.25 4.75v9.5a1 1 0 01-1.313.974l-4.897-1.596A4 4 0 004 9V7a4 4 0 014.16-1.686z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-white/70">From completed bookings</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Booking Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Latest 10 bookings from your platform</p>
          </div>
          <a href="/bookings" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
            View All →
          </a>
        </div>

        {stats.recentBookings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600">No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Client</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Provider</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.slice(0, 5).map((booking) => (
                  <tr key={booking._id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                          {booking.clientId?.profile?.name?.charAt(0) || 'C'}
                        </div>
                        <span className="font-medium text-gray-900">
                          {booking.clientId?.profile?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {booking.providerId?.profile?.name || 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : booking.status === 'cancelled' || booking.status === 'declined'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button className="text-emerald-600 hover:text-emerald-700 font-medium text-xs">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>⚡ Real-time data • Updates every 30 seconds • Last refreshed: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  )
}