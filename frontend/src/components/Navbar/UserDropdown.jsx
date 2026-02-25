// src/components/Navbar/UserDropdown.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  HiUser,
  HiChatBubbleLeftRight,
  HiClipboardDocumentList,
  HiCog,
  HiQuestionMarkCircle,
} from "react-icons/hi2";

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      {/* HAMBURGER BUTTON */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:shadow transition"
        aria-label="Menu"
      >
        <div className="space-y-[3px]">
          <span className="block w-4 h-[2px] bg-gray-800" />
          <span className="block w-4 h-[2px] bg-gray-800" />
          <span className="block w-4 h-[2px] bg-gray-800" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-50">
          {/* USER INFO */}
          <div className="px-3 py-2">
            <p className="font-semibold text-gray-900 text-sm capitalize">
              {user.profile?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <hr className="my-2" />

          {/* MAIN LINKS */}
          <DropdownLink to="/profile" icon={<HiUser />}>Profile</DropdownLink>
          <DropdownLink to="/client/messages" icon={<HiChatBubbleLeftRight />}>
            Messages
          </DropdownLink>
          <DropdownLink to="/client/bookings" icon={<HiClipboardDocumentList />}>
            Bookings
          </DropdownLink>

          <hr className="my-2" />

          {/* SETTINGS */}
          <DropdownLink to="/client/settings" icon={<HiCog />}>
            Account Settings
          </DropdownLink>
          <DropdownLink to="/help" icon={<HiQuestionMarkCircle />}>
            Help Center
          </DropdownLink>

          <hr className="my-2" />

          {/* LOGOUT */}
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function DropdownLink({ to, icon, children }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-800 hover:bg-gray-100 transition"
    >
      <span className="text-lg text-gray-600">{icon}</span>
      <span className="text-sm">{children}</span>
    </Link>
  );
}
