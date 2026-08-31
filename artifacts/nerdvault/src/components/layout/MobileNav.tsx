import React from "react";
import { Link, useLocation } from "wouter";
import { navItems } from "./Sidebar";

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/[.1] bg-[#10161b]/90 px-2 py-2 shadow-2xl backdrop-blur-xl lg:hidden">
      {navItems.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link
            href={item.href}
            key={item.href}
            data-testid={`link-mobile-${item.label.toLowerCase().replace(" ", "-")}`}
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold ${
              active ? "bg-[rgba(55,218,178,.12)] text-[hsl(var(--primary))]" : "text-slate-600"
            }`}
          >
            <Icon size={17} />
            {item.label === "My Vault" ? "Vault" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
