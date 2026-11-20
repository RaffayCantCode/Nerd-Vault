import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Check,
  Eye,
  CheckCircle2,
  Bookmark,
  PauseCircle,
  XCircle,
} from "lucide-react";

export type VaultStatusOption = "Watching" | "Completed" | "Wishlist" | "Paused" | "Dropped";

interface StatusMeta {
  value: VaultStatusOption;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  dotClass: string;
  activeText: string;
  activeBg: string;
  iconColor: string;
}

const STATUS_OPTIONS: StatusMeta[] = [
  {
    value: "Watching",
    label: "Watching",
    description: "Currently in progress",
    icon: Eye,
    dotClass: "bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary))]",
    activeText: "text-[hsl(var(--primary))]",
    activeBg: "bg-[rgba(55,218,178,.14)] border-[rgba(55,218,178,.32)]",
    iconColor: "text-[hsl(var(--primary))]",
  },
  {
    value: "Completed",
    label: "Completed",
    description: "Finished & logged",
    icon: CheckCircle2,
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
    activeText: "text-emerald-300",
    activeBg: "bg-emerald-500/15 border-emerald-400/35",
    iconColor: "text-emerald-400",
  },
  {
    value: "Wishlist",
    label: "Wishlist",
    description: "Saved for later",
    icon: Bookmark,
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]",
    activeText: "text-sky-300",
    activeBg: "bg-sky-500/15 border-sky-400/35",
    iconColor: "text-sky-400",
  },
  {
    value: "Paused",
    label: "Paused",
    description: "On hold for now",
    icon: PauseCircle,
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]",
    activeText: "text-amber-300",
    activeBg: "bg-amber-500/15 border-amber-400/35",
    iconColor: "text-amber-400",
  },
  {
    value: "Dropped",
    label: "Dropped",
    description: "Not continuing",
    icon: XCircle,
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.65)]",
    activeText: "text-rose-300",
    activeBg: "bg-rose-500/15 border-rose-400/35",
    iconColor: "text-rose-400",
  },
];

export function StatusDropdown({
  value,
  onChange,
  mediaType,
}: {
  value: string;
  onChange: (newStatus: string) => void;
  mediaType?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const normalizedValue = value === "Favorite" ? "Completed" : value;
  const activeMeta = STATUS_OPTIONS.find((s) => s.value === normalizedValue) || STATUS_OPTIONS[2];
  const ActiveIcon = activeMeta.icon;

  const getLabel = (opt: StatusMeta) => {
    if (opt.value === "Watching" && mediaType === "Game") return "Playing";
    return opt.label;
  };

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 224)),
      width: Math.max(rect.width, 210),
      openUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="select-detail-status"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`nv-button flex h-[44px] sm:h-[46px] min-w-[144px] items-center justify-between gap-2.5 rounded-full border px-4 text-xs sm:text-sm font-bold backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.4)] ${
          open
            ? "border-[hsl(var(--primary))]/70 bg-[#101920]/95 text-white shadow-[0_0_24px_rgba(55,218,178,0.22)]"
            : "border-white/[.18] bg-[#0c1217]/80 text-white hover:bg-[#131d24]/90 hover:border-white/[.3]"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${activeMeta.dotClass}`} />
          <ActiveIcon size={15} className={activeMeta.iconColor} />
          <span>{getLabel(activeMeta)}</span>
        </span>
        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-[hsl(var(--primary))]" : ""
          }`}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUp ? "translateY(-100%)" : undefined,
            }}
            className="z-[9999] rounded-2xl border border-white/[.14] bg-[#0b1116]/95 p-1.5 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.08)] animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-mono-ui font-semibold uppercase tracking-widest text-slate-500">
              Vault Status
            </div>
            <div className="space-y-0.5">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = opt.value === activeMeta.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`group flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${opt.activeBg} ${opt.activeText}`
                        : "border-transparent text-slate-300 hover:bg-white/[.07] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          isSelected
                            ? "border-white/[.14] bg-black/40"
                            : "border-white/[.07] bg-white/[.04] group-hover:bg-white/[.08]"
                        }`}
                      >
                        <Icon size={14} className={opt.iconColor} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold leading-tight truncate">
                          {getLabel(opt)}
                        </span>
                        <span className="text-[10.5px] text-slate-400 leading-tight truncate">
                          {opt.description}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0" strokeWidth={2.6} />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
