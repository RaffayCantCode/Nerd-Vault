"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { ListsWorkspace } from "@/components/lists-workspace";
import { NVLoader } from "@/components/nv-loader";
import { TasteCardSearchModal } from "@/components/taste-card-search-modal";
import { MediaItem } from "@/lib/types";
import { deleteUserList, fetchProfilePayload, loadPinnedFavorites, PinnedFavorites, primeProfilePayload, removeFriend, saveUserList, savePinnedFavorites, saveProfileSettings, subscribeVaultChanges } from "@/lib/vault-client";
import { PrivacyLevel, SocialProfile, StoredList, VaultProfilePayload } from "@/lib/vault-types";

type LibrarySortMode = "recent" | "title" | "rating";
type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";
const PROFILE_FOLDER_PAGE_SIZE = 8;

function readGridColumnCount(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") {
    return 0;
  }

  const value = window.getComputedStyle(element).gridTemplateColumns;
  if (!value) return 0;
  // `grid-template-columns` can be a list of tracks like: "1fr 1fr 1fr"
  // or can include functions/spaces. Split on whitespace and keep non-empty tokens.
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
    if (mode !== "all" && item.type !== mode) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return `${item.title} ${item.originalTitle ?? ""} ${item.genres.join(" ")} ${item.overview}`.toLowerCase().includes(normalizedSearch);
  });
}

