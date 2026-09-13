import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Bookmark, ChevronRight, FolderPlus, Trash2 } from "lucide-react";
import { MediaCard } from "../components/media/MediaCard";
import { SectionHeading } from "../components/common/SectionHeading";
import { CustomSelect } from "../components/common/CustomSelect";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";
import { api, Shelf, UnifiedMedia } from "../lib/api";
import { CreateShelfModal } from "../components/shelves/CreateShelfModal";

export default function VaultPage() {
  const { user, openAuthModal } = useAuth();
  const { vaultItems, stats, notify, loading, shelves, refreshShelves } = useVault();
  const [tab, setTab] = useState("All");
  const [mediaType, setMediaType] = useState("All types");
  const [sort, setSort] = useState<"recent" | "rating" | "title">("recent");
  const [createShelfOpen, setCreateShelfOpen] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const folder = query.get("folder");
    if (folder) {
      window.location.replace(`/shelf/${folder}`);
    }
  }, []);

  const tabs = ["All", "Watching", "Completed", "Wishlist", "Favorites"];

  const mediaTypeOptions = [
    { label: "All types", value: "All types" },
    { label: "Movies", value: "Movie" },
    { label: "Series", value: "Series" },
    { label: "Anime", value: "Anime" },
    { label: "Games", value: "Game" },
  ];

  const sortOptions = [
    { label: "Recently added", value: "recent" },
    { label: "Highest rated", value: "rating" },
    { label: "Alphabetical", value: "title" },
  ];

  const profileFavoriteIds = React.useMemo(() => {
    if (typeof window === "undefined") return new Set<string>();
    const ids = new Set<string>();
    const types = ["Movie", "Series", "Anime", "Game"];
    for (const t of types) {
      try {
        const stored = localStorage.getItem(`nv_profile_fav_${t}_${user?.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) ids.add(parsed.id);
        }
      } catch {}
    }
    return ids;
  }, [user?.id, vaultItems]);

  let filtered = vaultItems.filter((item) => {
    if (tab === "Favorites") {
      const isFav = item.status === "Favorite" || profileFavoriteIds.has(item.id) || (item.notes && item.notes.includes("#favorite"));
      if (!isFav) return false;
    } else if (tab !== "All") {
      if (item.status?.toLowerCase() !== tab.toLowerCase()) return false;
    }

    if (mediaType !== "All types") {
      const itemType = (item.type || "").toLowerCase();
      const target = mediaType.toLowerCase();
      if (target === "movie" && itemType !== "movie") return false;
      if (target === "series" && itemType !== "series" && itemType !== "show") return false;
      if (target === "anime" && itemType !== "anime") return false;
      if (target === "game" && itemType !== "game") return false;
    }

    return true;
  });

  if (sort === "rating") {
    filtered = [...filtered].sort((a, b) => Number(b.userRating || b.rating || 0) - Number(a.userRating || a.rating || 0));
  } else if (sort === "title") {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  const completedCount = vaultItems.filter(
    (i) => (i.status as string) === "Completed" || (i.status as string) === "Watched" || (i.status as string) === "Read"
  ).length;

  const topGenre = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const ignored = new Set(["all", "unknown", "n/a", "featured", "other", "general", ""]);
    for (const item of vaultItems) {
      const candidates = [
        ...(item.genres || []),
        ...(item.genre ? item.genre.split(/[\/,·|]/) : []),
      ];
      for (const g of candidates) {
        if (!g || typeof g !== "string") continue;
        const clean = g.trim();
        if (clean && !ignored.has(clean.toLowerCase())) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) return sorted[0][0];
    return stats?.topGenre || vaultItems[0]?.genre || "Cinema";
  }, [vaultItems, stats?.topGenre]);

  const statCards = [
    { label: "In your vault", value: String(stats?.totalCollected || vaultItems.length), meta: "Tracked titles" },
    { label: "Completed", value: String(completedCount), meta: "Finished titles" },
    { label: "Top genre", value: topGenre, meta: "Most logged" },
    { label: "Avg. user rating", value: `${stats?.averageRating ? stats.averageRating.toFixed(1) : "0.0"} / 5`, meta: "Out of 5 stars" },
  ];

  const colors: Record<string, string> = {
    teal: "bg-[#3dbeae]",
    green: "bg-[#a5d78e]",
    violet: "bg-[#a898d0]",
    orange: "bg-[#d79368]",
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="nv-reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Your collection, your rules.
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!user) {
                openAuthModal();
                return;
              }
              setCreateShelfOpen(true);
            }}
            data-testid="button-new-shelf-vault"
            className="nv-button flex items-center gap-2 rounded-xl border border-white/[.12] bg-white/[.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:border-[rgba(55,218,178,.35)] hover:text-[hsl(var(--primary))]"
          >
            <Plus size={15} /> New shelf
          </button>
          <Link
            href="/discover"
            data-testid="button-import-vault"
            className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
          >
            <Plus size={15} /> Add title
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            data-testid={`stat-vault-${i}`}
            className={`nv-card nv-reveal nv-reveal-${i + 1} rounded-2xl p-5 border border-white/[.08]`}
          >
            <p className="text-xs font-medium text-slate-400">{stat.label}</p>
            <p className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-[hsl(var(--accent))] font-medium">
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      {/* Big Centered Tabs & Sorting Bar */}
      <section className="space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Centered Large Pill Tab Bar */}
          <div className="flex w-full sm:w-auto justify-center">
            <div className="flex gap-1.5 rounded-2xl border border-white/[.1] bg-[#10161b]/90 p-1.5 shadow-xl backdrop-blur-md overflow-x-auto [scrollbar-width:none]">
              {tabs.map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  data-testid={`button-vault-tab-${item.toLowerCase()}`}
                  className={`nv-button whitespace-nowrap rounded-xl px-5 py-2.5 sm:px-6 sm:py-2.5 text-[13px] font-bold transition-all duration-200 ${
                    tab === item
                      ? "bg-[hsl(var(--primary))] text-[#08211c] shadow-[0_0_20px_rgba(55,218,178,.35)] font-extrabold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[.05]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center">
            {/* Media Type Filter to the LEFT of the recently added sort dropdown */}
            <CustomSelect
              value={mediaType}
              onChange={setMediaType}
              options={mediaTypeOptions}
              minWidth="125px"
              buttonClassName="h-10 text-[12px] bg-[#141b20]"
            />

            {/* Recently added / Sort dropdown */}
            <CustomSelect
              value={sort}
              onChange={(val) => setSort(val as any)}
              options={sortOptions}
              minWidth="150px"
              buttonClassName="h-10 text-[12px] bg-[#141b20]"
            />
          </div>
        </div>

        {/* Media Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="nv-card flex min-h-[260px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(55,218,178,.1)] text-[hsl(var(--primary))] shadow-lg">
              <Bookmark size={24} />
            </div>
            <p className="mt-4 text-[15px] font-bold text-slate-200">
              No {mediaType !== "All types" ? mediaType.toLowerCase() : ""} {tab.toLowerCase()} titles in your vault
            </p>
            <p className="mt-1 max-w-[340px] text-[12px] leading-5 text-slate-500">
              Explore trending movies, series, anime, and games to begin building your personal archive.
            </p>
            <Link
              href="/discover"
              data-testid="button-empty-browse"
              className="nv-button mt-5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
            >
              Browse live catalog
            </Link>
          </div>
        )}
      </section>

      {/* User Shelves & Playlists Section */}
      <div className="nv-card rounded-3xl p-6 border border-white/[.08]">
        <SectionHeading
          eyebrow="Custom Playlists"
          title="Your shelves"
          action="Create new"
          onAction={() => setCreateShelfOpen(true)}
        />
        {shelves.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {shelves.map((shelf, idx) => {
              const colorKeys = Object.keys(colors);
              const colorClass = colors[colorKeys[idx % colorKeys.length]];
              return (
                <div
                  key={shelf.id}
                  className="group relative flex items-center justify-between gap-2.5 rounded-2xl border border-white/[.08] bg-white/[.025] p-3.5 text-left hover:border-white/[.18] hover:bg-white/[.06] transition-all"
                >
                  <Link
                    href={`/shelf/${shelf.id}`}
                    data-testid={`button-shelf-${shelf.slug}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <span className={`h-3 w-3 rounded-full shrink-0 ${colorClass}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-slate-200 group-hover:text-white">
                        {shelf.name}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {shelf.itemCount} titles
                      </span>
                    </span>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete shelf "${shelf.name}"?`)) {
                          try {
                            await api.deleteShelf(shelf.id);
                            notify(`Shelf "${shelf.name}" deleted`);
                            refreshShelves();
                          } catch {
                            notify("Failed to delete shelf");
                          }
                        }
                      }}
                      title="Delete shelf"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                    <Link href={`/shelf/${shelf.id}`} className="text-slate-600 group-hover:text-[hsl(var(--primary))] transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
            <FolderPlus size={28} className="text-slate-600 mb-2" />
            <p className="text-[13px] font-bold text-slate-300">No custom shelves created yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
              Group your media into custom playlists like "Late Night Sci-Fi", "Anime Masterpieces", or "Cozy Games".
            </p>
            <button
              onClick={() => setCreateShelfOpen(true)}
              className="nv-button mt-4 rounded-xl bg-white/[.07] px-4 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/[.12]"
            >
              Create first shelf
            </button>
          </div>
        )}
      </div>

      <CreateShelfModal
        isOpen={createShelfOpen}
        onClose={() => setCreateShelfOpen(false)}
      />
    </div>
  );
}
