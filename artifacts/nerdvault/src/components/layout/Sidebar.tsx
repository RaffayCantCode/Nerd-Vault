import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, Library, Compass, Users, Folder, Plus, Settings2 } from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "../common/Avatar";
import { useAuth } from "../../context/AuthContext";
import { api, Shelf } from "../../lib/api";

export const navItems = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/vault", label: "My Vault", icon: Library },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/friends", label: "Friends", icon: Users },
];

export function Sidebar({ onCreateShelf }: { onCreateShelf: () => void }) {
  const [location] = useLocation();
  const { user, openAuthModal } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);

  useEffect(() => {
    api.getShelves()
      .then((res) => {
        if (res?.shelves) setShelves(res.shelves);
      })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "NV";

  return (
    <aside className="nv-sidebar fixed inset-y-0 left-0 z-20 hidden w-[200px] flex-col px-3.5 py-5 lg:flex">
      <Logo />
      <div className="mt-12 flex flex-1 flex-col">
        <p className="mb-3 px-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-slate-600">
          Your space
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`link-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? "bg-[rgba(55,218,178,.11)] text-[hsl(var(--primary))]"
                    : "text-slate-500 hover:bg-white/[.04] hover:text-slate-200"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="mb-3 mt-10 px-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-slate-600">
          Collections
        </p>
        <div className="space-y-1">
          {shelves.map((shelf) => (
            <Link
              key={shelf.id}
              href={`/vault?folder=${shelf.slug}`}
              data-testid={`link-folder-${shelf.slug}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-400 transition hover:bg-white/[.04] hover:text-slate-200"
            >
              <Folder size={17} />
              <span className="truncate">{shelf.name}</span>
              <span className="ml-auto text-[11px] text-slate-600">
                {String(shelf.itemCount).padStart(2, "0")}
              </span>
            </Link>
          ))}
          <button
            onClick={onCreateShelf}
            data-testid="button-create-collection"
            className="nv-button flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-500 hover:bg-white/[.04] hover:text-slate-300"
          >
            <Plus size={17} />
            New collection
          </button>
        </div>
      </div>

      <div className="border-t border-white/[.07] pt-5">
        {user ? (
          <Link
            href="/profile"
            data-testid="link-profile-sidebar"
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[.04]"
          >
            <Avatar initials={initials} tone="teal" image={user?.image} />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-slate-200">{user.name}</p>
              <p className="text-[11px] text-slate-500">View Vault Profile</p>
            </div>
            <Settings2 size={15} className="ml-auto text-slate-600" />
          </Link>
        ) : (
          <button
            onClick={openAuthModal}
            data-testid="button-signin-sidebar"
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[.04]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/10 text-amber-400 font-bold text-[12px]">
              G
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-slate-200">Guest mode</p>
              <p className="text-[11px] text-[hsl(var(--primary))] font-semibold">Sign in / Register</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
