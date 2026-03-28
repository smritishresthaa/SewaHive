import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { HiBars3, HiXMark } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";
import logo from "../../logos/logo.png";
import UserDropdown from "./UserDropdown";
import NotificationBell from "./NotificationBell";

export default function ClientTopNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatarUrl = user?.profile?.avatarUrl;
  const initial =
    user?.profile?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label="Open client navigation"
          >
            <HiBars3 className="h-6 w-6" />
          </button>

          <Link to="/" className="flex shrink-0 items-center">
            <img src={logo} alt="SewaHive" className="h-7 w-auto sm:h-8" />
          </Link>
        </div>

        {/* Desktop Right */}
        <div className="hidden items-center gap-3 sm:flex md:gap-4">
          <Link
            to="/provider"
            className="hidden rounded-full border bg-brand-100 px-4 py-2 text-sm font-medium text-brand-700 md:inline-flex lg:px-5"
          >
            Become a Tasker
          </Link>

          <NotificationBell />

          <button
            onClick={() => navigate("/client/profile")}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 font-semibold text-white"
            aria-label="Open profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.textContent = initial;
                  }
                }}
              />
            ) : (
              initial
            )}
          </button>

          <UserDropdown />
        </div>

        {/* Mobile Right */}
        <div className="flex items-center gap-2 sm:hidden">
          <NotificationBell />

          <button
            onClick={() => navigate("/client/profile")}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-sm font-semibold text-white"
            aria-label="Open profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.textContent = initial;
                  }
                }}
              />
            ) : (
              initial
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />

          <div className="fixed left-0 top-0 z-[60] h-full w-[85%] max-w-xs bg-white shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">Client Menu</p>
                <p className="text-xs text-gray-500">Quick access</p>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Close client navigation"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <Link
                to="/client/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </Link>

              <Link
                to="/client/profile"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </Link>

              <Link
                to="/client/bookings"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Booking History
              </Link>

              <Link
                to="/client/messages"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Messages
              </Link>

              <Link
                to="/client/transactions"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Transactions
              </Link>

              <Link
                to="/client/leaderboard"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Leaderboard
              </Link>

              <Link
                to="/provider"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-xl bg-brand-100 px-4 py-3 text-sm font-medium text-brand-700"
              >
                Become a Tasker
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}