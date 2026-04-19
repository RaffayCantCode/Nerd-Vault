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
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => {
          if (current === null) return current;
          return (current + 1) % galleryImages.length;
        });
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => {
          if (current === null) return current;
          return (current - 1 + galleryImages.length) % galleryImages.length;
        });
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
            <div className="detail-lightbox" role="dialog" aria-modal="true" aria-label={`${title} gallery`} onClick={() => setActiveIndex(null)}>
              <button
                type="button"
                className="detail-lightbox-close"
                aria-label="Close gallery"
                onClick={() => setActiveIndex(null)}
              >
                X
              </button>

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="detail-lightbox-nav is-left"
                    aria-label="Previous image"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveIndex((current) => {
                        if (current === null) return current;
                        return (current - 1 + galleryImages.length) % galleryImages.length;
                      });
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
                      setActiveIndex((current) => {
                        if (current === null) return current;
                        return (current + 1) % galleryImages.length;
                      });
                    }}
                  >
                    {">"}
                  </button>
                </>
              ) : null}

              <div className="detail-lightbox-stage" onClick={(event) => event.stopPropagation()}>
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
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
