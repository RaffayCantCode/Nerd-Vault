"use client";

import { useEffect, useState } from "react";
import { getMediaFallbackImage } from "@/lib/media-fallbacks";
import { MediaItem } from "@/lib/types";

type ResilientMediaImageProps = {
  item: Pick<MediaItem, "type" | "coverUrl" | "backdropUrl" | "title">;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  fetchPriority?: "high" | "low" | "auto";
};

export function ResilientMediaImage({
  item,
  className,
  alt,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
}: ResilientMediaImageProps) {
  const fallback = getMediaFallbackImage(item);
  const [src, setSrc] = useState(item.coverUrl || item.backdropUrl || fallback);

  useEffect(() => {
    setSrc(item.coverUrl || item.backdropUrl || fallback);
  }, [fallback, item.backdropUrl, item.coverUrl]);

  return (
    <img
      className={className}
      src={src}
      alt={alt ?? item.title}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={false}
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), #0b1018" }}
      onError={() => {
        if (src !== item.backdropUrl && item.backdropUrl) {
          setSrc(item.backdropUrl);
          return;
        }

        if (src !== fallback) {
          setSrc(fallback);
        }
      }}
    />
  );
}
