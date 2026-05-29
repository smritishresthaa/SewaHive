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
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [badgeUser, setBadgeUser] = useState(null)
  const [selectedBadge, setSelectedBadge] = useState('verified')
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
        kycStatus: u.kycStatus,
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

    const handleAssignBadge = (user) => {
    setBadgeUser(user)
    setSelectedBadge(user.badges?.includes('top-rated') ? 'top-rated' : user.badges?.includes('pro') ? 'pro' : 'verified')
    setShowBadgeModal(true)
  }

  const submitAssignBadge = async () => {
    if (!badgeUser) return

    try {
      const res = await api.patch(`/admin/users/${badgeUser._id}/badge`, {
        badge: selectedBadge,
      })

      if (res.data.success) {
        addRecentAction(`Assigned ${selectedBadge.replace('-', ' ')} badge to ${badgeUser.name}`)
        setShowBadgeModal(false)
        setBadgeUser(null)
        setOpenActionDropdown(null)
        if (selectedUser?._id === badgeUser._id) {
          setIsDrawerOpen(false)
        }
        fetchData()
      }
    } catch (err) {
      openMessageModal(
        'Badge Assignment Failed',
        err.response?.data?.message || 'Failed to assign provider badge',
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
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsDrawerOpen(false)}
          ></div>

          <div className="fixed right-0 top-0 h-full w-full xl:w-[980px] lg:w-[860px] md:w-[720px] bg-gray-50 shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h2 className="text-sm font-bold text-gray-900">User Details</h2>
                <p className="text-xs text-gray-500">Review account, provider status, and admin actions</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    {selectedUser.avatar || selectedUser.profile?.avatarUrl ? (
                      <img
                        className="h-20 w-20 rounded-2xl object-cover shadow-md ring-4 ring-white"
                        src={selectedUser.avatar || selectedUser.profile?.avatarUrl}
                        alt={selectedUser.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}

                    {!selectedUser.avatar && !selectedUser.profile?.avatarUrl && (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white shadow-md">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white shadow-md" style={{ display: 'none' }}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                      <p className="mt-0.5 text-sm text-gray-500">{selectedUser.email}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${
                          selectedUser.role === 'Provider'
                            ? 'bg-green-50 text-green-700 ring-green-200'
                            : 'bg-purple-50 text-purple-700 ring-purple-200'
                        }`}>
                          {selectedUser.role}
                        </span>
                        {getStatusBadge(selectedUser.status)}
                        {getVerificationBadge(selectedUser)}
                      </div>
                    </div>
                  </div>

                  {selectedUser.role === 'Provider' && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Provider Badge</p>
                      <p className="mt-1 text-sm font-bold text-emerald-900">
                        {selectedUser.badges?.includes('top-rated')
                          ? 'Top Rated'
                          : selectedUser.badges?.includes('pro')
                          ? 'Pro'
                          : selectedUser.badges?.includes('verified')
                          ? 'Verified'
                          : 'None'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <HiUsers className="h-4 w-4 text-emerald-600" />
                    Profile Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500">Full Name</span>
                      <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.name}</span>
                    </div>
                    {selectedUser.profile?.gender && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-gray-500">Gender</span>
                        <span className="text-right text-sm font-semibold capitalize text-gray-900">{selectedUser.profile.gender}</span>
                      </div>
                    )}
                    {selectedUser.profile?.dob && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-gray-500">Date of Birth</span>
                        <span className="text-right text-sm font-semibold text-gray-900">{new Date(selectedUser.profile.dob).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedUser.profile?.bio && (
                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-sm text-gray-500">Bio</span>
                        <p className="mt-1 text-sm leading-6 text-gray-900">{selectedUser.profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <HiBriefcase className="h-4 w-4 text-emerald-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-right text-sm font-semibold break-all text-gray-900">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500">Phone</span>
                      <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500">Role</span>
                      <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.role}</span>
                    </div>
                  </div>
                </div>

                {selectedUser.profile?.address && (
                  (selectedUser.profile.address.area ||
                   selectedUser.profile.address.city ||
                   selectedUser.profile.address.postalCode ||
                   selectedUser.profile.address.country) ? (
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <HiShieldCheck className="h-4 w-4 text-emerald-600" />
                        Address
                      </h4>
                      <div className="space-y-3">
                        {selectedUser.profile.address.area && selectedUser.profile.address.area.trim() !== '' && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Area</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.profile.address.area}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.city && selectedUser.profile.address.city.trim() !== '' && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">City</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.profile.address.city}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.postalCode && selectedUser.profile.address.postalCode.trim() !== '' && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Postal Code</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.profile.address.postalCode}</span>
                          </div>
                        )}
                        {selectedUser.profile.address.country && selectedUser.profile.address.country.trim() !== '' && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Country</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.profile.address.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                )}

                {selectedUser.role === 'Provider' && selectedUser.providerDetails && (
                  <>
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <HiBriefcase className="h-4 w-4 text-emerald-600" />
                        Provider Business Info
                      </h4>
                      <div className="space-y-3">
                        {selectedUser.providerDetails.categories && selectedUser.providerDetails.categories.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-500">Categories</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {selectedUser.providerDetails.categories.map((cat, idx) => (
                                <span key={idx} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">{cat}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedUser.providerDetails.hourlyRate && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Hourly Rate</span>
                            <span className="text-right text-sm font-semibold text-gray-900">NPR {selectedUser.providerDetails.hourlyRate}</span>
                          </div>
                        )}
                        {selectedUser.providerDetails.basePrice && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Base Price</span>
                            <span className="text-right text-sm font-semibold text-gray-900">NPR {selectedUser.providerDetails.basePrice}</span>
                          </div>
                        )}
                        {selectedUser.providerDetails.experienceYears !== undefined && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Experience</span>
                            <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.providerDetails.experienceYears} years</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Emergency Available</span>
                          <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.providerDetails.emergencyAvailable ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Featured</span>
                          <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.providerDetails.featured ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <HiStar className="h-4 w-4 text-emerald-600" />
                        Performance Stats
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Completed Bookings</span>
                          <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.completedBookings}</span>
                        </div>
                        {selectedUser.providerDetails.rating && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Average Rating</span>
                            <span className="flex items-center gap-1 text-right text-sm font-semibold text-gray-900">
                              <HiStar className="h-4 w-4 text-yellow-400" />
                              {selectedUser.providerDetails.rating.average.toFixed(1)} ({selectedUser.providerDetails.rating.count} reviews)
                            </span>
                          </div>
                        )}
                        {selectedUser.providerDetails.analytics && (
                          <>
                            {selectedUser.providerDetails.analytics.totalEarnings > 0 && (
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-sm text-gray-500">Total Earnings</span>
                                <span className="text-right text-sm font-semibold text-gray-900">NPR {selectedUser.providerDetails.analytics.totalEarnings}</span>
                              </div>
                            )}
                            {selectedUser.providerDetails.analytics.jobsThisMonth > 0 && (
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-sm text-gray-500">Jobs This Month</span>
                                <span className="text-right text-sm font-semibold text-gray-900">{selectedUser.providerDetails.analytics.jobsThisMonth}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Badges</span>
                          <span className="text-right text-sm font-semibold text-gray-900">
                            {selectedUser.badges?.includes('top-rated')
                              ? 'Top Rated'
                              : selectedUser.badges?.includes('pro')
                              ? 'Pro'
                              : selectedUser.badges?.includes('verified')
                              ? 'Verified'
                              : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                        <HiCheckBadge className="h-4 w-4 text-emerald-600" />
                        KYC Verification
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-gray-500">Status</span>
                          {getVerificationBadge(selectedUser)}
                        </div>
                        {selectedUser.providerStatus && (
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-gray-500">Provider Status</span>
                            <span className="text-right text-sm font-semibold capitalize text-gray-900">{selectedUser.providerStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <HiShieldCheck className="h-4 w-4 text-emerald-600" />
                    Account Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-500">Account Status</span>
                      {getStatusBadge(selectedUser.status)}
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500">Joined</span>
                      <span className="text-right text-sm font-semibold text-gray-900">{formatDate(selectedUser.joinedDate)}</span>
                    </div>

                    {selectedUser.status === 'suspended' && (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Suspended From</span>
                          <span className="text-right text-sm font-semibold text-gray-900">{formatDateTime(selectedUser.suspension?.startsAt)}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-sm text-gray-500">Suspended Until</span>
                          <span className="text-right text-sm font-semibold text-gray-900">
                            {selectedUser.suspension?.endsAt ? formatDateTime(selectedUser.suspension.endsAt) : 'Permanent'}
                          </span>
                        </div>
                        <div className="border-t border-gray-100 pt-3">
                          <span className="text-sm text-gray-500">Suspension Reason</span>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{selectedUser.suspension?.reason || 'No reason provided'}</p>
                        </div>
                      </>
                    )}

                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-sm text-gray-500">User ID</span>
                      <p className="mt-1 break-all font-mono text-xs font-semibold text-gray-900">{selectedUser._id}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => handleSuspendUser(selectedUser)}
                    className="rounded-xl bg-yellow-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-yellow-700"
                  >
                    {selectedUser.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                  </button>

                  {selectedUser.role === 'Provider' && !selectedUser.badges.includes('verified') && (
                    <button
                      onClick={() => handleVerifyProvider(selectedUser)}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Verify Provider
                    </button>
                  )}

                  {selectedUser.role === 'Provider' && (
                    <button
                      onClick={() => handleAssignBadge(selectedUser)}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Assign Provider Badge
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveAccount(selectedUser)}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Remove Account
                  </button>
                </div>
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

            {showBadgeModal && badgeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Assign Provider Badge</h3>
            <p className="mt-1 text-sm text-gray-600">
              Select one trust badge for {badgeUser.name}.
            </p>

            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="verified">Verified</option>
              <option value="pro" disabled={badgeUser.kycStatus !== 'approved'}>Pro</option>
              <option value="top-rated" disabled={badgeUser.kycStatus !== 'approved'}>Top Rated</option>
            </select>

            {badgeUser.kycStatus !== 'approved' && (
              <p className="mt-2 text-xs text-amber-700">
                Pro and Top Rated require approved KYC verification.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowBadgeModal(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAssignBadge}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Save Badge
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