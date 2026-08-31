import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
  onPrev,
  onNext,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="mb-4 sm:mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))] font-bold">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display mt-1 text-[21px] font-semibold tracking-[-.04em] text-slate-100 sm:text-[23px]">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {onPrev && onNext ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              aria-label={`Scroll left in ${title}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[.12] bg-[#12181d]/80 text-slate-400 hover:text-white hover:border-[hsl(var(--primary))]/50 hover:bg-white/[.08] active:scale-95 transition shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onNext}
              aria-label={`Scroll right in ${title}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[.12] bg-[#12181d]/80 text-slate-400 hover:text-white hover:border-[hsl(var(--primary))]/50 hover:bg-white/[.08] active:scale-95 transition shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : action ? (
          <button
            onClick={onAction}
            data-testid={`button-section-${title.toLowerCase().replaceAll(" ", "-")}`}
            className="nv-button flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[hsl(var(--primary))]"
          >
            {action}
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
