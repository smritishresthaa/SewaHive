import React, { useEffect, useState } from 'react'
import api from '../utils/axios'
import toast from 'react-hot-toast'
import {
  HiCalendarDays, HiCheckCircle, HiClock, HiXCircle,
  HiExclamationTriangle, HiDocumentText, HiArrowPath,
  HiCurrencyDollar, HiBolt, HiShieldCheck,
  HiChevronDown, HiChevronRight,
} from 'react-icons/hi2'

/* ── Accordion ─────────────────────────────────────────────────────────── */
function Accordion({ icon: Icon, title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-gray-50 transition text-left"
      >
        <span className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-800">
          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{title}</span>
          {badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex-shrink-0">
              {badge}
            </span>
          )}
        </span>
        {open ? (
          <HiChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <HiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">{children}</div>}
    </div>
  )
}

export default function Bookings() {
  const [stats, setStats] = useState({ totalBookings: 0, completedBookings: 0, ongoingBookings: 0, cancelledBookings: 0 })
  const [error, setError] = useState('')
  const [pendingQuotes, setPendingQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [reviewingQuote, setReviewingQuote] = useState(null)
  const [processingQuote, setProcessingQuote] = useState(false)
  const [approvalData, setApprovalData] = useState({ approvedPrice: '', adminComment: '', rejectionReason: '' })

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
            cancelledBookings: bookings.cancelledBookings || 0
          })
        }
      } catch (err) {
        console.error('Failed to fetch booking stats:', err)
        setError('Unable to refresh booking stats')
      }
    }
    fetchStats()
    fetchPendingQuotes()
    intervalId = setInterval(() => { fetchStats(); fetchPendingQuotes() }, 30000)
    const vis = () => { if (!document.hidden) { fetchStats(); fetchPendingQuotes() } }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(intervalId); document.removeEventListener('visibilitychange', vis) }
  }, [])

  async function fetchPendingQuotes() {
    try {
      setQuotesLoading(true)
      const res = await api.get('/bookings/quotes/pending')
      setPendingQuotes(res.data.quotes || [])
    } catch (err) {
      console.error('Failed to fetch pending quotes:', err)
    } finally {
      setQuotesLoading(false)
    }
  }

  async function handleApproveQuote(bookingId) {
    try {
      setProcessingQuote(true)
      await api.post(`/bookings/${bookingId}/approve-quote`, {
        approvedPrice: approvalData.approvedPrice ? parseFloat(approvalData.approvedPrice) : undefined,
        adminComment: approvalData.adminComment
      })
      toast.success('Quote approved!')
      setReviewingQuote(null)
      setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
      fetchPendingQuotes()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve quote')
    } finally {
      setProcessingQuote(false)
    }
  }

  async function handleRejectQuote(bookingId) {
    if (!approvalData.rejectionReason?.trim()) {
      toast.error('Provide a rejection reason')
      return
    }
    try {
      setProcessingQuote(true)
      await api.post(`/bookings/${bookingId}/reject-quote`, {
        rejectionReason: approvalData.rejectionReason
      })
      toast.success('Quote rejected')
      setReviewingQuote(null)
      setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
      fetchPendingQuotes()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject quote')
    } finally {
      setProcessingQuote(false)
    }
  }

  const completionRate = stats.totalBookings ? Math.round((stats.completedBookings / stats.totalBookings) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Auto-updates every 30 seconds</p>
        </div>
        <div className="flex items-center justify-end sm:justify-start">
          <button
            onClick={() => { fetchPendingQuotes() }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            title="Refresh"
          >
            <HiArrowPath className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-start gap-2">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
          <span>{error}</span>
        </div>
      )}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.totalBookings, Icon: HiCalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-500' },
          { label: 'Completed', value: stats.completedBookings, Icon: HiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', sub: `${completionRate}% rate` },
          { label: 'Ongoing', value: stats.ongoingBookings, Icon: HiClock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
          { label: 'Cancelled', value: stats.cancelledBookings, Icon: HiXCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' },
        ].map(kpi => (
          <div
            key={kpi.label}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow min-w-0`}
          >
            <div className={`${kpi.bg} rounded-full p-2 flex-shrink-0`}>
              <kpi.Icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 truncate">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
              {kpi.sub && <p className="text-[10px] text-gray-400 truncate">{kpi.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Quote Approvals ═══ */}
      <Accordion icon={HiDocumentText} title="Quote Approvals" badge={pendingQuotes.length || undefined} defaultOpen={true}>
        {quotesLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : pendingQuotes.length === 0 ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
            <HiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">No Pending Quotes</p>
              <p className="text-[11px] text-gray-500">All quotes have been reviewed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQuotes.map(booking => (
              <div key={booking._id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 break-words">
                      {booking.serviceId?.title || 'Service'}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1 break-words">
                      Client: {booking.clientId?.profile?.name || booking.clientId?.email || 'N/A'}
                    </p>
                    <p className="text-[11px] text-gray-500 break-words">
                      Provider: {booking.providerId?.profile?.name || booking.providerId?.email || 'N/A'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-gray-600">Quoted:</span>
                      <span className="text-sm font-bold text-purple-600">
                        NPR {booking.quote?.quotedPrice?.toLocaleString() || '0'}
                      </span>
                    </div>
                    {booking.quote?.quoteMessage && (
                      <p className="text-[11px] text-gray-500 italic mt-1 break-words">
                        "{booking.quote.quoteMessage}"
                      </p>
                    )}
                  </div>

                  <div className="flex justify-start sm:justify-end">
                    <button
                      onClick={() => setReviewingQuote(reviewingQuote === booking._id ? null : booking._id)}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition flex-shrink-0"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Review Form */}
                {reviewingQuote === booking._id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Approved Price (NPR)</label>
                      <input
                        type="number"
                        value={approvalData.approvedPrice}
                        onChange={e => setApprovalData({ ...approvalData, approvedPrice: e.target.value })}
                        placeholder={`Default: ${booking.quote?.quotedPrice}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Admin Comment</label>
                      <textarea
                        value={approvalData.adminComment}
                        onChange={e => setApprovalData({ ...approvalData, adminComment: e.target.value })}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-y"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Rejection Reason</label>
                      <textarea
                        value={approvalData.rejectionReason}
                        onChange={e => setApprovalData({ ...approvalData, rejectionReason: e.target.value })}
                        placeholder="Required only for rejection..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-400 resize-y"
                        rows={2}
                        maxLength={500}
                        disabled={processingQuote}
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">{approvalData.rejectionReason.length}/500</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                      <button
                        onClick={() => handleApproveQuote(booking._id)}
                        disabled={processingQuote}
                        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {processingQuote ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectQuote(booking._id)}
                        disabled={processingQuote}
                        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {processingQuote ? 'Processing...' : 'Reject'}
                      </button>
                      <button
                        onClick={() => {
                          setReviewingQuote(null)
                          setApprovalData({ approvedPrice: '', adminComment: '', rejectionReason: '' })
                        }}
                        disabled={processingQuote}
                        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-semibold hover:bg-gray-200 disabled:opacity-50 transition"
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
      </Accordion>

      {/* ═══ Disputes ═══ */}
      <Accordion icon={HiShieldCheck} title="Resolve Disputes" defaultOpen={false}>
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
          <HiExclamationTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">No Active Disputes</p>
            <p className="text-[11px] text-amber-700">Monitor platform for any disputes that may arise</p>
          </div>
        </div>
      </Accordion>

      {/* ═══ Refunds ═══ */}
      <Accordion icon={HiCurrencyDollar} title="Refunds & Cancellations" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 p-4 min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 mb-1">Pending Refunds</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 break-words">NPR 2,450</p>
            <p className="text-[10px] text-gray-400 mt-1">From 2 cancelled bookings</p>
          </div>
          <div className="rounded-lg border border-gray-100 p-4 min-w-0">
            <p className="text-[11px] font-semibold text-gray-500 mb-1">Refunded (This Month)</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 break-words">NPR 5,890</p>
            <p className="text-[10px] text-gray-400 mt-1">From 8 cancelled bookings</p>
          </div>
        </div>
      </Accordion>

      {/* ═══ Emergency ═══ */}
      <Accordion icon={HiBolt} title="Emergency Handling" defaultOpen={false}>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
          <HiBolt className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">Emergency Services: Active</p>
            <p className="text-[11px] text-red-600">3 providers available for emergency requests</p>
          </div>
        </div>
      </Accordion>
    </div>
  )
}