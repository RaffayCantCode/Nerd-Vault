"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { ListsWorkspace } from "@/components/lists-workspace";
import { HomeWorkspace } from "@/components/home-workspace";
import { NVLoader } from "@/components/nv-loader";
import { TasteCardSearchModal } from "@/components/taste-card-search-modal";
import { MediaItem } from "@/lib/types";
import {
  fetchProfilePayload,
  loadPinnedFavorites,
  PinnedFavorites,
  primeProfilePayload,
  removeFriend,
  savePinnedFavorites,
  saveProfileSettings,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { PrivacyLevel, SocialProfile, VaultProfilePayload } from "@/lib/vault-types";
import { HomeFeed } from "@/lib/home-feed";
import {
  Camera, Edit3, Plus, Star, Sparkles, Film, Tv, Gamepad2,
  Layers, Bookmark, Users, Compass, CheckCircle2,
} from "lucide-react";

export type VaultSubTab = "overview" | "watched" | "wishlist" | "lists" | "friends" | "for-you";

type LibrarySortMode = "recent" | "title" | "rating";
type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";

function readGridColumnCount(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") return 0;
  const value = window.getComputedStyle(element).gridTemplateColumns;
  if (!value) return 0;
  return value.split(/\s+/).filter(Boolean).length;
}

function sortMediaItems(items: MediaItem[], mode: LibrarySortMode) {
  const sorted = [...items];
  const scoreForSort = (item: MediaItem) => item.userRating ?? item.rating;

  switch (mode) {
    case "title":
      return sorted.sort((left, right) => left.title.localeCompare(right.title));
    case "rating":
      return sorted.sort((left, right) => scoreForSort(right) - scoreForSort(left) || right.year - left.year);
    default:
      return sorted.sort((left, right) => (right.watchedAt ?? 0) - (left.watchedAt ?? 0) || right.year - left.year || scoreForSort(right) - scoreForSort(left));
  }
}

function filterMediaItems(items: MediaItem[], mode: MediaFilterMode, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return items.filter((item) => {
    if (mode !== "all" && item.type !== mode) return false;
    if (!normalizedSearch) return true;
    return `${item.title} ${item.originalTitle ?? ""} ${item.genres.join(" ")} ${item.overview}`.toLowerCase().includes(normalizedSearch);
  });
}

function mediaFilterOptions() {
  return [
    { value: "all", label: "All media" },
    { value: "movie", label: "Movies" },
    { value: "show", label: "Shows" },
    { value: "anime", label: "Anime" },
    { value: "game", label: "Games" },
  ] as Array<{ value: MediaFilterMode; label: string }>;
}

type TasteSlotKey = "movie" | "show" | "anime" | "game";

const TASTE_SLOTS: Array<{ key: TasteSlotKey; label: string; icon: React.ReactNode; color: string }> = [
  { key: "movie", label: "Favorite Film", icon: <Film size={13} />, color: "#f59e0b" },
  { key: "show", label: "Favorite Series", icon: <Tv size={13} />, color: "#a855f7" },
  { key: "anime", label: "Favorite Anime", icon: <Sparkles size={13} />, color: "#ec4899" },
  { key: "game", label: "Favorite Game", icon: <Gamepad2 size={13} />, color: "#10b981" },
];

function favoriteSlots(items: MediaItem[], pinned: PinnedFavorites) {
  const ranked = sortMediaItems(items.filter((item) => item.userRating || item.rating), "rating");
  const autoPick = (type: TasteSlotKey) =>
    type === "anime"
      ? ranked.find((item) => item.type === "anime" || item.type === "anime_movie")
      : ranked.find((item) => item.type === type);

  return TASTE_SLOTS.map((slot) => ({
    ...slot,
    item: pinned[slot.key] ?? autoPick(slot.key),
    isPinned: Boolean(pinned[slot.key]),
  }));
}

function sortOptions() {
  return [
    { value: "recent", label: "Newest" },
    { value: "title", label: "A-Z" },
    { value: "rating", label: "Top rated" },
  ] as Array<{ value: LibrarySortMode; label: string }>;
}

function emptyPayload(viewerId: string, viewerName: string, viewerAvatar?: string): VaultProfilePayload {
  const profile: SocialProfile = {
    id: viewerId,
    name: viewerName,
    handle: "@loading",
    avatarUrl: viewerAvatar,
    bio: "",
    friends: [],
    watchedVisibility: "public",
    wishlistVisibility: "friends",
    foldersDefaultVisibility: "public",
    inbox: [],
  };

  return {
    viewerProfile: profile,
    viewedProfile: profile,
    friends: [],
    watched: [],
    wishlist: [],
    lists: [],
    folders: [],
    canSeeWatched: true,
    canSeeWishlist: true,
    viewingOwnProfile: true,
  };
}

export function ProfileWorkspace({
  userName,
  viewerId,
  viewerAvatar,
  isDemo,
  initialPayload,
  initialTab = "overview",
  feed,
}: {
  userName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
  initialPayload?: VaultProfilePayload;
  initialTab?: VaultSubTab;
  feed?: HomeFeed;
}) {
  const searchParams = useSearchParams();
  const viewedUserId = searchParams.get("user") || viewerId;
  const [activeTab, setActiveTab] = useState<VaultSubTab>(initialTab);
  const [payload, setPayload] = useState<VaultProfilePayload>(initialPayload ?? emptyPayload(viewerId, userName, viewerAvatar));
  const [loading, setLoading] = useState(!initialPayload);
  const [draftAvatar, setDraftAvatar] = useState(initialPayload?.viewerProfile.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [watchedSort, setWatchedSort] = useState<LibrarySortMode>("recent");
  const [wishlistSort, setWishlistSort] = useState<LibrarySortMode>("recent");
  const [watchedMediaFilter, setWatchedMediaFilter] = useState<MediaFilterMode>("all");
  const [wishlistMediaFilter, setWishlistMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedSearch, setWatchedSearch] = useState("");
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [watchedPage, setWatchedPage] = useState(1);
  const [wishlistPage, setWishlistPage] = useState(1);
  const [watchedPageSize, setWatchedPageSize] = useState(12);
  const [wishlistPageSize, setWishlistPageSize] = useState(12);
  const [pinnedFavorites, setPinnedFavorites] = useState<PinnedFavorites>({ movie: null, show: null, anime: null, game: null });
  const [editingTasteSlot, setEditingTasteSlot] = useState<TasteSlotKey | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const watchedGridRef = useRef<HTMLDivElement | null>(null);
  const wishlistGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPinnedFavorites(loadPinnedFavorites(viewerId));
  }, [viewerId]);

  useEffect(() => {
    if (initialPayload) {
      primeProfilePayload(initialPayload, initialPayload.viewingOwnProfile ? undefined : initialPayload.viewedProfile.id);
    }
  }, [initialPayload]);

  useEffect(() => {
    if (isDemo) {
      setPayload(emptyPayload(viewerId, userName, viewerAvatar));
      setLoading(false);
      return;
    }

    function sync() {
      setLoading((current) => current || !initialPayload);
      fetchProfilePayload(viewedUserId)
        .then((nextPayload) => {
          setPayload(nextPayload);
          setDraftAvatar(nextPayload.viewerProfile.avatarUrl ?? "");
        })
        .finally(() => setLoading(false));
    }

    if (!initialPayload || viewedUserId !== initialPayload.viewedProfile.id) {
      void sync();
    }
    return subscribeVaultChanges(sync);
  }, [initialPayload, isDemo, viewedUserId, viewerAvatar, viewerId, userName]);

  const { viewedProfile, friends, watched, wishlist, canSeeWatched, canSeeWishlist, viewingOwnProfile } = payload;
  const lists = payload.lists ?? payload.folders ?? [];

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  useEffect(() => {
    setWatchedPage(1);
  }, [viewedUserId, watchedMediaFilter, watchedSearch, watchedSort]);

  useEffect(() => {
    setWishlistPage(1);
  }, [viewedUserId, wishlistMediaFilter, wishlistSearch, wishlistSort]);

  useEffect(() => {
    function syncPagedGridSizes() {
      const rows = 3;
      const watchedCols = readGridColumnCount(watchedGridRef.current);
      const wishlistCols = readGridColumnCount(wishlistGridRef.current);

      const nextWatchedPageSize = watchedCols ? Math.max(1, watchedCols * rows) : 12;
      const nextWishlistPageSize = wishlistCols ? Math.max(1, wishlistCols * rows) : 12;

      setWatchedPageSize(nextWatchedPageSize);
      setWishlistPageSize(nextWishlistPageSize);
    }

    syncPagedGridSizes();
    window.addEventListener("resize", syncPagedGridSizes);
    return () => window.removeEventListener("resize", syncPagedGridSizes);
  }, []);

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  }

  async function handleApplyAvatar(dataUrl: string) {
    setDraftAvatar(dataUrl);
    await saveProfileSettings({ avatarUrl: dataUrl });
    setProfileMessage("Profile image updated.");
  }

  const deferredWatchedSearch = useDeferredValue(watchedSearch);
  const deferredWishlistSearch = useDeferredValue(wishlistSearch);

  const sortedWatched = useMemo(
    () => sortMediaItems(filterMediaItems(watched, watchedMediaFilter, deferredWatchedSearch), watchedSort),
    [deferredWatchedSearch, watched, watchedMediaFilter, watchedSort],
  );
  const sortedWishlist = useMemo(
    () => sortMediaItems(filterMediaItems(wishlist, wishlistMediaFilter, deferredWishlistSearch), wishlistSort),
    [deferredWishlistSearch, wishlist, wishlistMediaFilter, wishlistSort],
  );

  const watchedTotalPages = Math.max(1, Math.ceil(sortedWatched.length / watchedPageSize));
  const wishlistTotalPages = Math.max(1, Math.ceil(sortedWishlist.length / wishlistPageSize));
  
  const pagedWatched = useMemo(
    () => sortedWatched.slice((watchedPage - 1) * watchedPageSize, watchedPage * watchedPageSize),
    [sortedWatched, watchedPage, watchedPageSize],
  );
  const pagedWishlist = useMemo(
    () => sortedWishlist.slice((wishlistPage - 1) * wishlistPageSize, wishlistPage * wishlistPageSize),
    [sortedWishlist, wishlistPage, wishlistPageSize],
  );

  const currentYear = new Date().getFullYear();
  const thisYearCount = useMemo(
    () => watched.filter((item) => item.year === currentYear).length,
    [watched, currentYear],
  );

  const featuredFavorites = useMemo(() => favoriteSlots(watched, pinnedFavorites), [watched, pinnedFavorites]);

  function handlePinFavorite(slot: TasteSlotKey, item: MediaItem) {
    const next = { ...pinnedFavorites, [slot]: item };
    setPinnedFavorites(next);
    savePinnedFavorites(viewerId, next);
    setEditingTasteSlot(null);
  }

  function handleUnpinFavorite(slot: TasteSlotKey) {
    const next = { ...pinnedFavorites, [slot]: null };
    setPinnedFavorites(next);
    savePinnedFavorites(viewerId, next);
  }

  function renderRatingStars(rating?: number | null, userRating?: number | null) {
    const score = userRating ? userRating : (rating ? Math.round(rating / 2) : 4);
    const clamped = Math.max(1, Math.min(5, Math.round(score)));
    return (
      <span className="nv-lb-stars" title={`${userRating ? `${userRating}/5 personal rating` : `${rating?.toFixed(1) || 8.0} score`}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={11} fill={i < clamped ? "#fbbf24" : "none"} stroke="#fbbf24" />
        ))}
      </span>
    );
  }

  if (isDemo) {
    return (
      <main className="workspace">
        <section className="workspace-hero glass profile-stage profile-guest-safe">
          <div className="workspace-hero-grid profile-stage-grid">
            <div className="workspace-copy profile-stage-copy">
              <p className="eyebrow">Guest mode</p>
              <h1 className="display profile-display">Your vault is available after sign in.</h1>
              <p className="copy">Sign in to track your library, save custom lists, and pin your favorite four titles.</p>
              <div className="button-row">
                <Link href="/sign-in?redirectTo=/home" className="button button-primary">Sign in</Link>
                <Link href="/browse" className="button button-secondary">Browse catalog</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="nv-letterboxd-vault">
      {/* Hidden file input triggered by avatar button */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarFileChange}
      />

      {/* 1. Letterboxd-style Header Profile Banner */}
      <header className="nv-lb-header">
        <div className="nv-lb-profile-info">
          <div className="nv-lb-avatar-wrap">
            {draftAvatar || viewedProfile.avatarUrl ? (
              <img
                src={draftAvatar || viewedProfile.avatarUrl}
                alt={viewedProfile.name}
                className="nv-lb-avatar-img"
              />
            ) : (
              <span className="nv-lb-avatar-fallback">
                {(viewedProfile.name || userName).charAt(0).toUpperCase()}
              </span>
            )}
            {viewingOwnProfile && (
              <button
                type="button"
                className="nv-lb-avatar-edit-btn"
                title="Change profile avatar"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile avatar"
              >
                <Camera size={18} />
              </button>
            )}
          </div>

          <div className="nv-lb-names">
            <h1 className="nv-lb-display-name">{viewedProfile.name || userName}</h1>
            <span className="nv-lb-handle">{viewedProfile.handle}</span>
          </div>
        </div>

        {/* 2. Letterboxd-style Stat Counters */}
        <div className="nv-lb-stats-row">
          <button type="button" className="nv-lb-stat-item" onClick={() => setActiveTab("watched")}>
            <span className="nv-lb-stat-num">{watched.length}</span>
            <span className="nv-lb-stat-label">Logged</span>
          </button>
          <button type="button" className="nv-lb-stat-item" onClick={() => setActiveTab("watched")}>
            <span className="nv-lb-stat-num">{thisYearCount}</span>
            <span className="nv-lb-stat-label">This Year</span>
          </button>
          <button type="button" className="nv-lb-stat-item" onClick={() => setActiveTab("lists")}>
            <span className="nv-lb-stat-num">{lists.length}</span>
            <span className="nv-lb-stat-label">Lists</span>
          </button>
          <button type="button" className="nv-lb-stat-item" onClick={() => setActiveTab("wishlist")}>
            <span className="nv-lb-stat-num">{wishlist.length}</span>
            <span className="nv-lb-stat-label">Wishlist</span>
          </button>
          <button type="button" className="nv-lb-stat-item" onClick={() => setActiveTab("friends")}>
            <span className="nv-lb-stat-num">{friends.length}</span>
            <span className="nv-lb-stat-label">Friends</span>
          </button>
        </div>
      </header>

      {profileMessage && (
        <div className="auth-feedback auth-feedback-success" role="status">
          <CheckCircle2 size={16} />
          <span>{profileMessage}</span>
        </div>
      )}

      {/* 3. Centered Letterboxd Sub-Navigation Pill Bar */}
      <nav className="nv-lb-tab-nav" aria-label="Vault sections">
        <button
          type="button"
          className={`nv-lb-tab-btn ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Layers size={14} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={`nv-lb-tab-btn ${activeTab === "watched" ? "is-active" : ""}`}
          onClick={() => setActiveTab("watched")}
        >
          <Film size={14} />
          <span>Watched ({watched.length})</span>
        </button>
        <button
          type="button"
          className={`nv-lb-tab-btn ${activeTab === "wishlist" ? "is-active" : ""}`}
          onClick={() => setActiveTab("wishlist")}
        >
          <Bookmark size={14} />
          <span>Wishlist ({wishlist.length})</span>
        </button>
        <button
          type="button"
          className={`nv-lb-tab-btn ${activeTab === "lists" ? "is-active" : ""}`}
          onClick={() => setActiveTab("lists")}
        >
          <span>Lists ({lists.length})</span>
        </button>
        <button
          type="button"
          className={`nv-lb-tab-btn ${activeTab === "friends" ? "is-active" : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          <Users size={14} />
          <span>Friends ({friends.length})</span>
        </button>
        {feed && (
          <button
            type="button"
            className={`nv-lb-tab-btn ${activeTab === "for-you" ? "is-active" : ""}`}
            onClick={() => setActiveTab("for-you")}
          >
            <Sparkles size={14} />
            <span>For You</span>
          </button>
        )}
      </nav>

      {/* 4. OVERVIEW TAB (Letterboxd Favorites + Recent Activity) */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
          {/* A. 4 FAVORITE SLOTS (TASTE CARD) */}
          <section>
            <div className="nv-lb-section-head">
              <h2 className="nv-lb-section-title">
                <Sparkles size={15} style={{ color: "#5eead4" }} />
                <span>Favorite Titles</span>
              </h2>
            </div>

            <div className="nv-lb-favorites-grid">
              {featuredFavorites.map((slot) => {
                const item = slot.item;
                if (!item) {
                  return (
                    <div
                      key={slot.key}
                      className="nv-lb-favorite-empty"
                      onClick={() => viewingOwnProfile && setEditingTasteSlot(slot.key as TasteSlotKey)}
                      title={`Add ${slot.label}`}
                    >
                      <div className="nv-lb-fav-empty-icon">
                        <Plus size={18} />
                      </div>
                      <span className="nv-lb-fav-empty-label">{slot.label}</span>
                      <small style={{ color: "rgba(226, 232, 240, 0.45)", fontSize: "0.72rem" }}>
                        {viewingOwnProfile ? "+ Choose title" : "Empty"}
                      </small>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot.key}
                    className="nv-lb-favorite-card"
                    onClick={() => viewingOwnProfile && setEditingTasteSlot(slot.key as TasteSlotKey)}
                  >
                    <div className="nv-lb-fav-poster">
                      <img src={item.coverUrl || item.backdropUrl} alt={item.title} />
                      <span className="nv-lb-fav-tag" style={{ color: slot.color, borderColor: slot.color }}>
                        {slot.label}
                      </span>
                      {viewingOwnProfile && (
                        <button
                          type="button"
                          className="nv-lb-fav-edit-btn"
                          title="Change favorite"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTasteSlot(slot.key as TasteSlotKey);
                          }}
                          aria-label={`Change ${slot.label}`}
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="nv-lb-fav-info">
                      <h3 className="nv-lb-fav-title" title={item.title}>{item.title}</h3>
                      <div className="nv-lb-fav-meta">
                        <span>{item.year || "—"}</span>
                        <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                          ★ {(item.userRating ? item.userRating * 2 : item.rating || 8.0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* B. RECENT ACTIVITY (WATCHED REEL) */}
          <section>
            <div className="nv-lb-section-head">
              <h2 className="nv-lb-section-title">
                <Film size={15} style={{ color: "#f59e0b" }} />
                <span>Recent Activity</span>
              </h2>
              {watched.length > 0 && (
                <button type="button" className="nv-lb-section-link" onClick={() => setActiveTab("watched")}>
                  View all ({watched.length})
                </button>
              )}
            </div>

            {watched.length > 0 ? (
              <div className="nv-lb-poster-row">
                {watched.slice(0, 7).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
                    className="nv-lb-mini-card"
                  >
                    <div className="nv-lb-mini-poster">
                      <img src={item.coverUrl || item.backdropUrl} alt={item.title} loading="lazy" />
                    </div>
                    <h4 className="nv-lb-mini-title" title={item.title}>{item.title}</h4>
                    {renderRatingStars(item.rating, item.userRating)}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">No logged media in your vault yet.</p>
                <Link href="/browse" className="button button-primary" style={{ fontSize: "0.82rem", padding: "0.45rem 1.25rem" }}>
                  <Compass size={15} />
                  <span>Browse Catalog</span>
                </Link>
              </div>
            )}
          </section>

          {/* C. CURATED LISTS PREVIEW */}
          <section>
            <div className="nv-lb-section-head">
              <h2 className="nv-lb-section-title">
                <Bookmark size={15} style={{ color: "#a855f7" }} />
                <span>Lists &amp; Shelves</span>
              </h2>
              <button type="button" className="nv-lb-section-link" onClick={() => setActiveTab("lists")}>
                View all ({lists.length})
              </button>
            </div>

            {lists.length > 0 ? (
              <div className="folder-list">
                {lists.slice(0, 3).map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`} className="folder-row glass">
                    <div className="folder-row-main">
                      <div className="folder-row-copy">
                        <strong>{list.name || (list as any).title}</strong>
                        <span className="muted">{list.itemCount ?? list.items?.length ?? 0} items</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">No custom lists created yet.</p>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 1.25rem" }}
                  onClick={() => setActiveTab("lists")}
                >
                  <Plus size={15} />
                  <span>Create a List</span>
                </button>
              </div>
            )}
          </section>

          {/* D. WISHLIST PREVIEW */}
          <section>
            <div className="nv-lb-section-head">
              <h2 className="nv-lb-section-title">
                <Bookmark size={15} style={{ color: "#ec4899" }} />
                <span>Wishlist</span>
              </h2>
              {wishlist.length > 0 && (
                <button type="button" className="nv-lb-section-link" onClick={() => setActiveTab("wishlist")}>
                  View all ({wishlist.length})
                </button>
              )}
            </div>

            {wishlist.length > 0 ? (
              <div className="nv-lb-poster-row">
                {wishlist.slice(0, 7).map((item) => (
                  <Link
                    key={item.id}
                    href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
                    className="nv-lb-mini-card"
                  >
                    <div className="nv-lb-mini-poster">
                      <img src={item.coverUrl || item.backdropUrl} alt={item.title} loading="lazy" />
                    </div>
                    <h4 className="nv-lb-mini-title" title={item.title}>{item.title}</h4>
                    <span style={{ fontSize: "0.72rem", color: "rgba(226, 232, 240, 0.55)" }}>{item.year || "—"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">Your wishlist is currently empty.</p>
                <Link href="/browse" className="button button-secondary" style={{ fontSize: "0.82rem", padding: "0.45rem 1.25rem" }}>
                  <Compass size={15} />
                  <span>Explore Titles</span>
                </Link>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 5. WATCHED TAB */}
      {activeTab === "watched" && (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Watched / Played</p>
              <h2 className="headline">{viewingOwnProfile ? "Your Logged Library" : "Visible Library"}</h2>
            </div>
            <div className="library-controls profile-library-controls">
              <div className="library-control-block">
                <div className="chip-row library-chip-row">
                  {mediaFilterOptions().map((option) => (
                    <button
                      key={`watched-media-${option.value}`}
                      type="button"
                      className={`picker-chip ${watchedMediaFilter === option.value ? "is-active" : ""}`}
                      onClick={() => setWatchedMediaFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-control-block">
                <div className="chip-row library-chip-row">
                  {sortOptions().map((option) => (
                    <button
                      key={`watched-sort-${option.value}`}
                      type="button"
                      className={`picker-chip ${watchedSort === option.value ? "is-active" : ""}`}
                      onClick={() => setWatchedSort(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className="search-input library-search-input"
                type="search"
                placeholder="Search watched..."
                value={watchedSearch}
                onChange={(event) => setWatchedSearch(event.target.value)}
              />
            </div>
          </div>

          {canSeeWatched || viewingOwnProfile ? (
            sortedWatched.length ? (
              <>
                <div className="catalog-grid profile-media-grid" ref={watchedGridRef}>
                  {pagedWatched.map((item, index) => (
                    <CatalogCard key={item.id} item={item} priority={index < 8} />
                  ))}
                </div>
                {watchedTotalPages > 1 && (
                  <div className="bottom-pager glass profile-section-pager">
                    <div className="pager-copy">
                      <p className="copy">Page {watchedPage} of {watchedTotalPages}</p>
                    </div>
                    <div className="pager-actions">
                      <button
                        type="button"
                        className="chip"
                        disabled={watchedPage <= 1}
                        onClick={() => setWatchedPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="chip is-active"
                        disabled={watchedPage >= watchedTotalPages}
                        onClick={() => setWatchedPage((p) => Math.min(watchedTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">No watched media found in this view.</p>
                <Link href="/browse" className="button button-primary" style={{ fontSize: "0.82rem" }}>
                  <span>Browse Catalog</span>
                </Link>
              </div>
            )
          ) : (
            <div className="nv-lb-empty-box">
              <p className="nv-lb-empty-text">This watched library is private.</p>
            </div>
          )}
        </section>
      )}

      {/* 6. WISHLIST TAB */}
      {activeTab === "wishlist" && (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Wishlist</p>
              <h2 className="headline">{viewingOwnProfile ? "Saved to Watch" : "Visible Wishlist"}</h2>
            </div>
            <div className="library-controls profile-library-controls">
              <div className="library-control-block">
                <div className="chip-row library-chip-row">
                  {mediaFilterOptions().map((option) => (
                    <button
                      key={`wishlist-media-${option.value}`}
                      type="button"
                      className={`picker-chip ${wishlistMediaFilter === option.value ? "is-active" : ""}`}
                      onClick={() => setWishlistMediaFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-control-block">
                <div className="chip-row library-chip-row">
                  {sortOptions().map((option) => (
                    <button
                      key={`wishlist-sort-${option.value}`}
                      type="button"
                      className={`picker-chip ${wishlistSort === option.value ? "is-active" : ""}`}
                      onClick={() => setWishlistSort(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className="search-input library-search-input"
                type="search"
                placeholder="Search wishlist..."
                value={wishlistSearch}
                onChange={(event) => setWishlistSearch(event.target.value)}
              />
            </div>
          </div>

          {canSeeWishlist || viewingOwnProfile ? (
            sortedWishlist.length ? (
              <>
                <div className="catalog-grid profile-media-grid" ref={wishlistGridRef}>
                  {pagedWishlist.map((item, index) => (
                    <CatalogCard key={item.id} item={item} priority={index < 8} />
                  ))}
                </div>
                {wishlistTotalPages > 1 && (
                  <div className="bottom-pager glass profile-section-pager">
                    <div className="pager-copy">
                      <p className="copy">Page {wishlistPage} of {wishlistTotalPages}</p>
                    </div>
                    <div className="pager-actions">
                      <button
                        type="button"
                        className="chip"
                        disabled={wishlistPage <= 1}
                        onClick={() => setWishlistPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="chip is-active"
                        disabled={wishlistPage >= wishlistTotalPages}
                        onClick={() => setWishlistPage((p) => Math.min(wishlistTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">No items in wishlist.</p>
                <Link href="/browse" className="button button-secondary" style={{ fontSize: "0.82rem" }}>
                  <span>Explore Titles</span>
                </Link>
              </div>
            )
          ) : (
            <div className="nv-lb-empty-box">
              <p className="nv-lb-empty-text">This wishlist is private.</p>
            </div>
          )}
        </section>
      )}

      {/* 7. LISTS TAB */}
      {activeTab === "lists" && (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Lists &amp; Folders</p>
              <h2 className="headline">{viewingOwnProfile ? "Your Curated Lists" : `${viewedProfile.name}'s Lists`}</h2>
            </div>
          </div>
          <ListsWorkspace
            lists={lists}
            viewingOwnProfile={viewingOwnProfile}
            viewedUserId={viewedUserId}
          />
        </section>
      )}

      {/* 8. FRIENDS TAB */}
      {activeTab === "friends" && (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Network</p>
              <h2 className="headline">{viewingOwnProfile ? "Your Friends" : `${viewedProfile.name}'s Network`}</h2>
            </div>
          </div>
          <div className="folder-list profile-friends-list">
            {friends.length ? (
              friends.map((friend) => (
                <div key={friend.id} className="folder-row glass">
                  <Link href={`/profile?user=${friend.id}`} className="folder-row-main" style={{ flex: 1 }}>
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt={friend.name} className="folder-row-avatar" />
                    ) : (
                      <span className="folder-row-avatar folder-row-avatar-fallback">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="folder-row-copy">
                      <strong>{friend.name}</strong>
                      <span className="muted">{friend.handle}</span>
                    </div>
                  </Link>
                  {viewingOwnProfile && (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 12px", fontSize: "0.8rem", flexShrink: 0 }}
                      onClick={() => {
                        if (confirm(`Remove ${friend.name} as a friend?`)) {
                          void removeFriend(friend.id);
                        }
                      }}
                    >
                      Unfriend
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="nv-lb-empty-box">
                <p className="nv-lb-empty-text">No friends connected yet.</p>
                <Link href="/friends" className="button button-secondary" style={{ fontSize: "0.82rem" }}>
                  <span>Find Friends</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. FOR YOU TAB */}
      {activeTab === "for-you" && feed && (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <HomeWorkspace viewerName={userName} feed={feed} />
        </section>
      )}

      {/* Taste Card Search Picker Modal */}
      {editingTasteSlot && (
        <TasteCardSearchModal
          slot={editingTasteSlot}
          onSelect={(item) => handlePinFavorite(editingTasteSlot, item)}
          onClose={() => setEditingTasteSlot(null)}
        />
      )}

      {/* Profile Image Adjuster Modal */}
      <ImageAdjusterModal
        file={avatarFile}
        title="Adjust profile image"
        onClose={() => setAvatarFile(null)}
        onApply={(dataUrl) => void handleApplyAvatar(dataUrl)}
      />
    </div>
  );
}
