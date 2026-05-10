import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../utils/axios'
import {
  HiUsers, HiBriefcase, HiCheckBadge, HiNoSymbol,
  HiMagnifyingGlass, HiArrowPath, HiExclamationTriangle,
  HiEye, HiEyeSlash, HiShieldCheck, HiTrash,
  HiXMark, HiEllipsisVertical, HiCheckCircle, HiXCircle, HiClock, HiStar,
} from 'react-icons/hi2'

export default function Users() {
  const [searchParams] = useSearchParams()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalProviders: 0,
    verifiedProviders: 0,
    suspendedAccounts: 0,
  })
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters - get initial search from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Recent actions
  const [recentActions, setRecentActions] = useState([])
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendUser, setSuspendUser] = useState(null)
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendDuration, setSuspendDuration] = useState("1d")
  const [customSuspendUntil, setCustomSuspendUntil] = useState("")

  // Custom action modals
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false)
  const [unsuspendUser, setUnsuspendUser] = useState(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyUser, setVerifyUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteUser, setDeleteUser] = useState(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageModal, setMessageModal] = useState({
    type: 'info',
    title: '',
    message: '',
  })

  // Action dropdown
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 20 })

  // Fetch stats and users
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const openMessageModal = (title, message, type = 'info') => {
    setMessageModal({ title, message, type })
    setShowMessageModal(true)
  }

  const closeMessageModal = () => {
    setShowMessageModal(false)
    setMessageModal({ title: '', message: '', type: 'info' })
  }

  const resetSuspendModalState = () => {
    setShowSuspendModal(false)
    setSuspendUser(null)
    setSuspendReason("")
    setSuspendDuration("1d")
    setCustomSuspendUntil("")
  }

  const fetchData = async () => {
    try {
      setError('')

      // Fetch stats
      const statsRes = await api.get('/admin/dashboard/stats')
      const statsData = statsRes?.data?.data

      // Fetch all users
      const providersRes = await api.get('/admin/users')
      const allUsers = providersRes?.data?.data || []

      if (statsData) {
        setStats({
          totalUsers: (statsData.users?.totalUsers || 0) + (statsData.users?.totalProviders || 0),
          totalClients: statsData.users?.totalUsers || 0,
          totalProviders: statsData.users?.totalProviders || 0,
          verifiedProviders: statsData.users?.verifiedProviders || 0,
          suspendedAccounts: allUsers.filter((u) => u.accountStatus === 'suspended').length,
        })
      }

      // Debug: Log sample user data
      if (allUsers.length > 0) {
        console.log('Sample user data from backend:', {
          profile: allUsers[0].profile,
          avatarUrl: allUsers[0].profile?.avatarUrl,
          photo: allUsers[0].profile?.photo,
          address: allUsers[0].profile?.address,
          suspension: allUsers[0].suspension,
        });
      }

      // Transform users data
      const transformedUsers = allUsers.map(u => ({
        _id: u._id,
        name: u.profile?.name || 'N/A',
        email: u.email || 'N/A',
        phone: u.phone || 'N/A',
        avatar: u.profile?.avatarUrl || u.profile?.photo || null,
        role: u.role === 'provider' ? 'Provider' : 'Client',
        status: u.accountStatus || 'active',
        verification: u.providerDetails?.verificationStatus || 'pending',
        badges: u.providerDetails?.badges || [],
        completedBookings: u.providerDetails?.completedBookings || 0,
        joinedDate: u.createdAt,
        providerDetails: u.providerDetails,
        profile: u.profile,
        location: u.location,
        providerStatus: u.providerStatus,
        suspension: u.suspension || {},
      }))

      setUsers(transformedUsers)
      setFilteredUsers(transformedUsers)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Unable to load user data')
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phone.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role.toLowerCase() === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    // Verification filter (only applies to providers)
    if (verificationFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (user.role === 'Client') return false

        const isVerified = user.badges.includes('verified') || user.verification === 'approved'
        const isPending = (user.verification === 'pending' || user.verification === 'submitted') && !isVerified

        if (verificationFilter === 'verified') {
          return isVerified
        }
        if (verificationFilter === 'pending') {
          return isPending
        }
        if (verificationFilter === 'not_verified') {
          return !isVerified && !isPending
        }
        return true
      })
    }

    setFilteredUsers(filtered)
  }, [searchQuery, roleFilter, statusFilter, verificationFilter, users])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const actionsMenu = e.target.closest('[data-testid="actions-menu"]')
      if (!actionsMenu && openActionDropdown) {
        setOpenActionDropdown(null)
      }
    }

    if (openActionDropdown) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openActionDropdown])

  // Handle actions
  const handleActionClick = (action, user) => {
    console.log('Action clicked:', action, 'User:', user._id)
    switch(action) {
      case 'view':
        handleViewDetails(user)
        break
      case 'suspend':
        handleSuspendUser(user)
        break
      case 'verify':
        handleVerifyProvider(user)
        break
      case 'remove':
        handleRemoveAccount(user)
        break
      default:
        break
    }
    setOpenActionDropdown(null)
  }

  const handleViewDetails = (user) => {
    console.log('Viewing user details:', user)
    console.log('Avatar:', user.avatar)
    console.log('Profile:', user.profile)
    console.log('Address:', user.profile?.address)
    console.log('Suspension:', user.suspension)
    setSelectedUser(user)
    setIsDrawerOpen(true)
    setOpenActionDropdown(null)
  }

  const handleSuspendUser = (user) => {
    if (user.status === 'suspended') {
      setUnsuspendUser(user)
      setShowUnsuspendModal(true)
      return
    }

    setSuspendUser(user)
    setSuspendReason("")
    setSuspendDuration("1d")
    setCustomSuspendUntil("")
    setShowSuspendModal(true)
  }

  const submitUnsuspend = async (user) => {
    try {
      const res = await api.patch(`/admin/users/${user._id}/suspend`, {
        action: 'unsuspend',
      })

      if (res.data.success) {
        addRecentAction(`Reactivated account: ${user.name}`)
        setShowUnsuspendModal(false)
        setUnsuspendUser(null)
        setOpenActionDropdown(null)
        if (selectedUser?._id === user._id) {
          setIsDrawerOpen(false)
        }
        fetchData()
      }
    } catch (err) {
      console.error('Failed to unsuspend user:', err)
      openMessageModal(
        'Reactivation Failed',
        err.response?.data?.message || 'Failed to reactivate user',
        'error'
      )
    }
  }

  const submitSuspend = async () => {
    if (!suspendUser) return

    const durationMap = {
      "1h": 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    }

    let payload = {
      action: 'suspend',
      reason: suspendReason,
      duration: suspendDuration === "permanent" ? null : durationMap[suspendDuration],
      permanent: suspendDuration === "permanent",
    }

    if (suspendDuration === 'custom') {
      if (!customSuspendUntil) {
        openMessageModal(
          'Custom Duration Required',
          'Please select a date and time for the suspension to end.',
          'error'
        )
        return
      }

      const customDate = new Date(customSuspendUntil)
      const now = new Date()

      if (Number.isNaN(customDate.getTime()) || customDate <= now) {
        openMessageModal(
          'Invalid Custom Time',
          'Please choose a future date and time for the suspension end.',
          'error'
        )
        return
      }

      payload.duration = customDate.getTime() - now.getTime()
      payload.permanent = false
    }

    try {
      const res = await api.patch(`/admin/users/${suspendUser._id}/suspend`, payload)

      if (res.data.success) {
        const impact = res.data?.data?.affectedBookings
        const summary = impact?.summary || {}
        addRecentAction(`Suspended account: ${suspendUser.name}`)
        resetSuspendModalState()
        setOpenActionDropdown(null)
        if (selectedUser?._id === suspendUser._id) {
          setIsDrawerOpen(false)
        }
        fetchData()

        if ((summary.autoCancelledCount || 0) > 0 || (summary.manualReviewCount || 0) > 0) {
          const detailLines = [
            `${summary.autoCancelledCount || 0} upcoming booking(s) were auto-cancelled.`,
            `${summary.manualReviewCount || 0} booking(s) need manual admin review.`,
          ]

          if ((summary.totalRefundAmount || 0) > 0) {
            detailLines.push(`NPR ${Number(summary.totalRefundAmount).toLocaleString()} was marked for refund.`)
          }

          openMessageModal(
            'Suspension Applied',
            detailLines.join(' '),
            'success'
          )
        }
      }
    } catch (err) {
      console.error('Failed to suspend user:', err)
      openMessageModal(
        'Suspension Failed',
        err.response?.data?.message || 'Failed to suspend user',
        'error'
      )
    }
  }

  const handleVerifyProvider = async (user) => {
    setVerifyUser(user)
    setShowVerifyModal(true)
  }

  const submitVerifyProvider = async () => {
    if (!verifyUser) return

    try {
      const res = await api.patch(`/admin/users/${verifyUser._id}/verify`)
      if (res.data.success) {
        addRecentAction(`Verified provider: ${verifyUser.name}`)
        setShowVerifyModal(false)
        setVerifyUser(null)
        setOpenActionDropdown(null)
        if (selectedUser?._id === verifyUser._id) {
          setIsDrawerOpen(false)
        }
        fetchData()
      }
    } catch (err) {
      console.error('Failed to verify provider:', err)
      openMessageModal(
        'Verification Failed',
        err.response?.data?.message || 'Failed to verify provider',
        'error'
      )
    }
  }

  const handleRemoveAccount = async (user) => {
    setDeleteUser(user)
    setShowDeleteModal(true)
  }

  const submitRemoveAccount = async () => {
    if (!deleteUser) return

    try {
      const res = await api.delete(`/admin/users/${deleteUser._id}`)
      if (res.data.success) {
        const summary = res.data?.data?.summary
        const autoCancelledCount = Number(summary?.autoCancelledCount || 0)
        const disabledServicesCount = Number(summary?.disabledServicesCount || 0)
        const totalRefundAmount = Number(summary?.totalRefundAmount || 0)

        addRecentAction(`Removed account: ${deleteUser.name}`)
        setShowDeleteModal(false)
        setDeleteUser(null)
        setOpenActionDropdown(null)
        if (selectedUser?._id === deleteUser._id) {
          setIsDrawerOpen(false)
        }
        fetchData()

        if (summary) {
          const detailParts = []
          if (autoCancelledCount > 0) {
            detailParts.push(`${autoCancelledCount} upcoming booking${autoCancelledCount > 1 ? 's were' : ' was'} cancelled`)
          }
          if (disabledServicesCount > 0) {
            detailParts.push(`${disabledServicesCount} service${disabledServicesCount > 1 ? 's were' : ' was'} disabled`)
          }
          if (totalRefundAmount > 0) {
            detailParts.push(`NPR ${totalRefundAmount.toLocaleString()} marked for refund`)
          }

          openMessageModal(
            'Account Removed',
            detailParts.length > 0
              ? `${deleteUser.name} was removed successfully. ${detailParts.join(', ')}.`
              : `${deleteUser.name} was removed successfully.`,
            'success'
          )
        }
      }
    } catch (err) {
      console.error('Failed to remove account:', err)
      const blockingSummary = err.response?.data?.data?.summary
      const blockingCount = Number(blockingSummary?.blockingReviewCount || 0)
      openMessageModal(
        'Delete Failed',
        err.response?.status === 409 && blockingCount > 0
          ? `${err.response?.data?.message || 'Deletion requires admin review first.'} ${blockingCount} booking${blockingCount > 1 ? 's still need' : ' still needs'} manual handling before this account can be deleted.`
          : err.response?.data?.message || 'Failed to remove account',
        'error'
      )
    }
  }

  const addRecentAction = (action) => {
    const newAction = {
      id: Date.now(),
      text: action,
      timestamp: new Date(),
    }
    setRecentActions((prev) => [newAction, ...prev.slice(0, 4)])
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return 'N/A'
    return parsed.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getSuspensionSummary = (user) => {
    if (user.status !== 'suspended') return null
    if (!user.suspension?.endsAt) {
      return 'Permanent suspension'
    }
    return `Until ${formatDateTime(user.suspension.endsAt)}`
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getVerificationBadge = (user) => {
    if (user.role === 'Client') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
    }

    if (user.badges.includes('verified') || user.verification === 'approved') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200"><HiCheckCircle className="w-3.5 h-3.5" />Verified</span>
    }
    if (user.verification === 'pending' || user.verification === 'submitted') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-200"><HiClock className="w-3.5 h-3.5" />Pending</span>
    }
    if (user.verification === 'rejected') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset bg-red-50 text-red-700 ring-red-200"><HiXCircle className="w-3.5 h-3.5" />Rejected</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Not Verified</span>
  }

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Manage all clients and providers</p>
        </div>
        <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Refresh">
          <HiArrowPath className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Users', value: stats.totalUsers, Icon: HiUsers, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
          { label: 'Clients', value: stats.totalClients, Icon: HiUsers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500' },
          { label: 'Providers', value: stats.totalProviders, Icon: HiBriefcase, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
          { label: 'Verified', value: stats.verifiedProviders, Icon: HiCheckBadge, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
          { label: 'Suspended', value: stats.suspendedAccounts, Icon: HiNoSymbol, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${kpi.border} p-3 flex items-center gap-3 hover:shadow-md transition-shadow`}>
            <div className={`${kpi.bg} rounded-full p-2`}><kpi.Icon className={`w-5 h-5 ${kpi.color}`} /></div>
            <div>
              <p className="text-[10px] text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative flex items-center">
              <HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Role</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="all">All Roles</option>
              <option value="client">Client</option>
              <option value="provider">Provider</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Verification</label>
            <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="not_verified">Not Verified</option>
            </select>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <p className="text-gray-500">Showing <span className="font-semibold text-gray-700">{filteredUsers.length}</span> of <span className="font-semibold text-gray-700">{users.length}</span></p>
          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || verificationFilter !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); setVerificationFilter('all') }} className="text-emerald-600 hover:text-emerald-700 font-semibold">Clear</button>
          )}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">KYC</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-gray-400 text-xs">
                    <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center">
                    <HiUsers className="mx-auto w-8 h-8 text-gray-300 mb-1" />
                    <p className="text-xs text-gray-400">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.avatar ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.avatar}
                              alt=""
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold"
                            style={{ display: user.avatar ? 'none' : 'flex' }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.status === 'suspended' && (
                            <div className="mt-0.5 text-[10px] text-red-600 font-medium">
                              {getSuspensionSummary(user)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                        user.role === 'Provider'
                          ? 'bg-green-50 text-green-700 ring-green-200'
                          : 'bg-purple-50 text-purple-700 ring-purple-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{getVerificationBadge(user)}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(user.joinedDate)}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-xs font-medium">
                      <div className="relative" data-testid="actions-menu">
                        <button
                          id={`action-btn-${user._id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('3-dot click detected, userId:', user._id, 'Current state:', openActionDropdown)
                            setOpenActionDropdown(openActionDropdown === user._id ? null : user._id)
                          }}
                          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors relative z-10"
                        >
                          <HiEllipsisVertical className="h-4 w-4" />
                        </button>

                        {openActionDropdown === user._id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-[999] py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick('view', user);
                                }}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              >
                                <HiEye className="h-4 w-4 flex-shrink-0" />
                                <span className="font-medium">View Details</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick('suspend', user);
                                }}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                              >
                                {user.status === 'suspended' ? (
                                  <><HiEyeSlash className="h-4 w-4 flex-shrink-0" /><span className="font-medium">Reactivate Account</span></>
                                ) : (
                                  <><HiNoSymbol className="h-4 w-4 flex-shrink-0" /><span className="font-medium">Suspend Account</span></>
                                )}
                              </button>

                              {user.role === 'Provider' && !user.badges.includes('verified') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActionClick('verify', user);
                                  }}
                                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                >
                                  <HiShieldCheck className="h-4 w-4 flex-shrink-0" />
                                  <span className="font-medium">Verify Provider</span>
                                </button>
                              )}

                              <div className="border-t border-gray-100 my-1"></div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick('remove', user);
                                }}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                <HiTrash className="h-4 w-4 flex-shrink-0" />
                                <span className="font-medium">Remove Account</span>
                              </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Admin Actions */}
      {recentActions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-900 mb-2">Recent Admin Actions</h3>
          <div className="space-y-1.5">
            {recentActions.map((action) => (
              <div key={action.id} className="flex items-center text-[11px]">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full mr-2.5"></span>
                <span className="text-gray-700">{action.text}</span>
                <span className="ml-auto text-gray-400 text-[10px]">
                  {action.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {isDrawerOpen && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          ></div>

          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-900">User Details</h2>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                {selectedUser.avatar || selectedUser.profile?.avatarUrl ? (
                  <img
                    className="h-24 w-24 rounded-full mx-auto object-cover mb-4 border-4 border-white shadow-lg"
                    src={selectedUser.avatar || selectedUser.profile?.avatarUrl}
                    alt={selectedUser.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {!selectedUser.avatar && !selectedUser.profile?.avatarUrl && (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg" style={{display: 'none'}}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  {getStatusBadge(selectedUser.status)}
                  {getVerificationBadge(selectedUser)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Full Name:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUser.name}</span>
                    </div>
                    {selectedUser.profile?.gender && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{selectedUser.profile.gender}</span>
                      </div>
                    )}
                    {selectedUser.profile?.dob && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date of Birth:</span>
                        <span className="text-sm font-medium text-gray-900">{new Date(selectedUser.profile.dob).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedUser.profile?.bio && (
                      <div className="pt-2">
                        <span className="text-sm text-gray-600">Bio:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedUser.profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium text-gray-900 break-all">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUser.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Role:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUser.role}</span>
                    </div>
                  </div>
                </div>

                {selectedUser.profile?.address && (
                  (selectedUser.profile.address.area ||
                   selectedUser.profile.address.city ||
                   selectedUser.profile.address.postalCode ||
                   selectedUser.profile.address.country) ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Address
                      </h4>
                      <div className="space-y-2">
                        {selectedUser.profile.address.area && selectedUser.profile.address.area.trim() !== '' && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Area:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedUser.profile.address.area}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.city && selectedUser.profile.address.city.trim() !== '' && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">City:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedUser.profile.address.city}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.postalCode && selectedUser.profile.address.postalCode.trim() !== '' && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Postal Code:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedUser.profile.address.postalCode}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.country && selectedUser.profile.address.country.trim() !== '' && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Country:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedUser.profile.address.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                )}

                {selectedUser.role === 'Provider' && selectedUser.providerDetails && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Provider Business Info
                      </h4>
                      <div className="space-y-2">
                        {selectedUser.providerDetails.categories && selectedUser.providerDetails.categories.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600">Categories:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedUser.providerDetails.categories.map((cat, idx) => (
                                <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{cat}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedUser.providerDetails.hourlyRate && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Hourly Rate:</span>
                            <span className="text-sm font-medium text-gray-900">NPR {selectedUser.providerDetails.hourlyRate}</span>
                          </div>
                        )}
                        {selectedUser.providerDetails.basePrice && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Base Price:</span>
                            <span className="text-sm font-medium text-gray-900">NPR {selectedUser.providerDetails.basePrice}</span>
                          </div>
                        )}
                        {selectedUser.providerDetails.experienceYears !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Experience:</span>
                            <span className="text-sm font-medium text-gray-900">{selectedUser.providerDetails.experienceYears} years</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Emergency Available:</span>
                          <span className="text-sm font-medium text-gray-900">{selectedUser.providerDetails.emergencyAvailable ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Featured:</span>
                          <span className="text-sm font-medium text-gray-900">{selectedUser.providerDetails.featured ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Performance Stats
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Completed Bookings:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedUser.completedBookings}
                          </span>
                        </div>
                        {selectedUser.providerDetails.rating && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Average Rating:</span>
                              <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                <HiStar className="w-4 h-4 text-yellow-400" /> {selectedUser.providerDetails.rating.average.toFixed(1)} ({selectedUser.providerDetails.rating.count} reviews)
                              </span>
                            </div>
                          </>
                        )}
                        {selectedUser.providerDetails.analytics && (
                          <>
                            {selectedUser.providerDetails.analytics.totalEarnings > 0 && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Earnings:</span>
                                <span className="text-sm font-medium text-gray-900">NPR {selectedUser.providerDetails.analytics.totalEarnings}</span>
                              </div>
                            )}
                            {selectedUser.providerDetails.analytics.jobsThisMonth > 0 && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Jobs This Month:</span>
                                <span className="text-sm font-medium text-gray-900">{selectedUser.providerDetails.analytics.jobsThisMonth}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Badges:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedUser.badges && selectedUser.badges.length > 0 ? selectedUser.badges.join(', ') : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        KYC Verification
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Status:</span>
                          {getVerificationBadge(selectedUser)}
                        </div>
                        {selectedUser.providerStatus && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Provider Status:</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{selectedUser.providerStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Account Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Account Status:</span>
                      {getStatusBadge(selectedUser.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Joined:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(selectedUser.joinedDate)}
                      </span>
                    </div>

                    {selectedUser.status === 'suspended' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Suspended From:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(selectedUser.suspension?.startsAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Suspended Until:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedUser.suspension?.endsAt ? formatDateTime(selectedUser.suspension.endsAt) : 'Permanent'}
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-sm text-gray-600">Suspension Reason:</span>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedUser.suspension?.reason || 'No reason provided'}
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <span className="text-sm text-gray-600">User ID:</span>
                      <p className="text-xs font-medium text-gray-900 font-mono mt-1 break-all">
                        {selectedUser._id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => handleSuspendUser(selectedUser)}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  {selectedUser.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                </button>
                {selectedUser.role === 'Provider' && !selectedUser.badges.includes('verified') && (
                  <button
                    onClick={() => handleVerifyProvider(selectedUser)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Verify Provider
                  </button>
                )}
                <button
                  onClick={() => handleRemoveAccount(selectedUser)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Remove Account
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Suspend Account</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Restrict {suspendUser?.name || "this user"} from accessing the app.
                </p>
              </div>
              <button
                onClick={resetSuspendModalState}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  placeholder="Enter suspension reason"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duration
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="custom">Custom Date & Time</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              {suspendDuration === 'custom' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Suspend Until
                  </label>
                  <input
                    type="datetime-local"
                    value={customSuspendUntil}
                    onChange={(e) => setCustomSuspendUntil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}

              <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                Suspended users will only be able to access the landing page until the suspension expires or is removed by admin. Any upcoming bookings that fall inside the suspension window will be auto-cancelled when it is safe to do so, and active work that already started will be flagged for manual admin review.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={resetSuspendModalState}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitSuspend}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnsuspendModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reactivate Account</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Restore full access for {unsuspendUser?.name || "this user"}.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUnsuspendModal(false)
                  setUnsuspendUser(null)
                }}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              This will remove the current suspension and allow the user to access the app normally again.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUnsuspendModal(false)
                  setUnsuspendUser(null)
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitUnsuspend(unsuspendUser)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                Reactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verify Provider</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Mark {verifyUser?.name || "this provider"} as verified.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVerifyModal(false)
                  setVerifyUser(null)
                }}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
              This will update the provider status and add the verified badge to the account.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVerifyModal(false)
                  setVerifyUser(null)
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitVerifyProvider}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Verify Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Remove Account</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Permanently remove {deleteUser?.name || "this user"}.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteUser(null)
                }}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              This action cannot be undone. The account will be marked as deleted, provider services will be disabled, and cancellable upcoming bookings will be handled automatically where safe.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteUser(null)
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitRemoveAccount}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Remove Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold ${
                  messageModal.type === 'error' ? 'text-red-700' : 'text-gray-900'
                }`}>
                  {messageModal.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {messageModal.message}
                </p>
              </div>
              <button
                onClick={closeMessageModal}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeMessageModal}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                  messageModal.type === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}