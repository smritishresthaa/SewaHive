import { Link, useLocation } from "react-router-dom";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { useMemo, useState } from "react";

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/providers", label: "Provider Management" },
      { to: "/admin/disputes", label: "Disputes" },
      { to: "/admin/leaderboard", label: "Leaderboard" },
    ],
    []
  );

  const isActive = (path) =>
    path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);

  const linkClass = (path) =>
    `block rounded-xl px-4 py-3 text-sm transition ${
      isActive(path)
        ? "bg-brand-100 text-brand-700 font-semibold"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <>
      {/* Mobile Header Button */}
      <div className="lg:hidden px-4 py-3 border-b bg-white sticky top-0 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Open admin menu"
        >
          <HiBars3 className="h-5 w-5" />
          Menu
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-[60] h-full w-[85%] max-w-xs bg-white shadow-xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-lg font-bold text-gray-900">Admin Panel</p>
            <p className="text-xs text-gray-500">Navigation</p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close admin menu"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={linkClass(item.to)}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 border-r bg-white">
        <div className="sticky top-0 h-screen overflow-y-auto p-6">
          <div className="mb-6">
            <div className="text-lg font-bold text-gray-900">Admin Panel</div>
            <p className="mt-1 text-sm text-gray-500">Manage platform operations</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass(item.to)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}