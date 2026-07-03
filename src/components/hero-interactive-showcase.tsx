"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MediaItem } from "@/lib/types";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { Star } from "lucide-react";
import Link from "next/link";

export function HeroInteractiveShowcase({ items }: { items: MediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto rotate
  useEffect(() => {
    if (isHovered || items.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovered, items.length]);

  if (items.length === 0) return null;

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div 
      className="nv-hero-coverflow-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        perspective: '1200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d'
        }}
      >
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            // Calculate relative offset (-1, 0, 1, 2)
            let diff = i - activeIndex;
            
            // Normalize for infinite wrapping
            while (diff < -1) diff += items.length;
            while (diff > 2) diff -= items.length;
            
            // If items.length is exactly 4, the diffs will be -1, 0, 1, 2
            const isCenter = diff === 0;
            const isLeft = diff === -1;
            const isRight = diff === 1;
            
            // We set pointer events to none unless it's the center item so user can click links
            const pointerEvents = isCenter ? 'auto' : 'none';

            // Z-index logic
            let zIndex = 1;
            if (isCenter) zIndex = 5;
            else if (isLeft || isRight) zIndex = 3;

            // X offset logic
            let xOffset = 0;
            if (isLeft) xOffset = -300;
            if (isRight) xOffset = 300;

            // Scale logic
            let scale = 0.6;
            if (isCenter) scale = 1;
            else if (isLeft || isRight) scale = 0.85;

            // Opacity logic
            let opacity = 0;
            if (isCenter) opacity = 1;
            else if (isLeft || isRight) opacity = 0.6;

            const typeLabel =
              item.type === "movie" ? "Movie" :
              item.type === "show" ? "TV Show" :
              item.type === "anime" ? "Anime" :
              item.type === "game" ? "Game" :
              (item.type as string) === "book" ? "Book" : item.type;

            const linkHref = `/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`;

            return (
              <motion.div
                key={`${item.id}`}
                initial={false}
                animate={{
                  x: xOffset,
                  scale: scale,
                  zIndex: zIndex,
                  opacity: opacity,
                  rotateY: isLeft ? 15 : isRight ? -15 : 0
                }}
                transition={{
                  duration: 0.6,
                  ease: [0.32, 0.72, 0, 1] // Apple-like spring/ease
                }}
                style={{
                  position: 'absolute',
                  width: '320px',
                  aspectRatio: '2/3',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: isCenter ? '0 30px 60px rgba(0,0,0,0.8)' : '0 10px 30px rgba(0,0,0,0.3)',
                  pointerEvents: pointerEvents,
                  transformOrigin: 'center center',
                  background: '#111'
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x;
                  if (swipe < -50) {
                    handleNext();
                  } else if (swipe > 50) {
                    handlePrev();
                  }
                }}
              >
                <Link href={linkHref} style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }}>
                  {item.coverUrl ? (
                    <img
                      src={optimizeMediaImageUrl(item.coverUrl, "cover")}
                      alt={item.title}
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#222' }} />
                  )}
                  
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '30%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)', pointerEvents: 'none' }} />
                  
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {typeLabel}
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    padding: '40px 20px 20px 20px',
                    background: 'linear-gradient(to top, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.8) 40%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    pointerEvents: 'none'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
                      {item.rating > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 600 }}>
                          <Star size={14} fill="currentColor" /> {item.rating.toFixed(1)}
                        </span>
                      )}
                      {item.year && <span>{item.year}</span>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div 
        style={{
          position: 'absolute',
          bottom: '20px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}
      >
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i === activeIndex ? '#1EBDC2' : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.3s ease'
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
