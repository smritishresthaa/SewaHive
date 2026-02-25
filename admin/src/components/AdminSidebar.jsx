import { Link, useLocation } from 'react-router-dom'

export default function AdminSidebar() {
  const { pathname } = useLocation()

  const linkClass = (path) =>
    `block px-4 py-2 rounded-lg text-sm ${
      pathname === path
        ? 'bg-emerald-500 text-white font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  const sectionTitle = 'text-xs font-semibold text-gray-500 uppercase px-4 py-2 mt-4 mb-2'

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-16 overflow-y-auto">
      <nav className="flex-1 p-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          <Link to="/dashboard" className={linkClass('/dashboard')}>
            📊 Dashboard
          </Link>
          <Link to="/leaderboard" className={linkClass('/leaderboard')}>
            🏆 Leaderboards
          </Link>
        </div>

        {/* Management */}
        <div>
          <h3 className={sectionTitle}>Management</h3>
          <div className="space-y-1">
            <Link to="/users" className={linkClass('/users')}>
              👥 Users
            </Link>
            <Link to="/services" className={linkClass('/services')}>
              🛠️ Services
            </Link>
            <Link to="/categories" className={linkClass('/categories')}>
              📂 Categories
            </Link>
          </div>
        </div>

        {/* Operations */}
        <div>
          <h3 className={sectionTitle}>Operations</h3>
          <div className="space-y-1">
            <Link to="/bookings" className={linkClass('/bookings')}>
              📅 Bookings
            </Link>
            <Link to="/payments" className={linkClass('/payments')}>
              💳 Payments
            </Link>
            <Link to="/reviews" className={linkClass('/reviews')}>
              ⭐ Reviews
            </Link>
          </div>
        </div>

        {/* Compliance */}
        <div>
          <h3 className={sectionTitle}>Compliance</h3>
          <div className="space-y-1">
            <Link to="/verification" className={linkClass('/verification')}>
              ✅ Verifications
            </Link>
            <Link to="/skill-reviews" className={linkClass('/skill-reviews')}>
              🎓 Skill Reviews
            </Link>
            <Link to="/category-requests" className={linkClass('/category-requests')}>
              📋 Category Requests
            </Link>
            <Link to="/disputes" className={linkClass('/disputes')}>
              ⚠️ Disputes
            </Link>
          </div>
        </div>

        {/* Settings */}
        <div>
          <h3 className={sectionTitle}>System</h3>
          <div className="space-y-1">
            <Link to="/settings" className={linkClass('/settings')}>
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  )
}
