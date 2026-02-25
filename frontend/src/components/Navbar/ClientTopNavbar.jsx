// src/components/Navbar/ClientTopNavbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../logos/logo.png";
import UserDropdown from "./UserDropdown";
import NotificationBell from "./NotificationBell";

export default function ClientTopNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const avatarUrl = user?.profile?.avatarUrl;
  const initial =
    user?.profile?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="px-10 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="SewaHive" className="h-7" />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/provider"
            className="bg-brand-100 text-brand-700 px-5 py-2 rounded-full border"
          >
            Become a Tasker
          </Link>

          {/* Notification Bell */}
          <NotificationBell />

          {/* ✅ AVATAR → CLIENT PROFILE */}
          <button
            onClick={() => navigate("/client/profile")}
            className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold overflow-hidden"
            aria-label="Open profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.textContent = initial;
                }}
              />
            ) : (
              initial
            )}
          </button>

          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
