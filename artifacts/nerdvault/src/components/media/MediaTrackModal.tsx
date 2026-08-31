import React, { useState } from "react";
import { X, Star, CheckCircle2, Trash2, Eye, EyeOff } from "lucide-react";
import { UnifiedMedia } from "../../lib/api";
import { useVault } from "../../context/VaultContext";
import { useAuth } from "../../context/AuthContext";

export function MediaTrackModal({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedMedia;
}) {
  const { user, openAuthModal } = useAuth();
  const { trackMedia, removeMedia, isInVault, getItemStatus } = useVault();
  const currentStatus = getItemStatus(item.id) || item.status || "Watching";

  const rawNotes = item.notes || "";
  const initialPrivate = rawNotes.startsWith("[PRIVATE]") || rawNotes.startsWith("#private");
  const cleanNotes = rawNotes.replace(/^\[PRIVATE\]\s*/i, "").replace(/^#private\s*/i, "");

  const [status, setStatus] = useState(currentStatus);
  const [rating, setRating] = useState<number>(
    item.userRating ? Math.min(5, Math.max(1, Math.round(item.userRating > 5 ? item.userRating / 2 : item.userRating))) : 4
  );
  const [notes, setNotes] = useState<string>(cleanNotes);
  const [isPrivate, setIsPrivate] = useState<boolean>(initialPrivate);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) {
      onClose();
      openAuthModal();
      return;
    }

    setSaving(true);
    try {
      const finalNotes = notes.trim()
        ? (isPrivate ? `[PRIVATE] ${notes.trim()}` : notes.trim())
        : undefined;

      await trackMedia(item, status, rating, finalNotes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user) {
      onClose();
      openAuthModal();
      return;
    }

    setSaving(true);
    try {
      await removeMedia(item.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inVault = isInVault(item.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="nv-card relative w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[.14] bg-[#11171c]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.08] hover:text-slate-100"
        >
          <X size={18} />
        </button>

        <div className="flex gap-4">
          <img
            src={item.poster}
            alt=""
            className="h-28 w-20 rounded-2xl object-cover border border-white/[.1] shadow-md"
          />
          <div className="min-w-0 flex-1">
            <span className="font-mono-ui text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--primary))]">
              {item.type} · {item.year}
            </span>
            <h3 className="font-display text-lg font-bold text-slate-100 truncate mt-0.5">
              {item.title}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{item.genre}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Tracking Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Watching", "Completed", "Wishlist", "Favorite", "Dropped", "Paused"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-xl py-2 text-[11px] font-semibold transition ${
                    status === s
                      ? "bg-[hsl(var(--primary))] text-[#09201c] font-bold shadow-[0_0_16px_rgba(55,218,178,.3)]"
                      : "border border-white/[.08] bg-white/[.03] text-slate-400 hover:bg-white/[.07] hover:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Your Rating ({rating} / 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition hover:scale-115"
                >
                  <Star
                    size={22}
                    fill={star <= rating ? "#acd986" : "transparent"}
                    className={star <= rating ? "text-[#acd986]" : "text-slate-700 hover:text-[#acd986]"}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Area with Public / Private Eye Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                Review & Notes
              </label>

              {/* Eye Icon Privacy Toggle */}
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`nv-button flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                  isPrivate
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30"
                }`}
                title={isPrivate ? "Click to make public" : "Click to make private"}
              >
                {isPrivate ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{isPrivate ? "Private review" : "Public review"}</span>
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your review or thoughts on this title..."
              rows={3}
              className="w-full rounded-2xl border border-white/[.1] bg-black/30 p-3 text-[12px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-[rgba(55,218,178,.5)]"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {isPrivate
                ? "🔒 Private: Only visible to you on this title's review section."
                : "🌐 Public: Visible to all collectors in the community review feed."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-white/[.08]">
          {inVault ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="nv-button flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-[11px] font-bold text-red-400 hover:bg-red-500/20"
            >
              <Trash2 size={14} /> Remove
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="nv-button rounded-xl border border-white/[.1] px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7] shadow-lg"
            >
              <CheckCircle2 size={15} /> Save to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
