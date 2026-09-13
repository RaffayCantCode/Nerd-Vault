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
      const scrollAmount = direction === "left" ? -600 : 600;
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
        className="flex gap-5 sm:gap-6 overflow-x-auto pt-5 pb-8 px-2.5 -mt-3 -mb-6 -mx-2.5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <MediaCard key={item.id} item={item} compact />
        ))}
      </div>
    </section>
  );
}
