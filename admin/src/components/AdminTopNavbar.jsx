import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { HiBell, HiUser, HiCog, HiLockClosed, HiArrowRightOnRectangle } from 'react-icons/hi2'
import AdminNotificationCenter from './AdminNotificationCenter'
import api from '../utils/axios'
import logo from '../assets/logo.png'

export default function AdminTopNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchResults, setSearchResults] = useState({ users: [], bookings: [], services: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const profileMenuRef = useRef(null)
  const searchRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        setShowResults(false)
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({ users: [], bookings: [], services: [] })
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      // Search users
      const usersRes = await api.get(`/admin/users?search=${query}`)
      const users = usersRes?.data?.data?.slice(0, 5) || []

      // Search bookings (if endpoint exists)
      let bookings = []
      try {
        const bookingsRes = await api.get(`/admin/bookings?search=${query}`)
        bookings = bookingsRes?.data?.data?.slice(0, 5) || []
      } catch (err) {
        console.log('Bookings search not available')
      }

      // Search services (if endpoint exists)
      let services = []
      try {
        const servicesRes = await api.get(`/admin/services?search=${query}`)
        services = servicesRes?.data?.data?.slice(0, 5) || []
      } catch (err) {
        console.log('Services search not available')
      }

      setSearchResults({ users, bookings, services })
      setShowResults(true)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)
  }

  const handleResultClick = (type, id, name) => {
    // For user results, navigate to Users page with search filter
    if (type === 'user') {
      navigate(`/users?search=${encodeURIComponent(name || '')}`)
      setSearchQuery('')
      setShowResults(false)
      return
    }
    
    // For bookings and services, navigate to their respective pages
    navigate(`/bookings`)
    setShowResults(false)
    setSearchQuery('')
  }

  const hasResults = searchResults.users.length > 0 || searchResults.bookings.length > 0 || searchResults.services.length > 0

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="px-8 py-4 flex items-center justify-between gap-6">
        {/* LEFT - Logo */}
        <Link to="/dashboard" className="flex-shrink-0">
          <img src={logo} alt="SewaHive Admin" className="h-8" />
        </Link>

        {/* CENTER - Enhanced Search Bar */}
        <div className="flex-1 max-w-sm" ref={searchRef}>
          <div className="relative group">
            <div className={`absolute inset-y-0 left-3 flex items-center transition-colors ${
              searchFocused ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
            }`}>
              {isSearching ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              placeholder="Search users, bookings, services..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                setSearchFocused(false)
                // Delay hiding results to allow clicking
                setTimeout(() => {
                  if (!searchRef.current?.contains(document.activeElement)) {
                    setShowResults(false)
                  }
                }, 200)
              }}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border-2 text-sm placeholder-gray-400 transition-all duration-150 ${
                searchFocused
                  ? 'border-emerald-500 bg-white shadow-md'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              } focus:outline-none focus:bg-white`}
            />

            {/* Search Results Dropdown */}
            {showResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                {!isSearching && !hasResults && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No results found for "{searchQuery}"
                  </div>
                )}

                {/* Users */}
                {searchResults.users.length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      Users
                    </div>
                    {searchResults.users.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleResultClick('user', user._id, user.profile?.name || user.email)}
                        className="w-full px-4 py-2 hover:bg-gray-50 transition flex items-center gap-3 text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {user.profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.profile?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          user.role === 'provider' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {user.role === 'provider' ? 'Provider' : 'Client'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Bookings */}
                {searchResults.bookings.length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      Bookings
                    </div>
                    {searchResults.bookings.map((booking) => (
                      <button
                        key={booking._id}
                        onClick={() => handleResultClick('booking', booking._id, `Booking #${booking._id?.slice(-8)}`)}
                        className="w-full px-4 py-2 hover:bg-gray-50 transition flex items-center gap-3 text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Booking #{booking._id?.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {booking.service?.title || 'Service'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Services */}
                {searchResults.services.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      Services
                    </div>
                    {searchResults.services.map((service) => (
                      <button
                        key={service._id}
                        onClick={() => handleResultClick('service', service._id, service.title)}
                        className="w-full px-4 py-2 hover:bg-gray-50 transition flex items-center gap-3 text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {service.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {service.category?.name || 'Category'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* View All Results */}
                {hasResults && (
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowResults(false)
                        setSearchQuery('')
                      }}
                      className="w-full px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded transition font-medium"
                    >
                      Close Search
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Notification Bell + Profile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Real-time Notification Center */}
          <AdminNotificationCenter />

          {/* Profile Avatar - Clickable */}
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold hover:bg-emerald-700 transition-colors duration-150"
          >
            {user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </button>

          {/* Hamburger Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors duration-150"
              aria-label="Menu"
            >
              <div className="space-y-[3px]">
                <span className="block w-4 h-[2px] bg-gray-800 transition-all" />
                <span className="block w-4 h-[2px] bg-gray-800 transition-all" />
                <span className="block w-4 h-[2px] bg-gray-800 transition-all" />
              </div>
            </button>

            {/* Dropdown Menu - Professional Style Like Client */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-50">
                {/* USER INFO SECTION */}
                <div className="px-3 py-2">
                  <p className="font-semibold text-gray-900 text-sm">
                    Administrator
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <hr className="my-2" />

                {/* MAIN LINKS */}
                <DropdownLink 
                  to="/settings" 
                  icon={<HiCog className="text-gray-600" />}
                  onClick={() => setShowProfileMenu(false)}
                >
                  Settings
                </DropdownLink>

                <hr className="my-2" />

                {/* SECURITY OPTIONS */}
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-100 transition">
                  <HiLockClosed className="text-lg text-gray-600" />
                  <span className="text-sm">Change Password</span>
                </button>

                <hr className="my-2" />

                {/* LOGOUT */}
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                >
                  <HiArrowRightOnRectangle className="text-lg" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// Helper component for dropdown links
function DropdownLink({ to, icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-100 transition"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{children}</span>
    </Link>
  )
}
