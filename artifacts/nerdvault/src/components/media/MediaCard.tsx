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

  const rawPoster = item.poster || (item as any).coverUrl || (item as any).cover_url || item.backdrop || (item as any).backdropUrl;
  const posterUrl = !imgError && rawPoster && typeof rawPoster === "string" && !rawPoster.includes("undefined") && rawPoster.trim() !== ""
    ? rawPoster
    : undefined;

  return (
    <>
      <div
        data-testid={`card-media-${item.id}`}
        className={`nv-poster-wrap group relative block cursor-pointer select-none ${
          compact ? "w-[155px] shrink-0 sm:w-[185px] md:w-[205px]" : "min-w-0"
        }`}
      >
        <Link href={`/media/${item.id}`} className="block">
          <div
            className="relative overflow-hidden rounded-2xl sm:rounded-[22px] border border-white/[.1] bg-[#141b20] aspect-[2/3] transition-all duration-300 ease-out group-hover:-translate-y-2.5 group-hover:scale-[1.03] group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_30px_rgba(55,218,178,0.22)] group-hover:border-[hsl(var(--primary))]/70"
          >
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${item.title} poster`}
                className="nv-poster h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-[#11171c] p-4 text-center">
                <ImageOff size={28} className="text-slate-600 mb-2" />
                <span className="text-[11px] sm:text-[12px] font-bold text-slate-400 line-clamp-2">{item.title}</span>
              </div>
            )}

            {/* Subtle Gradient Overlays for High Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090d10]/95 via-[#090d10]/35 to-[#090d10]/10" />

            {/* Prominent Frosted Glass Media Type Badge */}
            <span className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 rounded-lg bg-black/75 px-2.5 py-1 font-mono-ui text-[10px] sm:text-[11px] font-extrabold text-slate-100 shadow-xl backdrop-blur-md border border-white/[.18]">
              {item.type}
            </span>

            {/* Status Badge + One-Click Remove Cross (X) */}
            {inVault && (
              <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-20 flex items-center gap-1.5">
                <span className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 font-mono-ui text-[9.5px] sm:text-[10.5px] font-black text-[#09201c] shadow-xl backdrop-blur-md">
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
                  className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-black/80 text-slate-300 hover:bg-red-500 hover:text-white border border-white/[.2] shadow-lg transition active:scale-95"
                >
                  <X size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}

            {/* Card Information Bottom Drawer */}
            <div className="absolute inset-x-3 bottom-3 sm:inset-x-3.5 sm:bottom-3.5">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-[#e6f4ed]">
                <Star size={12} className="text-[#acd986] sm:w-[14px] sm:h-[14px]" fill="#acd986" />
                <span className="font-extrabold">{item.rating}</span>
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-normal">/ 5</span>
              </div>
              <p className="mt-1 line-clamp-1 text-[12px] sm:text-[13px] font-bold text-white group-hover:text-[hsl(var(--primary))] transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {item.title}
              </p>
              <p className="mt-0.5 font-mono-ui text-[9.5px] sm:text-[10.5px] text-slate-400 truncate">
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
