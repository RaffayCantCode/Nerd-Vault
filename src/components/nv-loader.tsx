"use client";

type NVLoaderProps = {
  label?: string;
  compact?: boolean;
};

export function NVLoader({
  label = "Loading your vault...",
  compact = false,
}: NVLoaderProps) {
  return (
    <div className={`nv-loader ${compact ? "is-compact" : ""}`} role="status" aria-live="polite">
      <div className="nv-loader-mark" aria-hidden="true">
        <span className="nv-loader-ring nv-loader-ring-outer" />
        <span className="nv-loader-ring nv-loader-ring-inner" />
        <span className="nv-loader-glyph">NV</span>
      </div>
      <p className="copy nv-loader-label">{label}</p>
    </div>
  );
}
