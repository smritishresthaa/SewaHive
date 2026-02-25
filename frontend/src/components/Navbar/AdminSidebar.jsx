import { Link, useLocation } from "react-router-dom";

export default function AdminSidebar() {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `block px-4 py-2 rounded-lg ${
      pathname === path
        ? "bg-brand-100 text-brand-700 font-semibold"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 h-screen p-6 border-r bg-white hidden md:block">
      <div className="text-lg font-bold mb-6">Admin Panel</div>

      <nav className="space-y-2">
        <Link to="/admin" className={linkClass("/admin")}>
          Dashboard
        </Link>

        <Link to="/admin/providers" className={linkClass("/admin/providers")}>
          Provider Management
        </Link>

        <Link to="/admin/disputes" className={linkClass("/admin/disputes")}>
          Disputes
        </Link>

        <Link to="/admin/leaderboard" className={linkClass("/admin/leaderboard")}>
          Leaderboard
        </Link>
      </nav>
    </aside>
  );
}
