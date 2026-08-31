import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, ChevronRight, User as UserIcon, LogOut, LogIn, Check, X, UserPlus, Clock } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "../common/Avatar";
import { navItems } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";
import { api } from "../../lib/api";

export function Topbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const userDropdownRef = useRef<HTMLDivElement | null>(null);
  const notifDropdownRef = useRef<HTMLDivElement | null>(null);

  const { user, logout, openAuthModal } = useAuth();
  const { notify } = useVault();

  const fetchNotifications = () => {
    if (!user) return;
    api.getNotifications()
      .then((res) => {
        if (res?.notifications) setNotifications(res.notifications);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRespondRequest = async (fromUserId: string, action: "accept" | "decline") => {
    try {
      await api.respondFriendRequest(fromUserId, action);
      notify(action === "accept" ? "Friend request accepted!" : "Friend request declined.");
      fetchNotifications();
    } catch {
      notify("Failed to process request.");
    }
  };

  const handleRemoveNotification = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    try {
      await api.markNotificationsRead(notificationId);
    } catch {}
    notify("Notification removed");
  };

  const handleMarkAllRead = async () => {
    setNotifications([]);
    try {
      await api.markNotificationsRead();
    } catch {}
    notify("All notifications cleared");
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const title =
    location === "/"
      ? user ? `Good evening, ${user.name?.split(" ")[0]}` : "Welcome to NerdVault"
      : location.startsWith("/vault")
      ? "My Vault"
      : location.startsWith("/discover")
      ? "Discover"
      : location.startsWith("/friends")
      ? "Friends"
      : location.startsWith("/profile")
      ? "Profile"
      : "Media detail";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "G";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="relative z-40 flex h-[76px] items-center justify-between gap-4 border-b border-white/[.06] px-5 sm:px-8 lg:px-10">
      <div className="relative flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="button-mobile-menu"
          className="nv-button rounded-lg p-2 text-slate-400 hover:bg-white/[.06]"
        >
          <Menu size={19} />
        </button>
        <Logo />
        {menuOpen && (
          <div className="glass absolute left-0 top-12 z-50 w-52 rounded-2xl border border-white/[.1] p-2 shadow-2xl bg-[#11171c]">
            <p className="px-3 pb-2 pt-1 font-mono-ui text-[9px] uppercase tracking-[.18em] text-slate-600">
              Navigate
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                data-testid={`link-menu-${item.label.toLowerCase().replace(" ", "-")}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-400 hover:bg-white/[.06] hover:text-[hsl(var(--primary))]"
              >
                <item.icon size={16} />
                {item.label}
                <ChevronRight size={13} className="ml-auto text-slate-700" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <p className="font-mono-ui text-[10px] uppercase tracking-[.19em] text-slate-600">
          {today}
        </p>
        <h1 className="font-display mt-0.5 text-[19px] font-semibold tracking-[-.03em] text-slate-100">
          {title}
        </h1>
      </div>

      <div className="relative ml-auto flex items-center gap-3">
        {/* Notifications Bell */}
        <div ref={notifDropdownRef} className="relative">
          <button
            onClick={() => {
              if (!user) {
                openAuthModal();
                return;
              }
              setNotifDropdownOpen(!notifDropdownOpen);
              fetchNotifications();
            }}
            data-testid="button-notifications"
            className="nv-button relative rounded-xl border border-white/[.08] p-2.5 text-slate-400 hover:bg-white/[.06] hover:text-slate-100"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--primary))] ring-2 ring-[#0c1216] shadow-[0_0_8px_hsl(var(--primary))]" />
            )}
          </button>

          {/* Notifications Popover */}
          {notifDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2.5 w-80 sm:w-96 rounded-2xl border border-white/[.15] bg-[#0d1317] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.98)] animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between border-b border-white/[.08] pb-2.5 px-2">
                <span className="font-mono-ui text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-[360px] overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`group/notif relative rounded-xl p-3 border transition ${
                        n.status === "unread"
                          ? "bg-[rgba(55,218,178,.06)] border-[rgba(55,218,178,.25)]"
                          : "bg-white/[.02] border-white/[.06]"
                      }`}
                    >
                      {/* One-click remove cross */}
                      <button
                        onClick={(e) => handleRemoveNotification(n.id, e)}
                        title="Remove notification"
                        className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 text-slate-400 opacity-70 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-300 transition"
                      >
                        <X size={13} />
                      </button>

                      <div className="flex items-start gap-3 pr-6">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] shrink-0 text-[11px] font-bold">
                          {n.type === "friend_request" ? <UserPlus size={15} /> : <Clock size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-slate-200 leading-snug">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
                          </span>

                          {/* Friend Request Action Buttons */}
                          {n.type === "friend_request" && n.status === "unread" && n.fromUserId && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                onClick={() => handleRespondRequest(n.fromUserId, "accept")}
                                className="nv-button flex items-center gap-1 rounded-lg bg-[hsl(var(--primary))] px-3 py-1 text-[11px] font-extrabold text-[#08211c] hover:bg-[#73e4c7]"
                              >
                                <Check size={12} /> Accept
                              </button>
                              <button
                                onClick={() => handleRespondRequest(n.fromUserId, "decline")}
                                className="nv-button flex items-center gap-1 rounded-lg border border-white/[.1] bg-white/[.04] px-3 py-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                              >
                                <X size={12} /> Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 text-[12px]">
                    <Bell size={22} className="text-slate-600 mb-2 opacity-50" />
                    <span>No notifications right now</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile / Guest Dropdown */}
        <div ref={userDropdownRef} className="relative">
          {user ? (
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              data-testid="button-user-profile-menu"
              className="flex items-center gap-2 rounded-xl transition hover:opacity-85"
            >
              <Avatar initials={initials} tone="green" image={user.image} />
            </button>
          ) : (
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              data-testid="button-guest-menu"
              className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.12] bg-white/[.04] px-3.5 py-2 text-[12px] font-bold text-slate-300 hover:bg-white/[.08]"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Guest mode</span>
            </button>
          )}

          {/* User / Guest Popover Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2.5 w-56 rounded-2xl border border-white/[.15] bg-[#0d1317] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.98)] animate-in fade-in-0 zoom-in-95">
              {user ? (
                <>
                  <div className="border-b border-white/[.08] px-3.5 py-2.5">
                    <p className="truncate text-[13px] font-bold text-white">{user.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-300 hover:bg-white/[.08] hover:text-white"
                    >
                      <UserIcon size={15} className="text-[hsl(var(--primary))]" />
                      <span>Open profile page</span>
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        notify("You have logged out.");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut size={15} />
                      <span>Log out</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-2 space-y-2">
                  <div className="px-1 py-1">
                    <p className="text-[12px] font-bold text-slate-200">Browsing as Guest</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Sign in to save your personal collection and reviews.</p>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      openAuthModal();
                    }}
                    className="nv-button flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-2.5 text-[12px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
                  >
                    <LogIn size={15} />
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
