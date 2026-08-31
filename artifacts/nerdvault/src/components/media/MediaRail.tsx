import React from "react";
import { UnifiedMedia } from "../../lib/api";
import { SectionHeading } from "../common/SectionHeading";
import { MediaCard } from "./MediaCard";
import { useVault } from "../../context/VaultContext";

export function MediaRail({
  title,
  eyebrow,
  items,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  items: UnifiedMedia[];
  onAction?: () => void;
}) {
  const { notify } = useVault();

  if (!items || items.length === 0) return null;

  return (
    <section className="nv-reveal">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action="View all"
        onAction={
          onAction ||
          (() => notify(`Showing all titles in ${title.toLowerCase()}`))
        }
      />
      <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} compact />
        ))}
      </div>
    </section>
  );
}
