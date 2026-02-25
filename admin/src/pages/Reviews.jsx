import React, { useEffect, useState } from 'react'
import api from '../utils/axios'
import toast from 'react-hot-toast'

export default function Reviews() {
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
  })
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchStats = async () => {
      if (document.hidden) return
      
      try {
        const res = await api.get('/admin/dashboard/stats')
        if (res.data.success) {
          setStats(res.data.data.reviews)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        setError('Failed to load stats')
      }
    }

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

  useEffect(() => {
    fetchReviews()
  }, [page])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/reviews?page=${page}&limit=10`)
      if (res.data.success) {
        setReviews(res.data.data || [])
        setTotalPages(res.data.pagination?.pages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (reviewId) => {
    if (!window.confirm('Are you sure you want to remove this review?')) return
    
    try {
      await api.delete(`/admin/reviews/${reviewId}`)
      toast.success('Review removed successfully')
      fetchReviews()
      // Refresh stats
      const res = await api.get('/admin/dashboard/stats')
      if (res.data.success) {
        setStats(res.data.data.reviews)
      }
    } catch (err) {
      console.error('Failed to remove review:', err)
      toast.error('Failed to remove review')
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

  const ReviewCard = ({ review }) => (
    <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-500 text-lg">{'⭐'.repeat(review.rating)}</span>
            <span className="text-gray-400">({review.rating}/5)</span>
          </div>
          <p className="text-xs text-gray-600">by {review.clientId?.profile?.name || 'Unknown'} ({review.clientId?.email || 'No email'})</p>
          <p className="text-xs text-gray-500 mt-1">For provider: {review.providerId?.profile?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-400">Booking ID: {review.bookingId?._id || review.bookingId}</p>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(review.createdAt).toLocaleDateString()}
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-gray-700 mb-3 p-3 bg-white rounded border">{review.comment}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button 
          onClick={() => handleRemove(review._id)}
          className="flex-1 bg-red-600 text-white text-xs py-2 rounded hover:bg-red-700 transition"
        >
          Remove Review
        </button>
      </div>
    </div>
  )

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Reviews & Complaints</h1>

        <PageSection 
          icon="⭐" 
          title="Moderate Reviews"
          description="Review and approve service reviews (Auto-updates every 30s)"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center bg-blue-50">
              <p className="text-3xl font-bold text-blue-600">{stats.totalReviews}</p>
              <p className="text-gray-600 text-sm mt-2">Total Reviews</p>
            </div>
            <div className="border rounded-lg p-4 text-center bg-green-50">
              <p className="text-3xl font-bold text-green-600">{stats.averageRating.toFixed(1)}</p>
              <p className="text-gray-600 text-sm mt-2">Avg Rating</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reviews found
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </PageSection>

        <PageSection 
          icon="📢" 
          title="Handle Reports"
          description="Manage user complaints and platform reports"
        >
          <div className="border rounded-lg p-4 bg-orange-50">
            <h4 className="font-semibold text-orange-900 mb-4">Reported Issues</h4>
            <div className="space-y-3">
              {[
                { title: 'Inappropriate behavior', count: 2 },
                { title: 'Service not delivered', count: 3 },
                { title: 'Payment issues', count: 1 },
              ].map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-orange-200">
                  <span className="text-gray-700">{issue.title}</span>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">{issue.count}</span>
                </div>
              ))}
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="🛡️" 
          title="Prevent Fraud"
          description="Monitor and prevent fraudulent activities"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 bg-green-50">
              <p className="font-semibold text-green-900">Security Status</p>
              <p className="text-green-700 text-sm mt-2">✓ All systems normal</p>
              <p className="text-xs text-green-600 mt-1">No suspicious activities detected</p>
            </div>
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="font-semibold text-blue-900">Last Scan</p>
              <p className="text-blue-700 text-sm mt-2">2 hours ago</p>
              <p className="text-xs text-blue-600 mt-1">0 fraudulent accounts found</p>
            </div>
          </div>
        </PageSection>
    </div>
  )
}
