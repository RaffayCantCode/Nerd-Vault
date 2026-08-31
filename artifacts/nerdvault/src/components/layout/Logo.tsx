import React from "react";
import { Link } from "wouter";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const textSize = size === "sm" ? "text-[15px]" : size === "lg" ? "text-[20px]" : "text-[17px]";

  return (
    <Link href="/" className="flex items-center gap-2.5 group" data-testid="link-brand">
      <img
        src="/logo.png"
        alt="NerdVault Logo"
        className={`${iconSize} rounded-xl object-contain drop-shadow-[0_0_12px_rgba(55,218,178,.3)] transition-transform group-hover:scale-105`}
      />
      <span className={`font-display ${textSize} font-bold tracking-[-.04em] text-white`}>
        nerd<span className="text-[hsl(var(--primary))]">vault</span>
      </span>
    </Link>
  );
}
