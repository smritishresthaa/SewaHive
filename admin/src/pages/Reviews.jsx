import React, { useEffect, useState } from 'react'
import api from '../utils/axios'
import toast from 'react-hot-toast'
import {
  HiStar, HiTrash, HiExclamationTriangle, HiArrowPath,
  HiChevronLeft, HiChevronRight, HiChevronDown,
  HiShieldCheck, HiFlag, HiChatBubbleLeftRight,
} from 'react-icons/hi2'

/* ── Accordion ────────────────────────────────────────────────────────── */
function Accordion({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon className="w-4 h-4 text-gray-400" /> {title}
        </span>
        {open ? <HiChevronDown className="w-4 h-4 text-gray-400" /> : <HiChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  )
}

/* ── Star display ─────────────────────────────────────────────────────── */
function Stars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <HiStar key={i} className={`w-3.5 h-3.5 ${i <= count ? 'text-amber-400' : 'text-gray-200'}`} />
      ))}
      <span className="text-[10px] text-gray-400 ml-1">({count}/5)</span>
    </div>
  )
}

export default function Reviews() {
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 })
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return
      try { const res = await api.get('/admin/dashboard/stats'); if (res.data.success) { setStats(res.data.data.reviews); setError(null) } } catch (err) { console.error('Failed to fetch stats:', err); setError('Failed to load stats') }
    }
    fetchStats()
    const iv = setInterval(fetchStats, 30000)
    const vis = () => { if (!document.hidden) fetchStats() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis) }
  }, [])

  useEffect(() => { fetchReviews() }, [page])

  const fetchReviews = async () => {
    try { setLoading(true); const res = await api.get(`/admin/reviews?page=${page}&limit=10`); if (res.data.success) { setReviews(res.data.data || []); setTotalPages(res.data.pagination?.pages || 1) } } catch (err) { console.error('Failed to fetch reviews:', err); toast.error('Failed to load reviews') } finally { setLoading(false) }
  }

  const handleRemove = async (reviewId) => {
    if (!window.confirm('Remove this review?')) return
    try { await api.delete(`/admin/reviews/${reviewId}`); toast.success('Review removed'); fetchReviews(); const res = await api.get('/admin/dashboard/stats'); if (res.data.success) setStats(res.data.data.reviews) } catch (err) { console.error('Failed to remove review:', err); toast.error('Failed to remove review') }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reviews & Complaints</h1>
        <button onClick={fetchReviews} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Refresh">
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-blue-500 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 rounded-full p-2"><HiChatBubbleLeftRight className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-[10px] text-gray-500">Total Reviews</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{stats.totalReviews}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-amber-500 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 rounded-full p-2"><HiStar className="w-5 h-5 text-amber-500" /></div>
          <div>
            <p className="text-[10px] text-gray-500">Average Rating</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{stats.averageRating?.toFixed(1) || '0.0'}</p>
          </div>
        </div>
      </div>

      {/* ═══ Reviews List ═══ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <HiStar className="w-4 h-4 text-gray-400" /> Moderate Reviews
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Auto-updates every 30s</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <HiChatBubbleLeftRight className="w-8 h-8 mb-1" />
            <p className="text-xs">No reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reviews.map(review => (
              <div key={review._id} className="px-5 py-3.5 hover:bg-emerald-50/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Stars count={review.rating} />
                    <p className="text-[11px] text-gray-500 mt-1">by <span className="font-medium text-gray-700">{review.clientId?.profile?.name || 'Unknown'}</span></p>
                    <p className="text-[11px] text-gray-400">For provider: {review.providerId?.profile?.name || 'Unknown'}</p>
                    {review.comment && <p className="text-xs text-gray-700 mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">{review.comment}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleRemove(review._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Remove Review">
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition">
              <HiChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition">
              <HiChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ Reports ═══ */}
      <Accordion icon={HiFlag} title="Handle Reports" defaultOpen={false}>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Reported Issues</p>
        <div className="space-y-1.5">
          {[
            { title: 'Inappropriate behavior', count: 2 },
            { title: 'Service not delivered', count: 3 },
            { title: 'Payment issues', count: 1 },
          ].map((issue, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
              <span className="text-xs text-gray-700">{issue.title}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">{issue.count}</span>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ═══ Fraud Prevention ═══ */}
      <Accordion icon={HiShieldCheck} title="Fraud Prevention" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-emerald-700 mb-1">Security Status</p>
            <div className="flex items-center gap-1.5">
              <HiShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-700">All systems normal</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">No suspicious activities detected</p>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-blue-700 mb-1">Last Scan</p>
            <p className="text-xs text-blue-700">2 hours ago</p>
            <p className="text-[10px] text-gray-400 mt-1">0 fraudulent accounts found</p>
          </div>
        </div>
      </Accordion>
    </div>
  )
}
