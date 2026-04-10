"use client";

import { useEffect, useRef, useState } from "react";
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

function proxiedImage(url?: string) {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return url;
    return `/api/image?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

export function ResilientMediaImage({
  item,
  className,
  alt,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
}: ResilientMediaImageProps) {
  const fallback = proxiedImage(getMediaFallbackImage(item)) ?? getMediaFallbackImage(item);
  const primaryCover = proxiedImage(item.coverUrl) ?? item.coverUrl;
  const secondaryBackdrop = proxiedImage(item.backdropUrl) ?? item.backdropUrl;
  const [src, setSrc] = useState(primaryCover || secondaryBackdrop || fallback);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setSrc(primaryCover || secondaryBackdrop || fallback);
  }, [fallback, primaryCover, secondaryBackdrop]);

  // If the browser already has the image cached, naturalWidth is set immediately
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const combinedClass = [className, "img-loaded-wrapper", loaded ? "img-loaded" : ""].filter(Boolean).join(" ");

  return (
    <img
      ref={imgRef}
      className={combinedClass}
      src={src}
      alt={alt ?? item.title}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={false}
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), #0b1018" }}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (src !== secondaryBackdrop && secondaryBackdrop) {
          setSrc(secondaryBackdrop);
          return;
        }
        if (src !== fallback) {
          setSrc(fallback);
        }
      }}
    />
  );
}
