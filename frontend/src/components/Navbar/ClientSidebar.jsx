import { Link, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect, useCallback } from "react";
import { HiBars3, HiXMark } from "react-icons/hi2";
import {
  HiChartBarSquare,
  HiUserCircle,
  HiCalendarDays,
  HiChatBubbleLeftRight,
  HiCreditCard,
  HiTrophy,
} from "react-icons/hi2";
import api from "../../utils/axios";

export default function ClientSidebar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      const res = await api.get("/chat/conversations");
      const conversations = res?.data?.conversations || [];
      const totalUnread = conversations.reduce(
        (sum, conv) => sum + Number(conv?.unreadCount || 0),
        0
      );
      setUnreadMessagesCount(totalUnread);
    } catch (err) {
      console.error("Failed to fetch unread messages count:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessagesCount();

    const interval = setInterval(fetchUnreadMessagesCount, 15000);

    function handleUnreadRefresh() {
      fetchUnreadMessagesCount();
    }

    function handleWindowFocus() {
      fetchUnreadMessagesCount();
    }

    window.addEventListener("chat-unread-updated", handleUnreadRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("chat-unread-updated", handleUnreadRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [fetchUnreadMessagesCount]);

  const navSections = useMemo(
    () => [
      {
        heading: null,
        items: [
          {
            to: "/client/dashboard",
            label: "Dashboard",
            icon: HiChartBarSquare,
          },
        ],
      },
      {
        heading: "Account",
        items: [
          {
            to: "/client/profile",
            label: "My Profile",
            icon: HiUserCircle,
          },
        ],
      },
      {
        heading: "Activity",
        items: [
          {
            to: "/client/bookings",
            label: "Booking History",
            icon: HiCalendarDays,
          },
          {
            to: "/client/messages",
            label: "Messages",
            icon: HiChatBubbleLeftRight,
            badgeCount: unreadMessagesCount,
          },
          {
            to: "/client/transactions",
            label: "Transactions",
            icon: HiCreditCard,
          },
          {
            to: "/client/leaderboard",
            label: "Leaderboard",
            icon: HiTrophy,
          },
        ],
      },
    ],
    [unreadMessagesCount]
  );

  function isActive(path) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function navItemClass(path) {
    return `group flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
      isActive(path)
        ? "border-l-[3px] border-emerald-600 bg-emerald-50 text-emerald-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;
  }

  function iconClass(path) {
    return `h-[18px] w-[18px] flex-shrink-0 ${
      isActive(path)
        ? "text-emerald-600"
        : "text-gray-400 group-hover:text-gray-600"
    }`;
  }

  const renderNavContent = (isMobile = false) => (
    <nav className={isMobile ? "space-y-1 p-4" : "flex-1 px-3 py-4 space-y-1"}>
      {navSections.map((section, si) => (
        <div key={si}>
          {si > 0 && <div className="my-2 h-px bg-gray-100" />}
          {section.heading && (
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {section.heading}
            </p>
          )}

          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const badgeCount = Number(item.badgeCount || 0);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={navItemClass(item.to)}
                  onClick={() => isMobile && setMobileOpen(false)}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className={iconClass(item.to)} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {badgeCount > 0 && (
                    <span
                      className={`ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive(item.to)
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile Header Button */}
      <div className="sticky top-0 z-40 border-b bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Open client menu"
        >
          <HiBars3 className="h-5 w-5" />
          Menu
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-[85%] max-w-xs bg-[#f8fafc] shadow-xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end border-b border-gray-200 bg-white px-5 py-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close client menu"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col overflow-y-auto">
          {renderNavContent(true)}

          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-center text-[10px] text-gray-400">
              SewaHive Client Panel
            </p>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-60 flex-shrink-0 border-r border-gray-200 bg-[#f8fafc] lg:fixed lg:left-0 lg:top-[72px] lg:block xl:w-64">
        <div className="flex h-full flex-col overflow-y-auto">
          {renderNavContent(false)}

          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-center text-[10px] text-gray-400">
              SewaHive Client Panel
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}