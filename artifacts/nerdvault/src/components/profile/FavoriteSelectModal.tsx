import React, { useState, useEffect } from "react";
import { X, Search, Star, Check, Loader2, Sparkles, Film, Tv, Gamepad2 } from "lucide-react";
import { api, UnifiedMedia } from "../../lib/api";
import { useVault } from "../../context/VaultContext";

export function FavoriteSelectModal({
  isOpen,
  onClose,
  targetType,
  onSelected,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetType: "Movie" | "Series" | "Anime" | "Game";
  onSelected: (item: UnifiedMedia) => void;
}) {
  const { trackMedia, notify } = useVault();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedMedia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }

    setLoading(true);
    // Fetch initial trending recommendations for this media type
    api.discover({ type: targetType, page: 1 })
      .then((res) => {
        setResults(res?.items?.slice(0, 12) || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, targetType]);

  // Debounced search when query changes
  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      setLoading(true);
      api.search(query.trim())
        .then((res) => {
          const filtered = (res?.items || []).filter(
            (i) => i.type?.toLowerCase() === targetType.toLowerCase() ||
                   (targetType === "Series" && i.type?.toLowerCase() === "show")
          );
          setResults(filtered.length > 0 ? filtered : (res?.items || []).slice(0, 12));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, targetType]);

  if (!isOpen) return null;

  const handleSelect = async (item: UnifiedMedia) => {
    await trackMedia(item, "Favorite", 5);
    onSelected(item);
    notify(`Set ${item.title} as your Favorite ${targetType}!`);
    onClose();
  };

  const getIcon = () => {
    switch (targetType) {
      case "Movie": return <Film size={18} className="text-[hsl(var(--primary))]" />;
      case "Series": return <Tv size={18} className="text-[hsl(var(--primary))]" />;
      case "Anime": return <Sparkles size={18} className="text-[hsl(var(--primary))]" />;
      case "Game": return <Gamepad2 size={18} className="text-[hsl(var(--primary))]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0">
      <div className="nv-card relative w-full max-w-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[.14] bg-[#11171c]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.08] hover:text-slate-100"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--primary))]/15">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Choose Favorite {targetType}
            </h3>
            <p className="text-[12px] text-slate-400">
              Search and pick a title to spotlight on your profile.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-5">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${targetType} titles (e.g. Dune, Solo Leveling, Elden Ring)...`}
            className="h-11 w-full rounded-2xl border border-white/[.12] bg-black/40 pl-10 pr-4 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-[rgba(55,218,178,.55)] shadow-inner"
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="mt-5 max-h-[380px] overflow-y-auto pr-1 space-y-2 [scrollbar-width:none]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-[12px]">
              <Loader2 size={22} className="animate-spin text-[hsl(var(--primary))]" />
              <span>Searching titles...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-2.5 text-left hover:border-[rgba(55,218,178,.45)] hover:bg-[rgba(55,218,178,.08)] transition group"
                >
                  <img
                    src={item.poster}
                    alt=""
                    className="h-14 w-10 rounded-lg object-cover border border-white/[.1] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white group-hover:text-[hsl(var(--primary))] truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.year} · {item.genre}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#acd986] mt-1">
                      <Star size={10} fill="currentColor" />
                      <span>{item.rating} / 5</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-[12px]">
              <span>No {targetType} titles found for "{query}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
