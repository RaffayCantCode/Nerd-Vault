"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaFallbackImage } from "@/lib/media-fallbacks";
import { chooseConnectionAwareIntent, optimizeMediaImageUrl } from "@/lib/media-image";
import { MediaItem } from "@/lib/types";

const warmedImageUrls = new Set<string>();

type ResilientMediaImageProps = {
  item: Pick<MediaItem, "type" | "coverUrl" | "backdropUrl" | "title">;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  onLoadStateChange?: (loaded: boolean) => void;
  useProxy?: boolean;
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
  onLoadStateChange,
  useProxy = false,
}: ResilientMediaImageProps) {
  const rawFallback = useProxy ? proxiedImage(getMediaFallbackImage(item)) ?? getMediaFallbackImage(item) : getMediaFallbackImage(item);
  const rawPrimaryCover = useProxy ? proxiedImage(item.coverUrl) ?? item.coverUrl : item.coverUrl;
  const rawSecondaryBackdrop = useProxy ? proxiedImage(item.backdropUrl) ?? item.backdropUrl : item.backdropUrl;
  const fallback = optimizeMediaImageUrl(rawFallback, "cover");
  const previewCover = optimizeMediaImageUrl(rawPrimaryCover, "thumb");
  const previewBackdrop = optimizeMediaImageUrl(rawSecondaryBackdrop, "thumb");
  const [src, setSrc] = useState(previewCover || previewBackdrop || fallback);
  const [loaded, setLoaded] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const connectionRef = useRef<{ saveData?: boolean; effectiveType?: string } | null>(null);

  if (typeof navigator !== "undefined" && connectionRef.current === null) {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    connectionRef.current = {
      saveData: connection?.saveData,
      effectiveType: connection?.effectiveType,
    };
  }

  const connectionInfo = connectionRef.current ?? undefined;
  const primaryCover = optimizeMediaImageUrl(rawPrimaryCover, chooseConnectionAwareIntent("cover", connectionInfo));
  const secondaryBackdrop = optimizeMediaImageUrl(rawSecondaryBackdrop, chooseConnectionAwareIntent("backdrop", connectionInfo));
  const upgradeTarget = primaryCover || secondaryBackdrop || fallback;
  const initialTarget = previewCover || previewBackdrop || upgradeTarget;

  useEffect(() => {
    if (loading !== "eager" && fetchPriority !== "high") {
      return;
    }

    const warmTargets = [upgradeTarget].filter(Boolean) as string[];
    warmTargets.forEach((target) => {
      if (warmedImageUrls.has(target)) {
        return;
      }

      warmedImageUrls.add(target);
      const image = new Image();
      image.decoding = "async";
      image.src = target;
    });
  }, [fetchPriority, loading, upgradeTarget]);

  useEffect(() => {
    setLoaded(false);
    setIsUpgraded(initialTarget === upgradeTarget);
    onLoadStateChange?.(false);
    setSrc(initialTarget);
  }, [initialTarget, onLoadStateChange, upgradeTarget]);

  // If the browser already has the image cached, naturalWidth is set immediately
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
      onLoadStateChange?.(true);
    }
  }, [onLoadStateChange, src]);

  useEffect(() => {
    if (!src || src === upgradeTarget || !upgradeTarget) {
      return;
    }

    let cancelled = false;
    const upgrade = () => {
      if (!cancelled) {
        setSrc(upgradeTarget);
        setIsUpgraded(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(upgrade, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = globalThis.setTimeout(upgrade, loading === "eager" ? 0 : 120);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [loading, src, upgradeTarget]);

  const combinedClass = [
    className, 
    "img-loaded-wrapper", 
    loaded ? "img-loaded" : "img-loading",
    loading === "eager" ? "img-eager" : "img-lazy",
    isUpgraded ? "img-upgraded" : "img-preview"
  ].filter(Boolean).join(" ");

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
      style={{ 
        background: "rgba(255, 255, 255, 0.03)",
        willChange: "transform, opacity",
        backfaceVisibility: "hidden"
      }}
      onLoad={() => {
        setLoaded(true);
        onLoadStateChange?.(true);
      }}
      onError={() => {
        if (src !== secondaryBackdrop && secondaryBackdrop) {
          setSrc(secondaryBackdrop);
          return;
        }
        if (src !== fallback) {
          setSrc(fallback);
          return;
        }
        setLoaded(true);
        onLoadStateChange?.(true);
      }}
    />
  );
}
