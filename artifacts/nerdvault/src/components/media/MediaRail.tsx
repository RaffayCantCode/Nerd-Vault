import React, { useRef } from "react";
import { UnifiedMedia } from "../../lib/api";
import { SectionHeading } from "../common/SectionHeading";
import { MediaCard } from "./MediaCard";

export function MediaRail({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow?: string;
  items: UnifiedMedia[];
  onAction?: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (railRef.current) {
      const scrollAmount = direction === "left" ? -480 : 480;
      railRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="nv-reveal group/rail relative">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        onPrev={() => handleScroll("left")}
        onNext={() => handleScroll("right")}
      />
      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} compact />
        ))}
      </div>
    </section>
  );
}
