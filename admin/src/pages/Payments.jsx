import React, { useEffect, useState } from 'react'
import api from '../utils/axios'

export default function Payments() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
  })
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return
      
      try {
        const res = await api.get('/admin/dashboard/stats')
        if (res.data.success) {
          setStats(res.data.data.payments)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        setError('Failed to load stats')
      }
    }

    const fetchPayments = async () => {
      if (document.hidden) return

      try {
        setLoading(true)
        const res = await api.get('/payment/transactions/admin?limit=50')
        if (res.data.success) {
          setPayments(res.data.payments || [])
          setError(null)
        }
      } catch (err) {
        console.error('Failed to fetch payments:', err)
        setError('Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    fetchPayments()
    const interval = setInterval(() => {
      fetchStats()
      fetchPayments()
    }, 30000) // Refresh every 30 seconds

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats()
        fetchPayments()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const formatStatus = (status) => {
    const mapping = {
      RELEASED: 'Released',
      FUNDS_HELD: 'Funds Held',
      INITIATED: 'Initiated',
      FAILED: 'Failed',
      DISPUTED: 'Disputed',
      REFUNDED: 'Refunded',
      PARTIALLY_REFUNDED: 'Partially Refunded',
    }
    return mapping[status] || status || 'Unknown'
  }

  const statusStyles = (status) => {
    if (status === 'RELEASED') return 'bg-green-100 text-green-700'
    if (status === 'FUNDS_HELD') return 'bg-yellow-100 text-yellow-700'
    if (status === 'INITIATED') return 'bg-blue-100 text-blue-700'
    if (status === 'FAILED') return 'bg-red-100 text-red-700'
    if (status === 'DISPUTED') return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-700'
  }

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

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Payments & Transactions</h1>

        <PageSection 
          icon="💳" 
          title="Transaction History"
          description="View all platform transactions and payment records (Auto-updates every 30s)"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-4 bg-green-50">
              <p className="text-sm font-semibold text-green-700 uppercase">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">All completed</p>
            </div>
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="text-sm font-semibold text-blue-700 uppercase">Completed</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.completedTransactions}</p>
              <p className="text-xs text-blue-600 mt-1">Successful transactions</p>
            </div>
            <div className="border rounded-lg p-4 bg-yellow-50">
              <p className="text-sm font-semibold text-yellow-700 uppercase">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingTransactions}</p>
              <p className="text-xs text-yellow-600 mt-1">Awaiting processing</p>
            </div>
            <div className="border rounded-lg p-4 bg-red-50">
              <p className="text-sm font-semibold text-red-700 uppercase">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failedTransactions}</p>
              <p className="text-xs text-red-600 mt-1">Failed transactions</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left p-3">Transaction ID</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={4}>Loading transactions...</td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={4}>No transactions found.</td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const txLabel = String(payment._id).slice(-6)
                    return (
                      <tr key={payment._id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-blue-600">TXN-{txLabel}</td>
                        <td className="p-3 font-semibold">₹{Number(payment.amount || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles(payment.status)}`}>
                            {formatStatus(payment.status)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection 
          icon="📊" 
          title="Commission Tracking"
          description="Monitor platform commissions and earnings"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-purple-50">
              <p className="text-sm font-semibold text-purple-700">Commission Rate</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">15%</p>
              <p className="text-xs text-purple-600 mt-1">Per service booking</p>
            </div>
            <div className="border rounded-lg p-4 bg-indigo-50">
              <p className="text-sm font-semibold text-indigo-700">Platform Commission</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">₹{(stats.totalRevenue * 0.15).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
              <p className="text-xs text-indigo-600 mt-1">15% of total revenue</p>
            </div>
            <div className="border rounded-lg p-4 bg-pink-50">
              <p className="text-sm font-semibold text-pink-700">Total Transactions</p>
              <p className="text-3xl font-bold text-pink-600 mt-2">{stats.totalTransactions}</p>
              <p className="text-xs text-pink-600 mt-1">All time</p>
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="💰" 
          title="Refund Approvals"
          description="Manage and approve refund requests"
        >
          <div className="border rounded-lg p-4 bg-orange-50">
            <h4 className="font-semibold text-orange-900 mb-4">Pending Refund Requests</h4>
            <div className="space-y-3">
              {[
                { booking: 'BK001', amount: '₹500', reason: 'Service not completed', date: '2025-02-05' },
                { booking: 'BK002', amount: '₹1,200', reason: 'Customer request', date: '2025-02-04' },
              ].map((refund, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-orange-200">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{refund.booking} - {refund.amount}</p>
                    <p className="text-xs text-gray-600">{refund.reason} • {refund.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Approve</button>
                    <button className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageSection>
    </div>
  )
}
