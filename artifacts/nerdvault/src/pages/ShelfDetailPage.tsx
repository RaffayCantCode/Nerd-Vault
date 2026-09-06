import React, { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Trash2,
  Plus,
  Globe,
  Lock,
  Users,
  Bookmark,
  Sparkles,
  Search,
  Check,
  Film,
  Folder,
} from "lucide-react";
import { api, Shelf, UnifiedMedia } from "../lib/api";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";
import { MediaCard } from "../components/media/MediaCard";
import { EditShelfModal } from "../components/shelves/EditShelfModal";
import { AddMediaToShelfModal } from "../components/shelves/AddMediaToShelfModal";

export default function ShelfDetailPage() {
  const [, params] = useRoute("/shelf/:id");
  const [, shelvesParams] = useRoute("/shelves/:id");
  const shelfIdOrSlug = params?.id || shelvesParams?.id || "";

  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { notify, refreshShelves } = useVault();

  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [items, setItems] = useState<UnifiedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shelfIdOrSlug) return;
    setLoading(true);
    api.getShelfDetail(shelfIdOrSlug)
      .then((data) => {
        if (data?.shelf) {
          setShelf(data.shelf);
          setItems(data.items || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load shelf:", err);
        setShelf(null);
      })
      .finally(() => setLoading(false));
  }, [shelfIdOrSlug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shelf?.name || "NerdVault Shelf",
          text: shelf?.description || "Check out this curated shelf on NerdVault!",
          url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Shelf link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify("Failed to copy link");
    }
  };

  const handleRemoveItem = async (mediaId: string, title: string) => {
    if (!shelf) return;
    try {
      await api.removeMediaFromShelf(shelf.id, mediaId);
      setItems((prev) => prev.filter((i) => i.id !== mediaId));
      setShelf((prev) => (prev ? { ...prev, itemCount: Math.max(0, (prev.itemCount || 1) - 1) } : null));
      notify(`Removed “${title}” from shelf`);
      refreshShelves().catch(() => {});
    } catch {
      notify("Failed to remove title from shelf");
    }
  };

  const handleItemAdded = (newItem: UnifiedMedia) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === newItem.id)) return prev;
      return [newItem, ...prev];
    });
    setShelf((prev) => (prev ? { ...prev, itemCount: (prev.itemCount || 0) + 1 } : null));
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
          <p className="text-[12px] text-slate-500">Loading shelf collection...</p>
        </div>
      </div>
    );
  }

  if (!shelf) {
    return (
      <div className="space-y-6 pb-16">
        <button
          onClick={() => navigate("/vault")}
          className="nv-button flex items-center gap-2 rounded-xl border border-white/[.1] bg-[#12181d]/80 px-4 py-2 text-[12px] font-bold text-slate-300 backdrop-blur hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition"
        >
          <ArrowLeft size={15} /> Back to Vault
        </button>
        <div className="nv-card flex min-h-[300px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[.04] text-slate-500 mb-3">
            <Folder size={24} />
          </div>
          <p className="text-[15px] font-bold text-slate-200">Shelf Not Found</p>
          <p className="mt-1 max-w-[320px] text-[12px] text-slate-500">
            This collection may have been removed, or is set to private by its creator.
          </p>
          <button
            onClick={() => navigate("/vault")}
            className="nv-button mt-4 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7]"
          >
            Go to My Vault
          </button>
        </div>
      </div>
    );
  }

  const isOwner = shelf.isOwner || (user && user.id === (shelf as any).user_id);
  const existingMediaIds = new Set(items.map((i) => i.id));

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterType !== "All") {
      const itemType = (item.type || "").toLowerCase();
      const target = filterType.toLowerCase();
      if (target === "movies" && itemType !== "movie") return false;
      if (target === "series" && itemType !== "series" && itemType !== "show") return false;
      if (target === "anime" && itemType !== "anime") return false;
      if (target === "games" && itemType !== "game") return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !(item.genre && item.genre.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-10 pb-20">
      {/* Top Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/vault")}
          data-testid="button-back-vault"
          className="nv-button flex items-center gap-2 rounded-xl border border-white/[.1] bg-[#12181d]/80 px-4 py-2 text-[12px] font-bold text-slate-300 backdrop-blur hover:border-[rgba(55,218,178,.4)] hover:text-[hsl(var(--primary))] transition"
        >
          <ArrowLeft size={15} /> Back to Vault
        </button>
      </div>

      {/* Hero Header Section */}
      <section className="nv-reveal relative overflow-hidden rounded-3xl border border-white/[.12] bg-gradient-to-br from-[#131b22] via-[#0d1419] to-[#070b0e] p-6 sm:p-10 shadow-2xl">
        {/* Atmospheric ambient glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[rgba(55,218,178,.12)] blur-[90px]" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="flex items-center gap-1 rounded-md bg-[hsl(var(--primary))] px-2.5 py-1 text-[#08211c] font-black shadow-sm">
                <Folder size={12} />
                Collection
              </span>
              <span className="flex items-center gap-1 rounded-md border border-white/[.14] bg-white/[.04] px-2.5 py-0.5 text-slate-300 backdrop-blur">
                {shelf.visibility === "private" ? (
                  <>
                    <Lock size={12} className="text-amber-400" /> Private
                  </>
                ) : shelf.visibility === "friends" ? (
                  <>
                    <Users size={12} className="text-sky-400" /> Friends Only
                  </>
                ) : (
                  <>
                    <Globe size={12} className="text-[hsl(var(--primary))]" /> Public
                  </>
                )}
              </span>
              <span className="rounded-md border border-white/[.14] bg-white/[.04] px-2.5 py-0.5 text-slate-300 backdrop-blur">
                {items.length} {items.length === 1 ? "title" : "titles"}
              </span>
              {shelf.ownerName && (
                <span className="text-slate-400 text-[11px] font-semibold ml-1">
                  · Curated by <span className="text-slate-200 font-bold">{shelf.ownerName}</span>
                </span>
              )}
            </div>

            {/* Shelf Name Title */}
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-[-.06em] text-white">
              {shelf.name}
            </h1>

            {/* Description */}
            <p className="text-[13.5px] sm:text-[14px] leading-6 text-slate-300 font-medium">
              {shelf.description || "A custom curated shelf of titles from personal nerd archive."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isOwner && (
              <>
                <button
                  onClick={() => setAddModalOpen(true)}
                  data-testid="button-shelf-add-title"
                  className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-lg shadow-[rgba(55,218,178,.25)]"
                >
                  <Plus size={15} /> Add title
                </button>

                <button
                  onClick={() => setEditModalOpen(true)}
                  data-testid="button-shelf-edit"
                  className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.14] bg-white/[.05] px-3.5 py-2.5 text-[12px] font-bold text-slate-200 hover:border-white/[.28] hover:bg-white/[.1] transition"
                >
                  <Pencil size={14} /> Edit
                </button>
              </>
            )}

            <button
              onClick={handleShare}
              data-testid="button-shelf-share"
              className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.14] bg-white/[.05] px-3.5 py-2.5 text-[12px] font-bold text-slate-200 hover:border-white/[.28] hover:bg-white/[.1] transition"
            >
              {copied ? <Check size={14} className="text-[hsl(var(--primary))]" /> : <Share2 size={14} />}
              {copied ? "Link copied!" : "Share"}
            </button>
          </div>
        </div>
      </section>

      {/* Shelf Filter and Search Controls */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-1.5 rounded-2xl border border-white/[.1] bg-[#10161b]/90 p-1.5 shadow-xl backdrop-blur-md overflow-x-auto [scrollbar-width:none]">
            {["All", "Movies", "Series", "Anime", "Games"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`nv-button whitespace-nowrap rounded-xl px-4 py-2 text-[12px] font-bold transition-all duration-200 ${
                  filterType === t
                    ? "bg-[hsl(var(--primary))] text-[#08211c] font-extrabold shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[.05]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shelf items..."
              className="w-full rounded-xl border border-white/[.1] bg-[#141b20] pl-9 pr-3.5 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[hsl(var(--primary))]"
            />
          </div>
        </div>
      )}

      {/* Media Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative group">
              <MediaCard item={item} />
              {isOwner && (
                <button
                  onClick={() => handleRemoveItem(item.id, item.title)}
                  title="Remove from shelf"
                  className="absolute right-2 top-2 z-30 grid h-7 w-7 place-items-center rounded-lg bg-black/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition shadow-lg backdrop-blur"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="nv-card flex min-h-[220px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
          <p className="text-[14px] font-bold text-slate-300">No {filterType.toLowerCase()} titles found</p>
          <p className="mt-1 text-[12px] text-slate-500">Try adjusting your filter or search query.</p>
        </div>
      ) : (
        <div className="nv-card flex min-h-[300px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(55,218,178,.1)] text-[hsl(var(--primary))] shadow-lg mb-3">
            <Bookmark size={24} />
          </div>
          <p className="text-[16px] font-bold text-slate-200">This shelf is currently empty</p>
          <p className="mt-1 max-w-[340px] text-[12px] leading-5 text-slate-500">
            Start curating this playlist by adding your favorite titles from your vault or the live catalog.
          </p>
          {isOwner && (
            <button
              onClick={() => setAddModalOpen(true)}
              data-testid="button-shelf-empty-add"
              className="nv-button mt-5 flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-lg shadow-[rgba(55,218,178,.25)]"
            >
              <Plus size={15} /> Add titles to shelf
            </button>
          )}
        </div>
      )}

      {/* Edit Shelf Modal */}
      {shelf && (
        <EditShelfModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          shelf={shelf}
          onSuccess={(updated) => {
            setShelf((prev) => (prev ? { ...prev, ...updated } : updated));
          }}
          onDelete={() => {
            navigate("/vault");
          }}
        />
      )}

      {/* Add Media To Shelf Modal */}
      {shelf && (
        <AddMediaToShelfModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          shelfId={shelf.id}
          shelfName={shelf.name}
          existingMediaIds={existingMediaIds}
          onItemAdded={handleItemAdded}
        />
      )}
    </div>
  );
}
