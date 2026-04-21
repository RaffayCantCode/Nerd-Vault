"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
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

  function closeLightbox() {
    setActiveIndex(null);
  }

  function showPrevious() {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  }

  function showNext() {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % galleryImages.length;
    });
  }

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "ArrowRight") {
        showNext();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, galleryImages.length]);

  useEffect(() => {
    if (activeIndex === null) {
      setTouchStartX(null);
      setTouchEndX(null);
      return;
    }

    const activeThumb = document.querySelector<HTMLButtonElement>(".detail-lightbox-thumb.is-active");
    activeThumb?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeIndex]);

  if (!galleryImages.length) {
    return null;
  }

  const openSlide = activeIndex === null ? null : galleryImages[activeIndex];

  return (
    <>
      <div className="detail-gallery-shell glass">
        <div className="detail-gallery-header">
          <div>
            <p className="eyebrow detail-gallery-eyebrow">More stills</p>
            <h3 className="headline detail-gallery-title">Tap in closer</h3>
            <p className="copy detail-gallery-lede">Open any frame for the full view, then move left or right through the gallery.</p>
          </div>
        </div>

        <div className="detail-gallery-grid">
          {galleryImages.map((slide, index) => (
            <button
              key={slide.key || `${slide.src}-${index}`}
              type="button"
              className={`detail-gallery-tile ${index === 0 ? "is-featured" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Open ${title} image ${index + 1}`}
            >
              <img src={slide.src} alt={`${title} still ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} decoding="async" />
            </button>
          ))}
        </div>
      </div>

      {openSlide && isMounted
        ? createPortal(
            <div className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`${title} gallery`} onClick={closeLightbox}>
              <button
                type="button"
                className="detail-lightbox-close"
                aria-label="Close gallery"
                onClick={closeLightbox}
              >
                ×
              </button>

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="detail-lightbox-nav is-left"
                    aria-label="Previous image"
                    onClick={(event) => {
                      event.stopPropagation();
                      showPrevious();
                    }}
                  >
                    {"<"}
                  </button>

                  <button
                    type="button"
                    className="detail-lightbox-nav is-right"
                    aria-label="Next image"
                    onClick={(event) => {
                      event.stopPropagation();
                      showNext();
                    }}
                  >
                    {">"}
                  </button>
                </>
              ) : null}

              <div
                className="detail-lightbox-stage"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={(event) => {
                  const touch = event.changedTouches[0];
                  setTouchStartX(touch?.clientX ?? null);
                  setTouchEndX(null);
                }}
                onTouchMove={(event) => {
                  const touch = event.changedTouches[0];
                  setTouchEndX(touch?.clientX ?? null);
                }}
                onTouchEnd={() => {
                  if (touchStartX === null || touchEndX === null || galleryImages.length <= 1) {
                    return;
                  }

                  const delta = touchStartX - touchEndX;
                  if (Math.abs(delta) < 42) {
                    return;
                  }

                  if (delta > 0) {
                    showNext();
                  } else {
                    showPrevious();
                  }
                }}
              >
                <img
                  src={optimizeMediaImageUrl(openSlide.raw, "lightbox") ?? openSlide.src}
                  alt={`${title} fullscreen still ${(activeIndex ?? 0) + 1}`}
                  loading="eager"
                  decoding="async"
                />
                <div className="detail-lightbox-meta">
                  <span>{(activeIndex ?? 0) + 1}</span>
                  <span>/</span>
                  <span>{galleryImages.length}</span>
                </div>
                {galleryImages.length > 1 ? (
                  <div className="detail-lightbox-strip">
                    {galleryImages.map((slide, index) => (
                      <button
                        key={`thumb-${slide.key}-${index}`}
                        type="button"
                        className={`detail-lightbox-thumb ${index === activeIndex ? "is-active" : ""}`}
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Show ${title} image ${index + 1}`}
                      >
                        <img
                          src={optimizeMediaImageUrl(slide.raw, "thumb") ?? slide.src}
                          alt={`${title} thumbnail ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
