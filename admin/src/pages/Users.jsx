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
  
  // Action dropdown
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 20 })

  // Fetch stats and users
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      setError('')
      
      // Fetch stats
      const statsRes = await api.get('/admin/dashboard/stats')
      const statsData = statsRes?.data?.data
      
      if (statsData) {
        setStats({
          totalUsers: (statsData.users?.totalUsers || 0) + (statsData.users?.totalProviders || 0),
          totalClients: statsData.users?.totalUsers || 0,
          totalProviders: statsData.users?.totalProviders || 0,
          verifiedProviders: statsData.users?.activeProviders || 0,
          suspendedAccounts: 0, // TODO: Add suspended count to backend
        })
      }

      // Fetch all providers
      const providersRes = await api.get('/admin/users')
      const allUsers = providersRes?.data?.data || []
      
      // Debug: Log sample user data
      if (allUsers.length > 0) {
        console.log('Sample user data from backend:', {
          profile: allUsers[0].profile,
          avatarUrl: allUsers[0].profile?.avatarUrl,
          photo: allUsers[0].profile?.photo,
          address: allUsers[0].profile?.address
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
        // Skip clients - verification doesn't apply to them
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
      // Check if click is on the action menu button or inside the dropdown
      const actionsMenu = e.target.closest('[data-testid="actions-menu"]');
      if (!actionsMenu && openActionDropdown) {
        setOpenActionDropdown(null);
      }
    }

    if (openActionDropdown) {
      // Small delay to prevent immediate closure from the button click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
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
    setSelectedUser(user)
    setIsDrawerOpen(true)
    setOpenActionDropdown(null)
  }

  const handleSuspendUser = async (user) => {
    const action = user.status === 'suspended' ? 'unsuspend' : 'suspend'
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return
    
    try {
      const res = await api.patch(`/admin/users/${user._id}/suspend`)
      if (res.data.success) {
        addRecentAction(`${action === 'suspend' ? 'Suspended' : 'Reactivated'} account: ${user.name}`)
        setOpenActionDropdown(null)
        setIsDrawerOpen(false)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to suspend user:', err)
      alert(err.response?.data?.message || 'Failed to suspend user')
    }
  }

  const handleVerifyProvider = async (user) => {
    if (!confirm(`Verify ${user.name} as a provider?`)) return
    
    try {
      const res = await api.patch(`/admin/users/${user._id}/verify`)
      if (res.data.success) {
        addRecentAction(`Verified provider: ${user.name}`)
        setOpenActionDropdown(null)
        setIsDrawerOpen(false)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to verify provider:', err)
      alert(err.response?.data?.message || 'Failed to verify provider')
    }
  }

  const handleRemoveAccount = async (user) => {
    if (!confirm(`PERMANENTLY DELETE ${user.name}? This action cannot be undone.`)) return
    
    try {
      const res = await api.delete(`/admin/users/${user._id}`)
      if (res.data.success) {
        addRecentAction(`Removed account: ${user.name}`)
        setOpenActionDropdown(null)
        setIsDrawerOpen(false)
        fetchData()
      }
    } catch (err) {
      console.error('Failed to remove account:', err)
      alert(err.response?.data?.message || 'Failed to remove account')
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
    // Clients don't need KYC verification
    if (user.role === 'Client') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
    }
    
    // Only providers need KYC verification
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
      <div className="flex items-center justify-between">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Name, email, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
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
          <table className="w-full text-xs">
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
                        
                        {/* Dropdown - render inline */}
                        {openActionDropdown === user._id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-[999] py-1">
                              {/* View Details */}
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

                              {/* Suspend/Unsuspend Account */}
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

                              {/* Verify Provider - Only for unverified providers */}
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

                              {/* Divider before dangerous action */}
                              <div className="border-t border-gray-100 my-1"></div>

                              {/* Remove Account */}
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsDrawerOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-900">User Details</h2>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              {/* User Info */}
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
                {/* Fallback avatar (hidden by default, shown on image error) */}
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

              {/* Details */}
              <div className="space-y-4">
                {/* Profile Information */}
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

                {/* Contact Information */}
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

                {/* Address */}
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

                {/* Only show provider-specific sections for providers */}
                {selectedUser.role === 'Provider' && selectedUser.providerDetails && (
                  <>
                    {/* Provider Business Info */}
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

                    {/* Provider Stats */}
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
                            {selectedUser.badges && selectedUser.badges !== 'none' ? selectedUser.badges : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KYC Verification */}
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

                {/* Account Info */}
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
                    <div>
                      <span className="text-sm text-gray-600">User ID:</span>
                      <p className="text-xs font-medium text-gray-900 font-mono mt-1 break-all">
                        {selectedUser._id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => handleSuspendUser(selectedUser)}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  {selectedUser.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                </button>
                {/* Only show verify button for unverified providers */}
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
    </div>
  )
}