function getFolderBackdropStyle(coverUrl?: string) {
  if (!coverUrl) {
    return {
      background:
        "radial-gradient(circle at 18% 20%, rgba(157, 184, 255, 0.26), transparent 34%), radial-gradient(circle at 78% 18%, rgba(216, 192, 142, 0.18), transparent 26%), linear-gradient(135deg, rgba(18, 24, 36, 0.96), rgba(7, 10, 17, 0.92))",
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, rgba(12, 16, 26, 0.28), rgba(12, 16, 26, 0.82)), radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 35%), url(${coverUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

function privacyOptions() {
  return [
    { value: "public", label: "Public" },
    { value: "friends", label: "Friends only" },
    { value: "private", label: "Private" },
  ] as Array<{ value: PrivacyLevel; label: string }>;
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

const TASTE_SLOT_LABELS: Record<TasteSlotKey, string> = {
  movie: "Favorite Movie",
  show: "Favorite TV Show",
  anime: "Favorite Anime",
  game: "Favorite Game",
};

function favoriteSlots(items: MediaItem[], pinned: PinnedFavorites) {
  const ranked = sortMediaItems(items.filter((item) => item.userRating || item.rating), "rating");
  const autoPick = (type: TasteSlotKey) =>
    type === "anime"
      ? ranked.find((item) => item.type === "anime" || item.type === "anime_movie")
      : ranked.find((item) => item.type === type);

  return (["movie", "show", "anime", "game"] as TasteSlotKey[]).map((key) => ({
    key,
    label: TASTE_SLOT_LABELS[key],
    item: pinned[key] ?? autoPick(key),
    isPinned: Boolean(pinned[key]),
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
}: {
  userName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
  initialPayload?: VaultProfilePayload;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewedUserId = searchParams.get("user") || viewerId;
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
  const [watchedPageSize, setWatchedPageSize] = useState(9);
  const [wishlistPageSize, setWishlistPageSize] = useState(9);
  const [pinnedFavorites, setPinnedFavorites] = useState<PinnedFavorites>({ movie: null, show: null, anime: null, game: null });
  const [editingTasteSlot, setEditingTasteSlot] = useState<TasteSlotKey | null>(null);
  const profileAvatarActionsRef = useRef<HTMLDivElement | null>(null);
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

  const { viewerProfile, viewedProfile, friends, watched, wishlist, canSeeWatched, canSeeWishlist, viewingOwnProfile } = payload;
  const lists = payload.lists ?? payload.folders ?? [];

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  const headlineCopy = viewingOwnProfile
    ? isDemo
      ? "Guest mode is browse-first now. Sign in when you want lists, friends, inbox, and saved library data to stay attached to your real account."
      : "Your profile, lists, and social activity now stay saved between visits."
    : viewedProfile.bio || "A friend profile inside NerdVault.";

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

      const nextWatchedPageSize = watchedCols ? Math.max(1, watchedCols * rows) : 9;
      const nextWishlistPageSize = wishlistCols ? Math.max(1, wishlistCols * rows) : 9;

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
    await saveProfileSettings({
      avatarUrl: dataUrl,
    });
    setProfileMessage("Profile image applied.");
    window.setTimeout(() => {
      profileAvatarActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  async function handleRemoveAvatar() {
    setDraftAvatar("");
    await saveProfileSettings({
      avatarUrl: "",
    });
    setProfileMessage("Profile image removed.");
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
  const profileStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearCount = watched.filter((item) => item.year === currentYear).length;

    return [
      { label: "Logged", value: watched.length },
      { label: "This year", value: thisYearCount },
      { label: "Lists", value: lists.length },
      { label: "Network", value: friends.length },
    ];
  }, [lists.length, friends.length, watched]);
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

  if (isDemo) {
    return (
      <main className="workspace">
        <section className="workspace-hero glass profile-stage profile-guest-safe">
          <div className="workspace-hero-grid profile-stage-grid">
            <div className="workspace-copy profile-stage-copy">
              <p className="eyebrow">Guest mode</p>
              <h1 className="display profile-display">Profile is available after sign in.</h1>
              <p className="copy">
                You can keep browsing as a guest, but profile, lists, and social features need an account session.
              </p>
              <div className="button-row">
                <Link href="/sign-in?redirectTo=/profile" className="button button-primary">Sign in</Link>
                <Link href="/browse" className="button button-secondary">Continue browsing</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function renderMediaPager(currentPage: number, totalPages: number, onChange: (nextPage: number) => void, label: string) {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="bottom-pager glass profile-section-pager">
        <div className="pager-copy">
          <p className="eyebrow">Page flow</p>
          <p className="copy">
            {label} page {currentPage} of {totalPages}.
          </p>
        </div>
        <div className="pager-actions">
          <button type="button" className="chip" disabled={currentPage <= 1} onClick={() => onChange(Math.max(1, currentPage - 1))}>
            Previous page
          </button>
          <div className="page-indicator">
            <span>{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          <button type="button" className="chip is-active" disabled={currentPage >= totalPages} onClick={() => onChange(Math.min(totalPages, currentPage + 1))}>
            Next page
          </button>
        </div>
      </div>
    );
  }

  // Folder detail via URL: redirect to dedicated list page instead
  const selectedFolderFromQuery = searchParams.get("folder");
  if (selectedFolderFromQuery) {
    // Redirect legacy ?folder=id URLs to the new /lists/[id] page
    return (
      <main className="workspace">
        <section className="workspace-hero glass folder-hero folder-opening-shell">
          <div className="folder-opening-loader">
            <NVLoader label="Opening list…" />
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="workspace">
        <div className="profile-loading-shell">
          <div className="profile-loading-hero">
            <div className="profile-loading-identity">
              <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 16 }} />
              <div style={{ display: "grid", gap: 8, flex: 1 }}>
                <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 180, height: 28, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: 240, height: 14, borderRadius: 6 }} />
              </div>
            </div>
            <div className="skeleton" style={{ width: "100%", height: 48, borderRadius: 12 }} />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="skeleton" style={{ width: 100, height: 16, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: 140, height: 26, borderRadius: 8 }} />
            </div>
            <div className="featured-favorites-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: "3/2", borderRadius: 12 }} />
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: 160, height: 26, borderRadius: 8 }} />
            </div>
            <div className="profile-loading-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <section className="workspace-hero glass folder-hero profile-stage">
        <div className="folder-hero-media" style={getFolderBackdropStyle(viewedProfile.avatarUrl)} />
          <div className="workspace-hero-grid profile-stage-grid">
            <div className="workspace-copy profile-stage-copy">
              <div className="profile-hero-topbar">
                <div className="profile-identity">
                {viewingOwnProfile ? (
                  <div className="profile-avatar-stack">
                    <label className="profile-avatar-edit" title="Change profile image">
                      {draftAvatar ? (
                        <img src={draftAvatar} alt={viewedProfile.name} className="profile-avatar" />
                      ) : (
                        <span className="profile-avatar profile-avatar-fallback">{(viewedProfile.name || userName).charAt(0).toUpperCase()}</span>
                      )}
                      <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
                    </label>
                    <div className="profile-avatar-actions" ref={profileAvatarActionsRef}>
                      <label className="button button-secondary profile-avatar-action-button">
                        {draftAvatar ? "Change image" : "Set profile image"}
                        <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
                      </label>
                      {draftAvatar ? (
                        <button type="button" className="button button-secondary" onClick={() => void handleRemoveAvatar()}>
                          Remove image
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : viewedProfile.avatarUrl ? (
                  <img src={viewedProfile.avatarUrl} alt={viewedProfile.name} className="profile-avatar" />
                ) : (
                  <span className="profile-avatar profile-avatar-fallback">{(viewedProfile.name || userName).charAt(0).toUpperCase()}</span>
                )}
                <div className="profile-identity-copy">
                  <p className="eyebrow">{viewingOwnProfile ? (isDemo ? "Local vault" : "Your vault") : "Friend profile"}</p>
                  <h1 className="display profile-display">{viewedProfile.name || userName}</h1>
                  <div className="profile-hero-meta-row">
                    <span className="detail-pill">{viewedProfile.handle}</span>
                    <span className="detail-pill">{lists.length} lists</span>
                    <span className="detail-pill">{watched.length} logged</span>
                    <span className="detail-pill">{wishlist.length} wishlisted</span>
                  </div>
                  {viewingOwnProfile ? (
                    <div className="profile-stage-actions">
                      <a href="#profile-watched" className="button button-primary">Watched</a>
                      <a href="#profile-wishlist" className="button button-secondary">Wishlist</a>
                      <a href="#profile-lists" className="button button-secondary">Lists</a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="profile-hero-description glass">
              <p className="copy">{loading ? "Loading your saved profile..." : headlineCopy}</p>
            </div>
            {profileMessage ? <p className="media-action-message">{profileMessage}</p> : null}
          </div>
          <aside className="info-panel glass profile-stage-stats">
            <div className="profile-stage-stats-head">
              <p className="eyebrow">At a glance</p>
              <p className="copy">A cleaner read of your activity and saved shelves.</p>
            </div>
            <div className="profile-stage-stats-grid">
              {profileStats.map((stat) => (
                <div key={stat.label} className="profile-stage-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="profile-favorites" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Featured Favorites</p>
            <h2 className="headline">{viewingOwnProfile ? "Your taste card" : `${viewedProfile.name}'s taste card`}</h2>
          </div>
        </div>
        <div className="featured-favorites-grid">
          {featuredFavorites.map((slot) => (
            slot.item ? (
              <div
                key={slot.key}
                className="featured-favorite-card glass"
                onClick={() => {
                  if (!viewingOwnProfile) return;
                  setEditingTasteSlot(slot.key as TasteSlotKey);
                }}
              >
                <img src={slot.item.coverUrl} alt={slot.item.title} />
                {viewingOwnProfile ? (
                  <>
                    <button
                      type="button"
                      className="taste-edit-btn"
                      title="Change favorite"
                      onClick={(e) => { e.stopPropagation(); setEditingTasteSlot(slot.key as TasteSlotKey); }}
                      aria-label={`Edit ${slot.label}`}
                    >
                      ✎
                    </button>
                    {slot.isPinned ? (
                      <button
                        type="button"
                        className="taste-remove-btn"
                        title="Remove pinned favorite"
                        onClick={(e) => { e.stopPropagation(); handleUnpinFavorite(slot.key as TasteSlotKey); }}
                        aria-label={`Remove ${slot.label}`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </>
                ) : null}
                <div>
                  <span>{slot.label}</span>
                  <strong>{slot.item.title}</strong>
                  <small>{slot.item.year || "Unknown year"} · {slot.item.userRating ? `${slot.item.userRating}/5 from you` : `${slot.item.rating.toFixed(1)} score`}</small>
                </div>
              </div>
            ) : (
              <div
                key={slot.key}
                className="featured-favorite-card featured-favorite-empty glass"
                onClick={() => viewingOwnProfile && setEditingTasteSlot(slot.key as TasteSlotKey)}
              >
                <div className="taste-empty-inner">
                  <div className="taste-empty-icon">+</div>
                  <span>{slot.label}</span>
                  <strong>{viewingOwnProfile ? "Add a favorite" : "Not set yet"}</strong>
                </div>
              </div>
            )
          ))}
        </div>
        {editingTasteSlot ? (
          <TasteCardSearchModal
            slot={editingTasteSlot}
            onSelect={(item) => handlePinFavorite(editingTasteSlot, item)}
            onClose={() => setEditingTasteSlot(null)}
          />
        ) : null}
      </section>

      <section id="profile-friends" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Friends</p>
            <h2 className="headline">{viewingOwnProfile ? "Your people" : `${viewedProfile.name}'s friends`}</h2>
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
                    <span className="folder-row-avatar folder-row-avatar-fallback">{friend.name.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="folder-row-copy">
                    <strong>{friend.name}</strong>
                    <span className="muted">{friend.handle}</span>
                  </div>
                </Link>
                {viewingOwnProfile ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ padding: "4px 12px", fontSize: "0.8rem", flexShrink: 0 }}
                    onClick={() => { if (confirm(`Remove ${friend.name} as a friend?`)) { void removeFriend(friend.id); } }}
                  >
                    Unfriend
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="folder-empty glass">
              <p className="headline">No friends yet.</p>
              <p className="copy">Use the centered search to find people and send requests.</p>
            </div>
          )}
        </div>
      </section>

      <section id="profile-watched" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Watched / Played</p>
            <h2 className="headline">{viewingOwnProfile ? "Your Media Library" : "Visible media library"}</h2>
          </div>
          <div className="library-controls profile-library-controls">
            <div className="library-control-block">
              <p className="eyebrow">Media</p>
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
              <p className="eyebrow">Sort</p>
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
                  <CatalogCard key={item.id} item={item} priority={index < 8} showUserRatingBelow />
                ))}
              </div>
              {renderMediaPager(watchedPage, watchedTotalPages, setWatchedPage, "Watched")}
            </>
          ) : (
            <div className="folder-empty glass">
              <p className="headline">Nothing logged in this view yet.</p>
            </div>
          )
        ) : (
          <div className="folder-empty glass">
            <p className="headline">Private shelf.</p>
            <p className="copy">This watched library is not visible to you.</p>
          </div>
        )}
      </section>

      <section id="profile-wishlist" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Wishlist</p>
            <h2 className="headline">{viewingOwnProfile ? "Waiting for the right night" : "Visible wishlist"}</h2>
          </div>
          <div className="library-controls profile-library-controls">
            <div className="library-control-block">
              <p className="eyebrow">Media</p>
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
              <p className="eyebrow">Sort</p>
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
              {renderMediaPager(wishlistPage, wishlistTotalPages, setWishlistPage, "Wishlist")}
            </>
          ) : (
            <div className="folder-empty glass">
              <p className="headline">Nothing in wishlist for this view.</p>
            </div>
          )
        ) : (
          <div className="folder-empty glass">
            <p className="headline">Private shelf.</p>
            <p className="copy">This wishlist is hidden right now.</p>
          </div>
        )}
      </section>

      <section id="profile-lists" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Lists</p>
            <h2 className="headline">{viewingOwnProfile ? "Your curated lists" : `${viewedProfile.name}'s lists`}</h2>
          </div>
        </div>
        <ListsWorkspace
          lists={lists}
          viewingOwnProfile={viewingOwnProfile}
          viewedUserId={viewedUserId}
        />
      </section>

      <ImageAdjusterModal
        file={avatarFile}
        title="Adjust profile image"
        onClose={() => setAvatarFile(null)}
        onApply={(dataUrl) => void handleApplyAvatar(dataUrl)}
      />
    </main>
  );
}
