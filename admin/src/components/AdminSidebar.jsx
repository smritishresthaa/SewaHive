import { Link, useLocation } from 'react-router-dom'
import {
  HiChartBarSquare,
  HiTrophy,
  HiUsers,
  HiWrenchScrewdriver,
  HiSquares2X2,
  HiCalendarDays,
  HiCreditCard,
  HiStar,
  HiShieldCheck,
  HiAcademicCap,
  HiClipboardDocumentList,
  HiExclamationTriangle,
  HiChatBubbleLeftRight,
  HiCog6Tooth,
} from 'react-icons/hi2'

const nav = [
  { heading: null, items: [
    { to: '/dashboard', label: 'Dashboard', icon: HiChartBarSquare },
    { to: '/leaderboard', label: 'Leaderboards', icon: HiTrophy },
  ]},
  { heading: 'Management', items: [
    { to: '/users', label: 'Users', icon: HiUsers },
    { to: '/services', label: 'Services', icon: HiWrenchScrewdriver },
    { to: '/categories', label: 'Categories', icon: HiSquares2X2 },
  ]},
  { heading: 'Operations', items: [
    { to: '/bookings', label: 'Bookings', icon: HiCalendarDays },
    { to: '/payments', label: 'Payments', icon: HiCreditCard },
    { to: '/reviews', label: 'Reviews', icon: HiStar },
    { to: '/support', label: 'Support', icon: HiChatBubbleLeftRight },
  ]},
  { heading: 'Compliance', items: [
    { to: '/verification', label: 'Verifications', icon: HiShieldCheck },
    { to: '/skill-reviews', label: 'Skill Reviews', icon: HiAcademicCap },
    { to: '/category-requests', label: 'Category Requests', icon: HiClipboardDocumentList },
    { to: '/disputes', label: 'Disputes', icon: HiExclamationTriangle },
  ]},
  { heading: 'System', items: [
    { to: '/settings', label: 'Settings', icon: HiCog6Tooth },
  ]},
]

export default function AdminSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="w-60 bg-[#f8fafc] border-r border-gray-200 flex flex-col h-screen fixed left-0 top-16 overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className="h-px bg-gray-100 my-2" />}
            {section.heading && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {section.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 border-l-[3px] border-emerald-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                      active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">SewaHive Admin v2.0</p>
      </div>
    </aside>
  )
}