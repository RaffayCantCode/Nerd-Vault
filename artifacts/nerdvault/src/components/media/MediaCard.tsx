import React, { useState } from "react";
import { Link } from "wouter";
import { Star, ImageOff, X } from "lucide-react";
import { UnifiedMedia } from "../../lib/api";
import { mediaCache } from "../../lib/mediaCache";
import { useVault } from "../../context/VaultContext";
import { MediaTrackModal } from "./MediaTrackModal";

export function MediaCard({
  item,
  compact = false,
}: {
  item: UnifiedMedia;
  compact?: boolean;
}) {
  const { isInVault, getItemStatus, getItemRating, removeMedia } = useVault();
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const inVault = isInVault(item.id);
  const status = getItemStatus(item.id) || item.status;

  const vaultRating = getItemRating(item.id) || (item.slug ? getItemRating(item.slug) : undefined);
  const rawRating = item.userRating !== undefined && item.userRating !== null && Number(item.userRating) > 0
    ? Number(item.userRating)
    : vaultRating;
  const hasUserRating = inVault && rawRating !== undefined && rawRating !== null && Number(rawRating) > 0;
  const displayRating = hasUserRating
    ? Math.round(Number(rawRating) > 5 ? Number(rawRating) / 2 : Number(rawRating))
    : Math.round(Number(item.rating) > 5 ? Number(item.rating) / 2 : (Number(item.rating) || 4));

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
        <Link
          href={`/media/${item.id}`}
          className="block"
          onClick={() => mediaCache.set(item)}
          onMouseEnter={() => mediaCache.set(item)}
        >
          <div
            className="relative overflow-hidden rounded-2xl sm:rounded-[22px] border border-white/[.12] bg-[#141b20] aspect-[2/3] shadow-[0_4px_16px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.025] group-hover:shadow-[0_20px_35px_-8px_rgba(0,0,0,0.8),0_0_24px_-2px_rgba(55,218,178,0.32),0_8px_16px_-4px_rgba(55,218,178,0.22)] group-hover:border-[hsl(var(--primary))]/80"
          >
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${item.title} poster`}
                className="nv-poster h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
                decoding="async"
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
            <span className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur-md border border-white/[.18]">
              {item.type}
            </span>

            {/* Status Badge + One-Click Remove Cross (X) */}
            {inVault && (
              <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-20 flex items-center gap-1.5">
                <span className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 text-xs font-bold text-[#09201c] shadow-xl backdrop-blur-md">
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
            <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#e6f4ed]">
                <Star size={14} className="text-[#acd986] sm:w-[15px] sm:h-[15px]" fill="#acd986" />
                <span className="font-mono-ui font-bold">{displayRating}</span>
                <span className="text-slate-400 text-xs font-normal">/ 5</span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm sm:text-[15px] font-semibold text-white group-hover:text-[hsl(var(--primary))] transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                {item.year && <span className="font-mono-ui">{item.year}</span>}
                {item.year && item.genre && <span> · </span>}
                {item.genre && <span>{item.genre}</span>}
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
