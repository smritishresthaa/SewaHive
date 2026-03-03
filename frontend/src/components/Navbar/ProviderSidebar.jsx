import { Link, useLocation } from "react-router-dom";

export default function ProviderSidebar() {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `block px-4 py-2 rounded-lg ${
      pathname === path
        ? "bg-emerald-100 text-emerald-700 font-semibold"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 h-screen p-6 border-r bg-white hidden md:block">
      <div className="text-lg font-bold mb-6">Provider Menu</div>

      <nav className="space-y-2">
        <Link to="/provider/dashboard" className={linkClass("/provider/dashboard")}>
          Dashboard
        </Link>

        <Link to="/provider/profile" className={linkClass("/provider/profile")}>
          Profile
        </Link>

        <Link to="/provider/skills" className={linkClass("/provider/skills")}>
          Skill Credibility
        </Link>

        <Link to="/provider/settings" className={linkClass("/provider/settings")}>
          Settings
        </Link>

        <Link to="/provider/emergency" className={linkClass("/provider/emergency")}>
          Emergency Toggle
        </Link>

        <Link to="/provider/verification" className={linkClass("/provider/verification")}>
          Verification Upload
        </Link>

        <Link to="/provider/services" className={linkClass("/provider/services")}>
          My Services
        </Link>

        <Link to="/provider/bookings" className={linkClass("/provider/bookings")}>
          Booking Requests
        </Link>

        <Link to="/provider/messages" className={linkClass("/provider/messages")}>
          Messages
        </Link>

        <Link to="/provider/reviews" className={linkClass("/provider/reviews")}>
          My Reviews
        </Link>

        <Link to="/provider/earnings" className={linkClass("/provider/earnings")}>
          My Earnings
        </Link>

        <Link to="/provider/leaderboard" className={linkClass("/provider/leaderboard")}>
          Leaderboard
        </Link>

        <Link to="/provider/help" className={linkClass("/provider/help")}>
          Help
        </Link>
      </nav>
    </aside>
  );
}
