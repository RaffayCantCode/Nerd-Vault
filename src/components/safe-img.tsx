"use client";

import { useState } from "react";

type SafeImgProps = {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  style?: React.CSSProperties;
};

export function SafeImg({ src, alt, className, fallback, loading, decoding, fetchPriority, style }: SafeImgProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      style={style}
      onError={() => {
        if (fallback && imgSrc !== fallback) {
          setImgSrc(fallback);
        } else {
          setHidden(true);
        }
      }}
    />
  );
}
