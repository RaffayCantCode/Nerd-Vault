"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canonicalGalleryImageKey, dedupeGalleryImageUrls } from "@/lib/gallery-image-key";
import { optimizeMediaImageUrl } from "@/lib/media-image";

export function DetailGallery({
  title,
  images,
}: {
  title: string;
  images: string[];
}) {
  const galleryImages = useMemo(() => {
    const uniqueRaw = dedupeGalleryImageUrls(images.filter(Boolean));
    return uniqueRaw.map((raw) => ({
      key: canonicalGalleryImageKey(raw),
      raw,
      src: optimizeMediaImageUrl(raw, "gallery") ?? raw,
    }));
  }, [images]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [deckTop, setDeckTop] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShuffledIndices(galleryImages.map((_, i) => i));
  }, [galleryImages.length]);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % galleryImages.length;
    });
  }, [galleryImages.length]);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages.length]);

  const shuffleToNext = useCallback(() => {
    if (isShuffling || galleryImages.length <= 1) return;
    setIsShuffling(true);

    setDeckTop((prev) => prev + 1);
    setShuffledIndices((prev) => {
      const arr = [...prev];
      const first = arr.shift()!;
      arr.push(first);
      return arr;
    });

    setTimeout(() => setIsShuffling(false), 450);
  }, [isShuffling, galleryImages.length]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      else if (event.key === 'ArrowRight') showNext();
      else if (event.key === 'ArrowLeft') showPrevious();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', handleKeyDown); };
  }, [activeIndex, showNext, showPrevious, closeLightbox]);

  useEffect(() => {
    if (activeIndex !== null) return;
    setTouchStartX(null);
    setTouchEndX(null);
  }, [activeIndex]);

  if (!galleryImages.length) return null;

  const openSlide = activeIndex === null ? null : galleryImages[activeIndex];
  const visibleCount = Math.min(5, galleryImages.length);
  const stackImages = shuffledIndices.slice(0, visibleCount);

  return (
    <>
      <div className="nv-deck-shell glass" ref={containerRef}>
        <div className="nv-deck-info">
          <p className="eyebrow">Gallery</p>
          <h3 className="headline nv-deck-title">{title}</h3>
          <p className="copy nv-deck-hint">
            Click the stack to shuffle through {galleryImages.length} stills.
          </p>
        </div>

        <div className="nv-deck-stage">
          <div className="nv-deck-stack" onMouseLeave={() => {}}>
            {[...stackImages].reverse().map((imgIdx, visPos) => {
              const realIdx = visibleCount - 1 - visPos;
              const img = galleryImages[imgIdx];
              const isTop = realIdx === 0;

              let translateX = 0;
              let translateY = 0;
              let rotate = 0;
              let scale = 1 - (realIdx * 0.04);

              if (!isTop) {
                const shiftStep = 14;
                if (realIdx % 2 === 1) {
                  translateX = -(realIdx * shiftStep);
                  translateY = realIdx * 3;
                  rotate = -(realIdx * 2.5);
                } else {
                  translateX = realIdx * shiftStep;
                  translateY = realIdx * 3;
                  rotate = realIdx * 2.5;
                }
              } else {
                translateY = 0;
              }

              return (
                <button
                  key={`${img.key}-${deckTop + visPos}-${imgIdx}`}
                  type="button"
                  className={`nv-deck-card ${isTop ? 'is-top' : ''} ${isShuffling && isTop ? 'is-shuffling' : ''}`}
                  style={{
                    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
                    zIndex: visibleCount - realIdx,
                  }}
                  onClick={() => {
                    if (isTop) {
                      setActiveIndex(imgIdx);
                    } else {
                      shuffleToNext();
                    }
                  }}
                  aria-label={isTop ? `Open ${title} image` : `Shuffle to next`}
                >
                  <img
                    src={img.src}
                    alt={`${title} still ${imgIdx + 1}`}
                    loading={visPos === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              );
            })}
          </div>

          {galleryImages.length > 1 && (
            <button
              type="button"
              className="nv-deck-shuffle-btn"
              onClick={shuffleToNext}
              disabled={isShuffling}
              aria-label="Shuffle to next image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              <span>Shuffle</span>
            </button>
          )}
        </div>
      </div>

      {openSlide && isMounted
        ? createPortal(
            <div className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`${title} gallery`} onClick={closeLightbox}>
              {galleryImages.length > 1 && (
                <>
                  <button type="button" className="detail-lightbox-nav is-left" aria-label="Previous"
                    onClick={(e) => { e.stopPropagation(); showPrevious(); }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button type="button" className="detail-lightbox-nav is-right" aria-label="Next"
                    onClick={(e) => { e.stopPropagation(); showNext(); }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              )}

              <div className="detail-lightbox-stage"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => { setTouchStartX(e.changedTouches[0]?.clientX ?? null); setTouchEndX(null); }}
                onTouchMove={(e) => { setTouchEndX(e.changedTouches[0]?.clientX ?? null); }}
                onTouchEnd={() => {
                  if (touchStartX == null || touchEndX == null || galleryImages.length <= 1) return;
                  const delta = touchStartX - touchEndX;
                  if (Math.abs(delta) < 42) return;
                  delta > 0 ? showNext() : showPrevious();
                }}
              >
                <div className="detail-lightbox-topbar">
                  <div className="detail-lightbox-heading">
                    <span className="detail-lightbox-kicker">Gallery</span>
                    <strong>{title}</strong>
                  </div>
                  <button type="button" className="detail-lightbox-close" aria-label="Close"
                    onClick={(e) => { e.stopPropagation(); closeLightbox(); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <img
                  src={optimizeMediaImageUrl(openSlide.raw, "lightbox") ?? openSlide.src}
                  alt={`${title} still ${(activeIndex ?? 0) + 1}`}
                  loading="eager"
                  decoding="async"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="detail-lightbox-meta">
                  <span>{(activeIndex ?? 0) + 1}</span>
                  <span>/</span>
                  <span>{galleryImages.length}</span>
                </div>
                {galleryImages.length > 1 && (
                  <div className="detail-lightbox-strip">
                    {galleryImages.map((slide, index) => (
                      <button key={`t-${slide.key}-${index}`} type="button"
                        className={`detail-lightbox-thumb ${index === activeIndex ? 'is-active' : ''}`}
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Show ${title} still ${index + 1}`}>
                        <img src={optimizeMediaImageUrl(slide.raw, "thumb") ?? slide.src}
                          alt={`${title} thumbnail ${index + 1}`} loading="lazy" decoding="async"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
