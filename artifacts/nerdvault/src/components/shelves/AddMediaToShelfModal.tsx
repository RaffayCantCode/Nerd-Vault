import React, { useState } from "react";
import { X, Plus, Check, Search, Film, Bookmark } from "lucide-react";
import { api, UnifiedMedia } from "../../lib/api";
import { useVault } from "../../context/VaultContext";

export function AddMediaToShelfModal({
  isOpen,
  onClose,
  shelfId,
  shelfName,
  existingMediaIds,
  onItemAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  shelfId: string;
  shelfName: string;
  existingMediaIds: Set<string>;
  onItemAdded: (item: UnifiedMedia) => void;
}) {
  const { vaultItems, notify, refreshShelves } = useVault();
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredVault = vaultItems.filter((i) => {
    if (!search.trim()) return true;
    return (
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.genre && i.genre.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleAdd = async (item: UnifiedMedia) => {
    setAddingId(item.id);
    try {
      await api.addMediaToShelf(shelfId, item.id, item);
      notify(`Added “${item.title}” to ${shelfName}`);
      onItemAdded(item);
      refreshShelves().catch(() => {});
    } catch {
      notify("Failed to add title to shelf");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div className="nv-card relative flex flex-col max-h-[85vh] w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[.14] bg-[#12181d]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/[.08] hover:text-slate-100 transition"
        >
          <X size={18} />
        </button>

        <div className="mb-4">
          <span className="font-mono-ui text-[10.5px] uppercase tracking-wider font-bold text-[hsl(var(--primary))]">
            Curate Shelf
          </span>
          <h3 className="font-display text-lg font-bold text-slate-100 mt-0.5">
            Add titles to {shelfName}
          </h3>
          <p className="text-[12px] text-slate-400 mt-1">
            Select titles from your personal vault to feature on this playlist.
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title or genre..."
            className="w-full rounded-xl border border-white/[.1] bg-[#172027] pl-10 pr-4 py-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[hsl(var(--primary))] transition"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
          {filteredVault.length > 0 ? (
            filteredVault.map((item) => {
              const alreadyAdded = existingMediaIds.has(item.id) || existingMediaIds.has(item.slug);
              const isAdding = addingId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-2.5 transition hover:bg-white/[.05]"
                >
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="h-14 w-10 rounded-xl object-cover border border-white/[.1] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-100">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.type} · {item.year || item.releaseYear || "Unknown"}
                    </p>
                  </div>
                  {alreadyAdded ? (
                    <span className="flex items-center gap-1 rounded-xl bg-white/[.06] px-3 py-1.5 text-[11px] font-bold text-slate-400">
                      <Check size={13} className="text-[hsl(var(--primary))]" />
                      In shelf
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={isAdding}
                      className="nv-button flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-1.5 text-[11px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] transition shadow-md"
                    >
                      <Plus size={13} />
                      {isAdding ? "Adding..." : "Add"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
              <Bookmark size={24} className="text-slate-600 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">No matching vault titles</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                Add movies, shows, anime, or games to your vault first to include them here.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-white/[.08] pt-3.5">
          <button
            onClick={onClose}
            className="nv-button rounded-xl bg-white/[.06] px-5 py-2 text-[12px] font-bold text-slate-300 hover:bg-white/[.1]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
