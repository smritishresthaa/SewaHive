import { useState, useRef, useEffect, useMemo } from "react";
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

  const links = useMemo(() => {
    if (!user) return null;

    const role = user.role || "client";

    if (role === "provider") {
      return {
        profile: "/provider/profile",
        messages: "/provider/messages",
        bookings: "/provider/bookings",
        settings: "/provider/settings",
        help: "/provider/help",
      };
    }

    if (role === "client") {
      return {
        profile: "/client/profile",
        messages: "/client/messages",
        bookings: "/client/bookings",
        settings: "/client/settings",
        help: "/help",
      };
    }

    return {
      profile: "/",
      messages: "/",
      bookings: "/",
      settings: "/",
      help: "/help",
    };
  }, [user]);

  if (!user || !links) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition hover:shadow"
        aria-label="Menu"
      >
        <div className="space-y-[3px]">
          <span className="block h-[2px] w-4 bg-gray-800" />
          <span className="block h-[2px] w-4 bg-gray-800" />
          <span className="block h-[2px] w-4 bg-gray-800" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold capitalize text-gray-900">
              {user.profile?.name || "User"}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>

          <hr className="my-2" />

          <DropdownLink to={links.profile} icon={<HiUser />}>
            Profile
          </DropdownLink>

          <DropdownLink to={links.messages} icon={<HiChatBubbleLeftRight />}>
            Messages
          </DropdownLink>

          <DropdownLink to={links.bookings} icon={<HiClipboardDocumentList />}>
            Bookings
          </DropdownLink>

          <hr className="my-2" />

          <DropdownLink to={links.settings} icon={<HiCog />}>
            Account Settings
          </DropdownLink>

          <DropdownLink to={links.help} icon={<HiQuestionMarkCircle />}>
            Help Center
          </DropdownLink>

          <hr className="my-2" />

          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
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
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-800 transition hover:bg-gray-100"
    >
      <span className="text-lg text-gray-600">{icon}</span>
      <span className="text-sm">{children}</span>
    </Link>
  );
}