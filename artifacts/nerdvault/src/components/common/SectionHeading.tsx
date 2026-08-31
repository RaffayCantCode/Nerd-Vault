import React from "react";
import { ChevronRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display mt-1 text-[21px] font-semibold tracking-[-.04em] text-slate-100 sm:text-[23px]">
          {title}
        </h2>
      </div>
      {action && (
        <button
          onClick={onAction}
          data-testid={`button-section-${title.toLowerCase().replaceAll(" ", "-")}`}
          className="nv-button flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[hsl(var(--primary))]"
        >
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
