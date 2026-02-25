import { Link, useLocation } from "react-router-dom";
import { MdDashboard, MdHistory, MdAccountBalanceWallet, MdEmojiEvents } from "react-icons/md";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import { FaUser } from "react-icons/fa";

export default function ClientSidebar() {
  const { pathname } = useLocation();

  function navClass(path) {
    return (
      "flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition " +
      (pathname === path
        ? "bg-brand-700 text-white"
        : "text-gray-700 hover:bg-gray-100")
    );
  }

  return (
    <aside className="w-60 bg-white border-r min-h-screen p-5 hidden md:block pt-10">
      <nav className="space-y-3">

        {/* ✅ PROFILE */}
        <Link to="/client/profile" className={navClass("/client/profile")}>
          <FaUser /> My Profile
        </Link>

        {/* ✅ DASHBOARD */}
        <Link to="/client/dashboard" className={navClass("/client/dashboard")}>
          <MdDashboard /> Dashboard
        </Link>

        {/* ✅ BOOKINGS */}
        <Link to="/client/bookings" className={navClass("/client/bookings")}>
          <MdHistory /> Booking History
        </Link>

        {/* ✅ MESSAGES */}
        <Link to="/client/messages" className={navClass("/client/messages")}>
          <HiChatBubbleLeftRight /> Messages
        </Link>

        {/* ✅ TRANSACTIONS */}
        <Link
          to="/client/transactions"
          className={navClass("/client/transactions")}
        >
          <MdAccountBalanceWallet /> Transactions
        </Link>

        <Link to="/client/leaderboard" className={navClass("/client/leaderboard")}
        >
          <MdEmojiEvents /> Leaderboard
        </Link>

      </nav>
    </aside>
  );
}
