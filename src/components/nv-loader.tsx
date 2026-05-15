"use client";

import { memo } from "react";
import Image from "next/image";

type NVLoaderProps = {
  label?: string;
  compact?: boolean;
};

export const NVLoader = memo(function NVLoader({
  label = "Loading your vault...",
  compact = false,
}: NVLoaderProps) {
  return (
    <div className={`nv-loader ${compact ? "is-compact" : ""}`} role="status" aria-live="polite">
      <div className="nv-loader-mark" aria-hidden="true">
        <span className="nv-loader-ring nv-loader-ring-outer" />
        <span className="nv-loader-ring nv-loader-ring-inner" />
        <Image src="/brand/logo-mark-clean.svg" alt="" width={48} height={48} className="nv-loader-glyph" />
      </div>
      <p className="copy nv-loader-label">{label}</p>
    </div>
  );
});
