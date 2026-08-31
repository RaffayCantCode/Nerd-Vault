import React, { useState } from "react";
import { Link } from "wouter";
import { Star, ImageOff, X } from "lucide-react";
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
  const { isInVault, getItemStatus, removeMedia } = useVault();
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const inVault = isInVault(item.id);
  const status = getItemStatus(item.id) || item.status;

  const handleCardClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nv_discover_scroll_y", String(window.scrollY));
    }
  };

  const rawPoster = item.poster || (item as any).coverUrl || (item as any).cover_url || item.backdrop || (item as any).backdropUrl;
  const posterUrl = !imgError && rawPoster && typeof rawPoster === "string" && !rawPoster.includes("undefined") && rawPoster.trim() !== ""
    ? rawPoster
    : undefined;

  return (
    <>
      <div
        data-testid={`card-media-${item.id}`}
        className={`nv-poster-wrap group relative block cursor-pointer ${
          compact ? "w-[120px] shrink-0 sm:w-[152px]" : "min-w-0"
        }`}
      >
        <Link href={`/media/${item.id}`} onClick={handleCardClick} className="block">
          <div
            className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[.09] bg-[#161d22] aspect-[2/3] transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.03] group-hover:shadow-[0_16px_36px_rgba(0,0,0,.85),0_0_24px_rgba(55,218,178,.2)] group-hover:border-[rgba(55,218,178,.6)]`}
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
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#131b20] p-3 text-center">
                <ImageOff size={24} className="text-slate-600 mb-1 sm:mb-2" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 line-clamp-2">{item.title}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />

            {/* Prominent High-Legibility Media Type Badge */}
            <span className="absolute left-2 top-2 sm:left-2.5 sm:top-2.5 rounded-md sm:rounded-lg bg-black/80 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono-ui text-[9px] sm:text-[11px] font-bold text-slate-100 shadow-xl backdrop-blur-md border border-white/[.16]">
              {item.type}
            </span>

            {/* Status Badge + One-Click Remove Cross (X) */}
            {inVault && (
              <div className="absolute right-2 top-2 sm:right-2.5 sm:top-2.5 z-20 flex items-center gap-1.5">
                <span className="rounded-md sm:rounded-lg bg-[hsl(var(--primary))] px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono-ui text-[9px] sm:text-[10px] font-extrabold text-[#09201c] shadow-xl backdrop-blur-md">
                  {status || "Vault"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeMedia(item.id);
                  }}
                  aria-label={`Remove ${item.title} from vault`}
                  title="Remove from vault"
                  className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md sm:rounded-lg bg-black/80 text-slate-300 hover:bg-red-500 hover:text-white border border-white/[.2] shadow-lg transition active:scale-95"
                >
                  <X size={11} className="sm:w-3 sm:h-3" />
                </button>
              </div>
            )}

            <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#e6f4ed]">
                <Star size={11} className="text-[#acd986] sm:w-[13px] sm:h-[13px]" fill="#acd986" />
                <span>{item.rating}</span>
                <span className="text-slate-400 text-[8px] sm:text-[9px] font-normal">/ 5</span>
              </div>
              <p className="mt-0.5 sm:mt-1 line-clamp-1 text-[11px] sm:text-[12px] font-bold text-white group-hover:text-[hsl(var(--primary))] transition-colors">
                {item.title}
              </p>
              <p className="font-mono-ui text-[9px] sm:text-[10px] text-slate-400">
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
