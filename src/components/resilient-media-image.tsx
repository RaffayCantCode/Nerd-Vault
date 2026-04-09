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
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setSrc(item.coverUrl || item.backdropUrl || fallback);
  }, [fallback, item.backdropUrl, item.coverUrl]);

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
