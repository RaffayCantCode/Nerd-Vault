import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bell, Menu, ChevronRight, User as UserIcon, LogOut, LogIn, Check, X, UserPlus, Clock, Sparkles } from "lucide-react";
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

  const isHome = location === "/";

  const fetchNotifications = () => {
    if (!user) return;
    api.getNotifications()
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => console.error("Failed to load notifications:", err));
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
    return undefined;
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    setNotifications([]);
    setNotifDropdownOpen(false);
    try {
      await api.markNotificationsRead();
      notify("Notifications cleared");
    } catch {
      fetchNotifications();
    }
  };

  const handleRemoveNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.markNotificationsRead(id);
    } catch {
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const titleMap: Record<string, string> = {
    "/": "Welcome to NerdVault",
    "/vault": "Your Personal Vault",
    "/discover": "Explore Titles",
    "/friends": "Social & Friends",
    "/shelves": "Custom Shelves",
    "/settings": "Account Settings",
    "/profile": "Your Profile",
  };

  const title = titleMap[location] || (location.startsWith("/media/") ? "Title Overview" : "NerdVault");

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "G";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header
      className={`relative z-40 flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10 transition-all duration-300 ${
        isHome
          ? "border-b-0 bg-transparent"
          : "border-b border-white/[.08] bg-[#0c1216]/80 backdrop-blur-md"
      }`}
    >
      {/* Mobile Menu Icon & Logo */}
      <div className="relative flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="button-mobile-menu"
          className="nv-button rounded-xl p-2 text-slate-400 hover:bg-white/[.08]"
        >
          <Menu size={19} />
        </button>
        <Logo />
        {menuOpen && (
          <div className="glass absolute left-0 top-12 z-50 w-52 rounded-2xl border border-white/[.15] p-2 shadow-2xl bg-[#11171c]">
            <p className="px-3 pb-2 pt-1 font-mono-ui text-[9px] uppercase tracking-[.18em] text-slate-500">
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

      {/* Desktop Header Title & Date */}
      <div className="hidden lg:flex items-center gap-4">
        <div className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          <p className="font-mono-ui text-[10px] uppercase tracking-[.19em] text-slate-400">
            {today}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="font-display mt-0.5 text-[19px] font-extrabold tracking-[-.03em] text-white">
              {title}
            </h1>
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-mono-ui font-semibold text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 shadow-md backdrop-blur-xl">
              <Sparkles size={11} className="text-[hsl(var(--primary))]" /> This is a tracking & logging website — save your stuff!
            </span>
          </div>
        </div>
      </div>

      {/* Floating Standout Action Pill Container (Matches Modern Streaming Reference) */}
      <div className="relative ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/[.15] bg-black/50 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
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
              className="nv-button relative rounded-xl p-2 text-slate-300 hover:bg-white/[.12] hover:text-white transition"
              aria-label="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[hsl(var(--primary))] ring-2 ring-[#0c1216] shadow-[0_0_8px_hsl(var(--primary))]" />
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
                        className="group relative flex items-start gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 hover:bg-white/[.05] transition"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20">
                          {n.type === "FRIEND_REQUEST" ? <UserPlus size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <p className="text-[12px] font-bold text-slate-200">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{n.body}</p>
                        </div>
                        <button
                          onClick={(e) => handleRemoveNotification(n.id, e)}
                          title="Remove notification"
                          className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[.08] transition"
                        >
                          <X size={13} />
                        </button>
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

          <div className="h-4 w-[1px] bg-white/[.15]" />

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
                className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.15] bg-white/[.06] px-3.5 py-1.5 text-[12px] font-bold text-slate-200 hover:bg-white/[.12] transition"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
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
      </div>
    </header>
  );
}
