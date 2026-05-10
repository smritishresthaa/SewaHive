import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
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
  HiBars3,
  HiXMark,
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Mobile trigger bar (hidden on desktop) ── */}
      <div className="sticky top-0 z-40 border-b bg-white px-4 py-3 max-lg:block lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Open admin menu"
        >
          <HiBars3 className="h-5 w-5" />
          Menu
        </button>
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer (hidden on desktop) ── */}
      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-[85%] max-w-xs bg-[#f8fafc] shadow-xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end border-b border-gray-200 bg-white px-5 py-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close admin menu"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col overflow-y-auto">
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
                        onClick={() => setMobileOpen(false)}
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
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="fixed left-0 top-[72px] bottom-0 z-40 w-60 bg-white border-r border-gray-200 shadow-[1px_0_10px_rgba(0,0,0,0.02)] max-lg:hidden">
        <div className="flex h-full flex-col overflow-y-auto">
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
        </div>
      </aside>
    </>
  )
}