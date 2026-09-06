import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface Option {
  label: string;
  value: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  minWidth = "140px",
  className = "",
  buttonClassName = "",
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[] | Option[];
  placeholder?: string;
  minWidth?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value) || normalizedOptions[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative z-40 select-none ${className}`} style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`nv-button flex h-10 w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 text-[12px] font-bold transition-all duration-200 ${
          open
            ? "border-[rgba(55,218,178,.6)] bg-[#172027] text-white shadow-[0_0_24px_rgba(55,218,178,.2)]"
            : "border-white/[.12] bg-[#141b20] text-slate-300 hover:border-white/[.22] hover:bg-[#182127]"
        } ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-[hsl(var(--primary))]" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 max-h-72 w-full min-w-[170px] overflow-y-auto rounded-2xl border border-white/[.18] bg-[#0c1216] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.98)] [scrollbar-width:none] animate-in fade-in-0 zoom-in-95">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[12px] font-semibold transition-all ${
                  isSelected
                    ? "bg-[rgba(55,218,178,.18)] text-[hsl(var(--primary))] font-bold"
                    : "text-slate-300 hover:bg-white/[.08] hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-[hsl(var(--primary))]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
