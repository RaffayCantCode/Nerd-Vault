"use client";

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
  return (
    <img
      className={className}
      src={item.coverUrl}
      alt={alt ?? item.title}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={false}
      onError={(event) => {
        event.currentTarget.onerror = null;
        if (event.currentTarget.src !== item.backdropUrl && item.backdropUrl) {
          event.currentTarget.src = item.backdropUrl;
          return;
        }
        event.currentTarget.src = getMediaFallbackImage(item);
      }}
    />
  );
}
