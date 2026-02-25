import React, { useEffect, useState } from 'react'
import api from '../utils/axios'
import toast from 'react-hot-toast'

export default function Bookings() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    ongoingBookings: 0,
    cancelledBookings: 0,
  })
  const [error, setError] = useState('')
  const [pendingQuotes, setPendingQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [reviewingQuote, setReviewingQuote] = useState(null)
  const [processingQuote, setProcessingQuote] = useState(false)
  const [approvalData, setApprovalData] = useState({
    approvedPrice: '',
    adminComment: '',
    rejectionReason: '',
  })

  useEffect(() => {
    let intervalId

    const fetchStats = async () => {
      if (document.hidden) return
      try {
        setError('')
        const res = await api.get('/admin/dashboard/stats')
        const bookings = res?.data?.data?.bookings
        if (bookings) {
          setStats({
            totalBookings: bookings.totalBookings || 0,
            completedBookings: bookings.completedBookings || 0,
            ongoingBookings: bookings.ongoingBookings || 0,
            cancelledBookings: bookings.cancelledBookings || 0,
          })
        }
      } catch (err) {
        console.error('Failed to fetch booking stats:', err)
        setError('Unable to refresh booking stats right now')
      }
    }

    fetchStats()
    fetchPendingQuotes()
    intervalId = setInterval(() => {
      fetchStats()
      fetchPendingQuotes()
    }, 30000)

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchStats()
        fetchPendingQuotes()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // PHASE 2C: Fetch pending quotes
  async function fetchPendingQuotes() {
    try {
      setQuotesLoading(true)
      // PHASE 3: Use dedicated endpoint instead of filtering all bookings
      const res = await api.get('/bookings/quotes/pending')
      const quotes = res.data.quotes || []
      setPendingQuotes(quotes)
    } catch (err) {
      console.error('Failed to fetch pending quotes:', err)
    } finally {
      setQuotesLoading(false)
    }
  }

  // PHASE 2C: Approve quote
  async function handleApproveQuote(bookingId) {
    try {
      setProcessingQuote(true)
      await api.post(`/bookings/${bookingId}/approve-quote`, {
        approvedPrice: approvalData.approvedPrice ? parseFloat(approvalData.approvedPrice) : undefined,
        adminComment: approvalData.adminComment,
      })
      toast.success('Quote approved successfully!')
      setReviewingQuote(null)
      setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
      fetchPendingQuotes()
    } catch (err) {
      console.error('Failed to approve quote:', { bookingId, error: err.message })
      toast.error(err?.response?.data?.message || 'Failed to approve quote')
    } finally {
      setProcessingQuote(false)
    }
  }

  // PHASE 2C: Reject quote
  async function handleRejectQuote(bookingId) {
    try {
      if (!approvalData.rejectionReason?.trim()) {
        toast.error('Please provide a rejection reason')
        return
      }
      setProcessingQuote(true)
      await api.post(`/bookings/${bookingId}/reject-quote`, {
        rejectionReason: approvalData.rejectionReason,
      })
      toast.success('Quote rejected')
      setReviewingQuote(null)
      setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
      fetchPendingQuotes()
    } catch (err) {
      console.error('Failed to reject quote:', { bookingId, error: err.message })
      toast.error(err?.response?.data?.message || 'Failed to reject quote')
    } finally {
      setProcessingQuote(false)
    }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
        <p className="text-sm text-gray-500 mb-6">Auto-updates every 30 seconds</p>
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <PageSection 
          icon="📅" 
          title="View All Bookings"
          description="Monitor all platform bookings in real-time"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center bg-blue-50">
              <p className="text-3xl font-bold text-blue-600">{stats.totalBookings}</p>
              <p className="text-gray-600 text-sm mt-2">Total Bookings</p>
            </div>
            <div className="border rounded-lg p-4 text-center bg-green-50">
              <p className="text-3xl font-bold text-green-600">{stats.completedBookings}</p>
              <p className="text-gray-600 text-sm mt-2">Completed</p>
            </div>
            <div className="border rounded-lg p-4 text-center bg-orange-50">
              <p className="text-3xl font-bold text-orange-600">{stats.ongoingBookings}</p>
              <p className="text-gray-600 text-sm mt-2">Ongoing</p>
            </div>
            <div className="border rounded-lg p-4 text-center bg-red-50">
              <p className="text-3xl font-bold text-red-600">{stats.cancelledBookings}</p>
              <p className="text-gray-600 text-sm mt-2">Cancelled</p>
            </div>
          </div>
          <button className="w-full bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 transition">
            View Booking Details
          </button>
        </PageSection>

        {/* PHASE 2C: Quote Approval Section */}
        <PageSection 
          icon="📝" 
          title="Quote Approvals"
          description="Review and approve provider quotes for client requests"
        >
          {quotesLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 mx-auto rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
            </div>
          ) : pendingQuotes.length === 0 ? (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-4">
                <span className="text-3xl">✅</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">No Pending Quotes</p>
                  <p className="text-sm text-gray-600 mt-1">All quotes have been reviewed</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQuotes.map((booking) => (
                <div key={booking._id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {booking.serviceId?.title || 'Service'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Client: {booking.clientId?.profile?.name || booking.clientId?.email || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Provider: {booking.providerId?.profile?.name || booking.providerId?.email || 'N/A'}
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium text-gray-700">Quoted Price:</span>{' '}
                          <span className="font-bold text-purple-600">NPR {booking.quote?.quotedPrice?.toLocaleString() || '0'}</span>
                        </p>
                        {booking.quote?.quoteMessage && (
                          <p className="text-sm text-gray-700 italic">"{booking.quote.quoteMessage}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewingQuote(booking._id)}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
                      >
                        Review
                      </button>
                    </div>
                  </div>

                  {/* Review Form */}
                  {reviewingQuote === booking._id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Approved Price (NPR) - leave blank to use quoted price
                        </label>
                        <input
                          type="number"
                          value={approvalData.approvedPrice}
                          onChange={(e) => setApprovalData({ ...approvalData, approvedPrice: e.target.value })}
                          placeholder={`Default: ${booking.quote?.quotedPrice}`}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Comment (optional)
                        </label>
                        <textarea
                          value={approvalData.adminComment}
                          onChange={(e) => setApprovalData({ ...approvalData, adminComment: e.target.value })}
                          placeholder="Add any notes or comments..."
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rejection Reason (only for rejection)
                        </label>
                        <textarea
                          value={approvalData.rejectionReason}
                          onChange={(e) => setApprovalData({ ...approvalData, rejectionReason: e.target.value })}
                          placeholder="Reason for rejecting this quote..."
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          rows={2}
                          maxLength={500}
                          disabled={processingQuote}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {approvalData.rejectionReason.length}/500 characters
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveQuote(booking._id)}
                          disabled={processingQuote}
                          className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium ${
                            processingQuote ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {processingQuote ? 'Processing...' : 'Approve Quote'}
                        </button>
                        <button
                          onClick={() => handleRejectQuote(booking._id)}
                          disabled={processingQuote}
                          className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium ${
                            processingQuote ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {processingQuote ? 'Processing...' : 'Reject Quote'}
                        </button>
                        <button
                          onClick={() => {
                            setReviewingQuote(null)
                            setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
                          }}
                          disabled={processingQuote}
                          className={`px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium ${
                            processingQuote ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection 
          icon="⚖️" 
          title="Resolve Disputes"
          description="Handle booking disputes and conflicts"
        >
          <div className="border rounded-lg p-4 bg-yellow-50">
            <div className="flex items-start gap-4">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">No Active Disputes</p>
                <p className="text-sm text-yellow-700 mt-1">Monitor platform for any disputes that may arise</p>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="💰" 
          title="Refunds & Cancellations"
          description="Manage refunds and booking cancellations"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Pending Refunds</h4>
              <div className="text-2xl font-bold text-red-600">₹2,450</div>
              <p className="text-xs text-gray-600 mt-2">From 2 cancelled bookings</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Total Refunded (This Month)</h4>
              <div className="text-2xl font-bold text-brand-600">₹5,890</div>
              <p className="text-xs text-gray-600 mt-2">From 8 cancelled bookings</p>
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="🚨" 
          title="Emergency Handling"
          description="Manage emergency service requests"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">🏥 Emergency Services Status: Active</p>
            <p className="text-sm text-red-600 mt-2">3 providers available for emergency requests</p>
          </div>
        </PageSection>
    </div>
  )
}
