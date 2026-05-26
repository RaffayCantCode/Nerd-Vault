"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaFallbackImage } from "@/lib/media-fallbacks";
import {
  buildMediaImageSrcSet,
  chooseConnectionAwareIntent,
  MediaImageIntent,
  optimizeMediaImageUrl,
} from "@/lib/media-image";
import { MediaItem } from "@/lib/types";

const warmedImageUrls = new Set<string>();

type ResilientMediaImageProps = {
  item: Pick<MediaItem, "type" | "coverUrl" | "backdropUrl" | "title">;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  displayIntent?: MediaImageIntent;
  upgradeIntent?: MediaImageIntent;
  onLoadStateChange?: (loaded: boolean) => void;
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

function warmImageUrl(url?: string) {
  if (!url || warmedImageUrls.has(url)) return;
  warmedImageUrls.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function ResilientMediaImage({
  item,
  className,
  alt,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  displayIntent = "thumb",
  upgradeIntent = "cover",
  onLoadStateChange,
}: ResilientMediaImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [retryProxy, setRetryProxy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRef = useRef<{ saveData?: boolean; effectiveType?: string } | null>(null);

  if (typeof navigator !== "undefined" && connectionRef.current === null) {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    connectionRef.current = { saveData: connection?.saveData, effectiveType: connection?.effectiveType };
  }

  const connectionInfo = connectionRef.current ?? undefined;
  const resolvedDisplayIntent = chooseConnectionAwareIntent(displayIntent, connectionInfo);
  const resolvedUpgradeIntent = chooseConnectionAwareIntent(upgradeIntent, connectionInfo);

  const rawFallback = getMediaFallbackImage(item);
  const rawPrimaryCover = retryProxy ? proxiedImage(item.coverUrl) ?? item.coverUrl : item.coverUrl;
  const rawSecondaryBackdrop = retryProxy ? proxiedImage(item.backdropUrl) ?? item.backdropUrl : item.backdropUrl;

  const fallback = optimizeMediaImageUrl(rawFallback, "cover");
  const previewSrc =
    optimizeMediaImageUrl(rawPrimaryCover, resolvedDisplayIntent) ||
    optimizeMediaImageUrl(rawSecondaryBackdrop, "thumb") ||
    fallback;
  const upgradeSrc =
    optimizeMediaImageUrl(rawPrimaryCover, resolvedUpgradeIntent) ||
    optimizeMediaImageUrl(rawSecondaryBackdrop, resolvedUpgradeIntent) ||
    fallback;
  const secondaryBackdrop = optimizeMediaImageUrl(rawSecondaryBackdrop, resolvedUpgradeIntent);
  const shouldProgress = Boolean(previewSrc && upgradeSrc && previewSrc !== upgradeSrc);

  const [src, setSrc] = useState(shouldProgress ? previewSrc : upgradeSrc);
  const srcSet = buildMediaImageSrcSet(rawPrimaryCover || rawSecondaryBackdrop, resolvedUpgradeIntent);

  useEffect(() => {
    const nextPreview = shouldProgress ? previewSrc : upgradeSrc;
    setLoaded(false);
    setIsUpgraded(!shouldProgress);
    onLoadStateChange?.(false);
    setRetryProxy(false);
    setSrc(nextPreview);

    if (shouldProgress) warmImageUrl(upgradeSrc);
    if (loading === "eager" || fetchPriority === "high") {
      warmImageUrl(upgradeSrc);
      warmImageUrl(previewSrc);
    }
  }, [item.coverUrl, item.backdropUrl, onLoadStateChange, previewSrc, shouldProgress, upgradeSrc, loading, fetchPriority]);

  useEffect(() => {
    if (!shouldProgress || !upgradeSrc) return;
    let cancelled = false;
    const fullImage = new Image();
    fullImage.decoding = "async";
    fullImage.onload = () => {
      if (!cancelled) { setSrc(upgradeSrc); setIsUpgraded(true); }
    };
    fullImage.src = upgradeSrc;
    return () => { cancelled = true; };
  }, [shouldProgress, upgradeSrc]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
      onLoadStateChange?.(true);
      return;
    }
    if (timeoutRef.current) return;
    timeoutRef.current = setTimeout(() => {
      setLoaded(true);
      onLoadStateChange?.(true);
    }, 10_000);
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
  }, [onLoadStateChange, src]);

  const combinedClass = [
    className,
    "img-loaded-wrapper",
    loaded ? "img-loaded" : "img-loading",
    loading === "eager" ? "img-eager" : "img-lazy",
    isUpgraded ? "img-upgraded" : "img-preview",
  ].filter(Boolean).join(" ");

  return (
    <img
      ref={imgRef}
      className={combinedClass}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? "(max-width: 720px) 42vw, 220px" : undefined}
      alt={alt ?? item.title}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={false}
      onLoad={() => { setLoaded(true); onLoadStateChange?.(true); }}
      onError={() => {
        if (!retryProxy && (item.coverUrl || item.backdropUrl)) {
          setRetryProxy(true);
          return;
        }
        if (src !== secondaryBackdrop && secondaryBackdrop) {
          setSrc(secondaryBackdrop);
          return;
        }
        if (src !== fallback && fallback) {
          setSrc(fallback);
          return;
        }
        setLoaded(true);
        onLoadStateChange?.(true);
      }}
    />
  );
}
