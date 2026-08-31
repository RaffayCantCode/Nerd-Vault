import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Bookmark, ChevronRight, FolderPlus } from "lucide-react";
import { MediaCard } from "../components/media/MediaCard";
import { SectionHeading } from "../components/common/SectionHeading";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";
import { api, Shelf, UnifiedMedia } from "../lib/api";
import { CreateShelfModal } from "../components/shelves/CreateShelfModal";

export default function VaultPage() {
  const { user, openAuthModal } = useAuth();
  const { vaultItems, stats, notify, loading } = useVault();
  const [tab, setTab] = useState("All");
  const [sort, setSort] = useState<"recent" | "rating" | "title">("recent");
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [createShelfOpen, setCreateShelfOpen] = useState(false);

  useEffect(() => {
    api.getShelves()
      .then((res) => {
        if (res?.shelves) setShelves(res.shelves);
      })
      .catch(() => {});
  }, []);

  const tabs = ["All", "Watching", "Completed", "Wishlist", "Favorites"];

  let filtered = vaultItems.filter((item) => {
    if (tab === "All") return true;
    if (tab === "Favorites") return item.status === "Favorite" || (item.userRating && item.userRating >= 4.5);
    return item.status?.toLowerCase() === tab.toLowerCase();
  });

  if (sort === "rating") {
    filtered = [...filtered].sort((a, b) => Number(b.userRating || b.rating || 0) - Number(a.userRating || a.rating || 0));
  } else if (sort === "title") {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  const statCards = [
    { label: "In your vault", value: String(stats?.totalCollected || vaultItems.length), meta: "Tracked titles" },
    { label: "Hours tracked", value: `${stats?.hoursWatched || Math.round(vaultItems.length * 2.2)}h`, meta: "Estimated watch time" },
    { label: "Top genre", value: stats?.topGenre || (vaultItems[0]?.genre || "Not enough data"), meta: `${stats?.topGenreCount || vaultItems.length} titles` },
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
          <p className="font-mono-ui text-[11px] uppercase font-bold tracking-[.22em] text-[hsl(var(--primary))]">
            Personal archive
          </p>
          <h2 className="font-display mt-1 text-3xl sm:text-4xl font-bold tracking-[-.06em] text-white">
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
            className="nv-button flex items-center gap-2 rounded-xl border border-white/[.12] bg-white/[.04] px-4 py-2.5 text-[12px] font-bold text-slate-200 hover:border-[rgba(55,218,178,.35)] hover:text-[hsl(var(--primary))]"
          >
            <Plus size={15} /> New shelf
          </button>
          <Link
            href="/discover"
            data-testid="button-import-vault"
            className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
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
            <p className="text-[11px] text-slate-500">{stat.label}</p>
            <p className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-[-.05em] text-slate-100">
              {stat.value}
            </p>
            <p className="mt-1 font-mono-ui text-[9px] uppercase tracking-wider text-[hsl(var(--accent))]">
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

          <div className="flex items-center gap-2 self-end sm:self-center">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="h-10 rounded-xl border border-white/[.1] bg-[#141b20] px-3.5 text-[12px] font-semibold text-slate-300 outline-none"
            >
              <option value="recent">Recently added</option>
              <option value="rating">Highest rated</option>
              <option value="title">Alphabetical</option>
            </select>
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
              No {tab.toLowerCase()} titles in your vault
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
                <Link
                  key={shelf.id}
                  href={`/vault?folder=${shelf.slug}`}
                  data-testid={`button-shelf-${shelf.slug}`}
                  className="nv-button flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3.5 text-left hover:bg-white/[.07] transition"
                >
                  <span className={`h-3 w-3 rounded-full ${colorClass}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-slate-200">
                      {shelf.name}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {shelf.itemCount} titles
                    </span>
                  </span>
                  <ChevronRight size={15} className="ml-auto text-slate-600" />
                </Link>
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
