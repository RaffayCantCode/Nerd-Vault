import React, { useState } from "react";
import { Link } from "wouter";
import { Star, ImageOff } from "lucide-react";
import { UnifiedMedia } from "../../lib/api";
import { useVault } from "../../context/VaultContext";
import { MediaTrackModal } from "./MediaTrackModal";

export function MediaCard({
  item,
  compact = false,
}: {
  item: UnifiedMedia;
  compact?: boolean;
}) {
  const { isInVault, getItemStatus } = useVault();
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const inVault = isInVault(item.id);
  const status = getItemStatus(item.id) || item.status;

  const handleCardClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nv_discover_scroll_y", String(window.scrollY));
    }
  };

  const posterUrl = !imgError && item.poster && !item.poster.includes("undefined")
    ? item.poster
    : undefined;

  return (
    <>
      <div
        data-testid={`card-media-${item.id}`}
        className={`nv-poster-wrap group relative block cursor-pointer ${
          compact ? "w-[130px] shrink-0 sm:w-[152px]" : "min-w-0"
        }`}
      >
        <Link href={`/media/${item.id}`} onClick={handleCardClick} className="block">
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/[.09] bg-[#161d22] aspect-[2/3] transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.03] group-hover:shadow-[0_16px_36px_rgba(0,0,0,.85),0_0_24px_rgba(55,218,178,.2)] group-hover:border-[rgba(55,218,178,.6)]`}
          >
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${item.title} poster`}
                className="nv-poster h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#131b20] p-4 text-center">
                <ImageOff size={28} className="text-slate-600 mb-2" />
                <span className="text-[11px] font-bold text-slate-400 line-clamp-2">{item.title}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />

            {/* Prominent High-Legibility Media Type Badge */}
            <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/80 px-2.5 py-1 font-mono-ui text-[11px] font-bold text-slate-100 shadow-xl backdrop-blur-md border border-white/[.16]">
              {item.type}
            </span>

            {inVault && (
              <span className="absolute right-2.5 top-2.5 rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 font-mono-ui text-[10px] font-extrabold text-[#09201c] shadow-xl backdrop-blur-md">
                {status || "Vault"}
              </span>
            )}

            <div className="absolute inset-x-3 bottom-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#e6f4ed]">
                <Star size={13} fill="#acd986" className="text-[#acd986]" />
                <span>{item.rating}</span>
                <span className="text-slate-400 text-[9px] font-normal">/ 5</span>
              </div>
              <p className="mt-1 line-clamp-1 text-[12px] font-bold text-white group-hover:text-[hsl(var(--primary))] transition-colors">
                {item.title}
              </p>
              <p className="font-mono-ui text-[10px] text-slate-400">
                {item.year} · {item.genre}
              </p>
            </div>
          </div>
        </Link>
      </div>

      <MediaTrackModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={item}
      />
    </>
  );
}
