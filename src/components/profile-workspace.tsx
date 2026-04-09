"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { LibraryState, StoredFolder, readLibraryState, subscribeLibraryChanges, updateFolder } from "@/lib/library-storage";
import {
  PrivacyLevel,
  SocialProfile,
  canViewPrivacy,
  ensureViewerProfile,
  getFriends,
  getProfileById,
  subscribeSocialChanges,
  updateSocialProfile,
} from "@/lib/social-storage";
import { MediaItem } from "@/lib/types";
import { readFileAsDataUrl } from "@/lib/read-file-as-data-url";

type FolderSortMode = "recent" | "title" | "rating" | "random";
type LibrarySortMode = "recent" | "title" | "rating" | "random";
type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";

function sortMediaItems(items: MediaItem[], mode: LibrarySortMode) {
  const sorted = [...items];

  switch (mode) {
    case "title":
      return sorted.sort((left, right) => left.title.localeCompare(right.title));
    case "rating":
      return sorted.sort((left, right) => right.rating - left.rating || right.year - left.year);
    case "random":
      return sorted
        .map((item, index) => ({
          item,
          key: Math.sin(index + item.title.length + item.year + item.rating) * 10000,
        }))
        .sort((left, right) => left.key - right.key)
        .map((entry) => entry.item);
    default:
      return sorted.sort((left, right) => right.year - left.year || right.rating - left.rating);
  }
}

function filterMediaItems(items: MediaItem[], mode: MediaFilterMode) {
  if (mode === "all") return items;
  return items.filter((item) => item.type === mode);
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

function sortOptions() {
  return [
    { value: "recent", label: "Newest" },
    { value: "title", label: "A-Z" },
    { value: "rating", label: "Top rated" },
    { value: "random", label: "Random" },
  ] as Array<{ value: LibrarySortMode; label: string }>;
}

const PROFILE_PAGE_SIZE = 12;
const PROFILE_SHOWCASE_MEDIA_LIMIT = 18;
const PROFILE_SHOWCASE_FOLDER_LIMIT = 10;
const PROFILE_SHOWCASE_FOLDER_ITEMS_LIMIT = 10;

function pageCountFor(items: MediaItem[]) {
  return Math.max(1, Math.ceil(items.length / PROFILE_PAGE_SIZE));
}

function pageSlice(items: MediaItem[], page: number) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * PROFILE_PAGE_SIZE;
  return items.slice(start, start + PROFILE_PAGE_SIZE);
}

function compactShowcaseMedia(item: MediaItem): MediaItem {
  return {
    ...item,
    overview: item.overview.slice(0, 140),
    screenshots: [],
    credits: [],
  };
}

function compactShowcaseFolder(folder: StoredFolder): StoredFolder {
  return {
    ...folder,
    items: folder.items.slice(0, PROFILE_SHOWCASE_FOLDER_ITEMS_LIMIT).map(compactShowcaseMedia),
  };
}

function mediaSignature(items: MediaItem[]) {
  return items
    .map((item) => `${item.source}-${item.sourceId}-${item.title}-${item.year}-${item.rating}`)
    .join("|");
}

function folderSignature(folders: StoredFolder[]) {
  return folders
    .map((folder) => `${folder.id}:${folder.name}:${folder.description ?? ""}:${folder.items.map((item) => `${item.source}-${item.sourceId}`).join(",")}`)
    .join("|");
}

export function ProfileWorkspace({
  userName,
  viewerId,
  viewerAvatar,
  isDemo,
}: {
  userName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
}) {
  const [library, setLibrary] = useState<LibraryState>(readLibraryState());
  const [viewerProfile, setViewerProfile] = useState<SocialProfile | null>(null);
  const [viewedProfile, setViewedProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [draftAvatar, setDraftAvatar] = useState("");
  const [draftWatchedVisibility, setDraftWatchedVisibility] = useState<PrivacyLevel>("public");
  const [draftWishlistVisibility, setDraftWishlistVisibility] = useState<PrivacyLevel>("friends");
  const [draftFoldersVisibility, setDraftFoldersVisibility] = useState<PrivacyLevel>("public");
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [draftFolderName, setDraftFolderName] = useState("");
  const [draftFolderDescription, setDraftFolderDescription] = useState("");
  const [draftFolderCover, setDraftFolderCover] = useState("");
  const [draftFolderVisibility, setDraftFolderVisibility] = useState<PrivacyLevel>("public");
  const [folderSort, setFolderSort] = useState<FolderSortMode>("recent");
  const [folderMediaFilter, setFolderMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedSort, setWatchedSort] = useState<LibrarySortMode>("recent");
  const [wishlistSort, setWishlistSort] = useState<LibrarySortMode>("recent");
  const [watchedMediaFilter, setWatchedMediaFilter] = useState<MediaFilterMode>("all");
  const [wishlistMediaFilter, setWishlistMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedSearch, setWatchedSearch] = useState("");
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [watchedPage, setWatchedPage] = useState(1);
  const [wishlistPage, setWishlistPage] = useState(1);
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get("folder");
  const viewedUserId = searchParams.get("user") || viewerId;
  const viewingOwnProfile = viewedUserId === viewerId;
  const compactWatchedShowcase = useMemo(
    () => library.watched.slice(0, PROFILE_SHOWCASE_MEDIA_LIMIT).map(compactShowcaseMedia),
    [library.watched],
  );
  const compactWishlistShowcase = useMemo(
    () => library.wishlist.slice(0, PROFILE_SHOWCASE_MEDIA_LIMIT).map(compactShowcaseMedia),
    [library.wishlist],
  );
  const compactFolderShowcase = useMemo(
    () => library.folders.slice(0, PROFILE_SHOWCASE_FOLDER_LIMIT).map(compactShowcaseFolder),
    [library.folders],
  );
  const compactWatchedSignature = useMemo(() => mediaSignature(compactWatchedShowcase), [compactWatchedShowcase]);
  const compactWishlistSignature = useMemo(() => mediaSignature(compactWishlistShowcase), [compactWishlistShowcase]);
  const compactFolderSignature = useMemo(() => folderSignature(compactFolderShowcase), [compactFolderShowcase]);
  const [lastShowcaseSync, setLastShowcaseSync] = useState("");

  useEffect(() => {
    function sync() {
      const currentLibrary = readLibraryState();
      const currentViewer = ensureViewerProfile(viewerId, userName, viewerAvatar);
      const currentViewed = getProfileById(viewedUserId) ?? currentViewer;

      setLibrary(currentLibrary);
      setViewerProfile(currentViewer);
      setViewedProfile(currentViewed);
      setFriends(getFriends(viewerId));
      setDraftAvatar(currentViewer.avatarUrl ?? "");
      setDraftWatchedVisibility(currentViewer.watchedVisibility);
      setDraftWishlistVisibility(currentViewer.wishlistVisibility);
      setDraftFoldersVisibility(currentViewer.foldersDefaultVisibility);
    }

    sync();
    const unsubscribeLibrary = subscribeLibraryChanges(sync);
    const unsubscribeSocial = subscribeSocialChanges(sync);
    return () => {
      unsubscribeLibrary();
      unsubscribeSocial();
    };
  }, [userName, viewedUserId, viewerAvatar, viewerId]);

  useEffect(() => {
    if (!viewingOwnProfile) return;
    const nextSignature = `${compactWatchedSignature}__${compactWishlistSignature}__${compactFolderSignature}`;
    if (!nextSignature || nextSignature === lastShowcaseSync) {
      return;
    }
    updateSocialProfile(viewerId, {
      showcaseWatched: compactWatchedShowcase,
      showcaseWishlist: compactWishlistShowcase,
      showcaseFolders: compactFolderShowcase,
    });
    setLastShowcaseSync(nextSignature);
  }, [
    compactFolderShowcase,
    compactFolderSignature,
    compactWatchedShowcase,
    compactWatchedSignature,
    compactWishlistShowcase,
    compactWishlistSignature,
    lastShowcaseSync,
    viewerId,
    viewingOwnProfile,
  ]);

  const canSeeWatched = viewedProfile ? canViewPrivacy(viewedProfile, viewerId, viewedProfile.watchedVisibility) : false;
  const canSeeWishlist = viewedProfile ? canViewPrivacy(viewedProfile, viewerId, viewedProfile.wishlistVisibility) : false;

  const watched = viewingOwnProfile
    ? library.watched
    : canSeeWatched
      ? viewedProfile?.showcaseWatched ?? []
      : [];
  const wishlist = viewingOwnProfile
    ? library.wishlist
    : canSeeWishlist
      ? viewedProfile?.showcaseWishlist ?? []
      : [];

  const folders = useMemo(() => {
    if (!viewedProfile) return [] as StoredFolder[];
    if (viewingOwnProfile) return library.folders;

    return viewedProfile.showcaseFolders.filter((folder) => {
      const visibility = viewedProfile.folderVisibility[folder.id] ?? viewedProfile.foldersDefaultVisibility;
      return canViewPrivacy(viewedProfile, viewerId, visibility);
    });
  }, [library.folders, viewedProfile, viewerId, viewingOwnProfile]);

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const currentFolderVisibility =
    selectedFolder && viewerProfile
      ? viewerProfile.folderVisibility[selectedFolder.id] ?? viewerProfile.foldersDefaultVisibility
      : "public";

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setDraftAvatar(dataUrl);
  }

  async function handleFolderCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setDraftFolderCover(dataUrl);
  }

  function saveProfileSettings() {
    updateSocialProfile(viewerId, {
      avatarUrl: draftAvatar,
      watchedVisibility: draftWatchedVisibility,
      wishlistVisibility: draftWishlistVisibility,
      foldersDefaultVisibility: draftFoldersVisibility,
    });
  }

  function handleOpenEditFolder() {
    if (!selectedFolder) return;
    setDraftFolderName(selectedFolder.name);
    setDraftFolderDescription(selectedFolder.description ?? "");
    setDraftFolderCover(selectedFolder.coverUrl ?? "");
    setDraftFolderVisibility(currentFolderVisibility);
    setIsEditingFolder(true);
  }

  function handleSaveFolder() {
    if (!selectedFolder || !viewingOwnProfile || !viewerProfile) return;

    updateFolder(selectedFolder.id, {
      name: draftFolderName,
      description: draftFolderDescription,
      coverUrl: draftFolderCover,
    });

    updateSocialProfile(viewerId, {
      folderVisibility: {
        ...viewerProfile.folderVisibility,
        [selectedFolder.id]: draftFolderVisibility,
      },
    });

    setIsEditingFolder(false);
  }

  const headlineCopy = viewingOwnProfile
    ? isDemo
      ? "This browser is your local vault right now. The social layer already works locally and can move to real accounts next."
      : "Your library now has profile identity, friends, inbox, and privacy controls layered into the catalog."
    : viewedProfile?.bio || "A friend profile inside NerdVault.";

  const sortedFolderItems = useMemo(() => {
    if (!selectedFolder) return [] as MediaItem[];
    return sortMediaItems(filterMediaItems(selectedFolder.items, folderMediaFilter), folderSort);
  }, [folderMediaFilter, folderSort, selectedFolder]);

  const sortedWatched = useMemo(
    () =>
      sortMediaItems(
        filterMediaItems(watched, watchedMediaFilter).filter((item) =>
          `${item.title} ${item.originalTitle ?? ""} ${item.genres.join(" ")}`.toLowerCase().includes(watchedSearch.trim().toLowerCase()),
        ),
        watchedSort,
      ),
    [watched, watchedMediaFilter, watchedSearch, watchedSort],
  );

  const sortedWishlist = useMemo(
    () =>
      sortMediaItems(
        filterMediaItems(wishlist, wishlistMediaFilter).filter((item) =>
          `${item.title} ${item.originalTitle ?? ""} ${item.genres.join(" ")}`.toLowerCase().includes(wishlistSearch.trim().toLowerCase()),
        ),
        wishlistSort,
      ),
    [wishlist, wishlistMediaFilter, wishlistSearch, wishlistSort],
  );

  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) =>
        `${folder.name} ${folder.description ?? ""} ${folder.items.map((item) => item.title).join(" ")}`
          .toLowerCase()
          .includes(folderSearch.trim().toLowerCase()),
      ),
    [folderSearch, folders],
  );

  useEffect(() => {
    setWatchedPage(1);
  }, [watchedMediaFilter, watchedSearch, watchedSort, viewedUserId]);

  useEffect(() => {
    setWishlistPage(1);
  }, [wishlistMediaFilter, wishlistSearch, wishlistSort, viewedUserId]);

  const watchedPageCount = pageCountFor(sortedWatched);
  const wishlistPageCount = pageCountFor(sortedWishlist);
  const visibleWatched = pageSlice(sortedWatched, Math.min(watchedPage, watchedPageCount));
  const visibleWishlist = pageSlice(sortedWishlist, Math.min(wishlistPage, wishlistPageCount));

  if (selectedFolder) {
    const folder = selectedFolder;
    const folderItems = sortedFolderItems;

    return (
      <main className="workspace">
        <section className="workspace-hero glass folder-hero">
          <div className="folder-hero-media" style={getFolderBackdropStyle(folder.coverUrl)} />
          <div className="workspace-hero-grid">
            <div className="workspace-copy">
              <div className="folder-hero-topbar">
                <div className="folder-hero-title-group">
                  <div className="folder-hero-cover-card" style={getFolderBackdropStyle(folder.coverUrl)} />
                  <div className="folder-hero-copy">
                    <p className="eyebrow">Folder view</p>
                    <h1 className="display" style={{ fontSize: "clamp(3.2rem, 7vw, 5.8rem)" }}>
                      {folder.name}
                    </h1>
                    <p className="copy folder-hero-subcopy">
                      {viewingOwnProfile ? "Your shelf" : "Public shelf"} - {folderItems.length} saved picks
                    </p>
                  </div>
                </div>
                {viewingOwnProfile ? (
                  <button type="button" className="button button-secondary folder-edit-button" onClick={handleOpenEditFolder}>
                    Edit folder
                  </button>
                ) : null}
              </div>

              <p className="copy">
                {folder.description?.trim()
                  ? folder.description
                  : folderItems.length
                    ? `${folderItems.length} saved picks in this shelf.`
                  : "This folder is ready, but still empty."}
              </p>

              {isEditingFolder ? (
                <div className="folder-edit-panel glass">
                  <input
                    className="search-input folder-edit-input"
                    type="text"
                    placeholder="Folder name"
                    value={draftFolderName}
                    onChange={(event) => setDraftFolderName(event.target.value)}
                  />
                  <textarea
                    className="search-input folder-edit-input folder-description-input"
                    placeholder="Optional description so this folder is easier to remember later"
                    value={draftFolderDescription}
                    onChange={(event) => setDraftFolderDescription(event.target.value)}
                    rows={3}
                  />
                  <label className="upload-field folder-upload-field">
                    <span>Folder cover</span>
                    <div className="folder-upload-control">
                      <span className="button button-secondary folder-upload-button">Choose cover image</span>
                      <span className="folder-upload-name">{draftFolderCover ? "Cover image selected" : "PNG, JPG, or WEBP"}</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFolderCoverFileChange} />
                  </label>
                  <select
                    className="media-select"
                    value={draftFolderVisibility}
                    onChange={(event) => setDraftFolderVisibility(event.target.value as PrivacyLevel)}
                  >
                    {privacyOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="button-row">
                    <button type="button" className="button button-primary" onClick={handleSaveFolder}>
                      Save changes
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => setIsEditingFolder(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="button-row" style={{ marginTop: 18 }}>
                <Link href={viewingOwnProfile ? "/profile" : `/profile?user=${viewedUserId}`} className="button button-secondary">
                  Back to profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Inside folder</p>
              <h2 className="headline">Saved in {folder.name}</h2>
            </div>
            <div className="library-controls">
              <div className="library-control-block">
                <p className="eyebrow">Media</p>
                <div className="chip-row library-chip-row">
                  {mediaFilterOptions().map((option) => (
                    <button
                      key={`folder-media-${option.value}`}
                      type="button"
                      className={`picker-chip ${folderMediaFilter === option.value ? "is-active" : ""}`}
                      onClick={() => setFolderMediaFilter(option.value)}
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
                      key={`folder-sort-${option.value}`}
                      type="button"
                      className={`picker-chip ${folderSort === option.value ? "is-active" : ""}`}
                      onClick={() => setFolderSort(option.value as FolderSortMode)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {folderItems.length ? (
            <div className="catalog-grid">
              {folderItems.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
          ) : (
            <div className="folder-empty glass">
              <p className="headline">Nothing here yet.</p>
              <p className="copy">
                Open a media page, choose this folder, and the saved titles will show up here.
              </p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <section className="workspace-hero glass folder-hero">
        <div className="folder-hero-media" style={getFolderBackdropStyle(viewedProfile?.avatarUrl)} />
        <div className="workspace-hero-grid">
          <div className="workspace-copy">
            <div className="profile-hero-topbar">
              <div className="profile-identity">
                {viewingOwnProfile ? (
                  <label className="profile-avatar-edit" title="Change profile image">
                    {viewedProfile?.avatarUrl ? (
                      <img src={viewedProfile.avatarUrl} alt={viewedProfile.name} className="profile-avatar" />
                    ) : (
                      <span className="profile-avatar profile-avatar-fallback">
                        {(viewedProfile?.name || userName).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="profile-avatar-pencil" aria-hidden="true">✎</span>
                    <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
                  </label>
                ) : viewedProfile?.avatarUrl ? (
                  <img src={viewedProfile.avatarUrl} alt={viewedProfile.name} className="profile-avatar" />
                ) : (
                  <span className="profile-avatar profile-avatar-fallback">
                    {(viewedProfile?.name || userName).charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="eyebrow">{viewingOwnProfile ? (isDemo ? "Local vault" : "Your vault") : "Friend profile"}</p>
                  <h1 className="display profile-display">
                    {viewedProfile?.name || userName}
                  </h1>
                  <p className="copy profile-hero-subcopy">
                    {(viewedProfile?.handle || "@guest")} - {folders.length} folders - {watched.length} logged
                  </p>
                </div>
              </div>
            </div>
            <p className="copy">{headlineCopy}</p>
          </div>
        </div>
      </section>

      {viewingOwnProfile ? (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Profile settings</p>
              <h2 className="headline">{showProfileSettings ? "Shape your vault" : "Open settings only when you want to tweak your profile"}</h2>
            </div>
            <div className="button-row">
              <button
                type="button"
                className={`button ${showProfileSettings ? "button-secondary" : "button-primary"}`}
                onClick={() => setShowProfileSettings((current) => !current)}
              >
                {showProfileSettings ? "Hide profile settings" : "Profile settings"}
              </button>
            </div>
          </div>
          {showProfileSettings ? (
            <div className="info-panel glass profile-settings-layout">
              <div className="profile-settings-side">
                <div className="profile-settings-avatar-card">
                  {draftAvatar ? (
                    <img src={draftAvatar} alt="Profile preview" className="profile-avatar profile-avatar-large" />
                  ) : (
                    <span className="profile-avatar profile-avatar-fallback profile-avatar-large">
                      {(viewedProfile?.name || userName).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>Profile image</strong>
                    <p className="copy">Click your avatar above any time to swap it out.</p>
                  </div>
                </div>
              </div>
              <div className="profile-settings-main">
                <div className="privacy-setting-block">
                  <p className="eyebrow">Watched / Played</p>
                  <div className="picker-grid">
                    {privacyOptions().map((option) => (
                      <button
                        key={`watched-${option.value}`}
                        type="button"
                        className={`picker-chip ${draftWatchedVisibility === option.value ? "is-active" : ""}`}
                        onClick={() => setDraftWatchedVisibility(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="privacy-setting-block">
                  <p className="eyebrow">Wishlist</p>
                  <div className="picker-grid">
                    {privacyOptions().map((option) => (
                      <button
                        key={`wishlist-${option.value}`}
                        type="button"
                        className={`picker-chip ${draftWishlistVisibility === option.value ? "is-active" : ""}`}
                        onClick={() => setDraftWishlistVisibility(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="privacy-setting-block">
                  <p className="eyebrow">Folders</p>
                  <div className="picker-grid">
                    {privacyOptions().map((option) => (
                      <button
                        key={`folders-${option.value}`}
                        type="button"
                        className={`picker-chip ${draftFoldersVisibility === option.value ? "is-active" : ""}`}
                        onClick={() => setDraftFoldersVisibility(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="button-row">
                  <button type="button" className="button button-primary" onClick={saveProfileSettings}>
                    Save profile settings
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="info-panel glass profile-jump-shell">
          <div>
            <p className="eyebrow">Quick jump</p>
            <h2 className="headline profile-jump-title">Go straight to the part you came for</h2>
          </div>
          <div className="picker-grid">
            <a href="#profile-watched" className="picker-chip is-active">
              Watched / Played
            </a>
            <a href="#profile-wishlist" className="picker-chip">
              Wishlist
            </a>
            <a href="#profile-folders" className="picker-chip">
              Folders
            </a>
          </div>
        </div>
      </section>

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Friends</p>
            <h2 className="headline">{viewingOwnProfile ? "Your people" : `${viewedProfile?.name}'s friends`}</h2>
          </div>
        </div>
        <div className="folder-list">
          {friends.length ? (
            friends.map((friend) => (
              <Link key={friend.id} href={`/profile?user=${friend.id}`} className="folder-row glass">
                <div className="folder-row-main">
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
                </div>
              </Link>
            ))
          ) : (
            <div className="folder-empty glass">
              <p className="headline">No friends yet.</p>
              <p className="copy">Use the top-bar people search to start building your circle.</p>
            </div>
          )}
        </div>
      </section>

      <section id="profile-watched" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Watched / Played</p>
            <h2 className="headline">{viewingOwnProfile ? "Recently logged" : "Visible watched"}</h2>
          </div>
          <div className="library-controls">
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
                    onClick={() => setWatchedSort(option.value as LibrarySortMode)}
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
          <>
            <div className="catalog-grid">
              {visibleWatched.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
            <div className="bottom-pager glass profile-pager">
              <div className="pager-copy">
                <p className="eyebrow">Watched flow</p>
                <p className="copy">
                  {visibleWatched.length
                    ? `Page ${Math.min(watchedPage, watchedPageCount)} of ${watchedPageCount} for watched / played.`
                    : "Nothing logged in this filtered view yet."}
                </p>
              </div>
              <div className="pager-actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setWatchedPage((current) => Math.max(1, current - 1))}
                  disabled={watchedPage <= 1}
                >
                  Previous page
                </button>
                <div className="page-indicator">
                  <span>{Math.min(watchedPage, watchedPageCount)}</span>
                  <span>/</span>
                  <span>{watchedPageCount}</span>
                </div>
                <button
                  type="button"
                  className="chip is-active"
                  onClick={() => setWatchedPage((current) => Math.min(watchedPageCount, current + 1))}
                  disabled={watchedPage >= watchedPageCount}
                >
                  Next page
                </button>
              </div>
            </div>
          </>
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
          <div className="library-controls">
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
                    onClick={() => setWishlistSort(option.value as LibrarySortMode)}
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
          <>
            <div className="catalog-grid">
              {visibleWishlist.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
            <div className="bottom-pager glass profile-pager">
              <div className="pager-copy">
                <p className="eyebrow">Wishlist flow</p>
                <p className="copy">
                  {visibleWishlist.length
                    ? `Page ${Math.min(wishlistPage, wishlistPageCount)} of ${wishlistPageCount} for wishlist.`
                    : "Nothing waiting in this filtered view yet."}
                </p>
              </div>
              <div className="pager-actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setWishlistPage((current) => Math.max(1, current - 1))}
                  disabled={wishlistPage <= 1}
                >
                  Previous page
                </button>
                <div className="page-indicator">
                  <span>{Math.min(wishlistPage, wishlistPageCount)}</span>
                  <span>/</span>
                  <span>{wishlistPageCount}</span>
                </div>
                <button
                  type="button"
                  className="chip is-active"
                  onClick={() => setWishlistPage((current) => Math.min(wishlistPageCount, current + 1))}
                  disabled={wishlistPage >= wishlistPageCount}
                >
                  Next page
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="folder-empty glass">
            <p className="headline">Private shelf.</p>
            <p className="copy">This wishlist is hidden right now.</p>
          </div>
        )}
      </section>

      <section id="profile-folders" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Folders</p>
            <h2 className="headline">{viewingOwnProfile ? "Mood shelves" : "Visible folders"}</h2>
          </div>
        </div>
        <input
          className="search-input library-search-input"
          type="search"
          placeholder="Search folders..."
          value={folderSearch}
          onChange={(event) => setFolderSearch(event.target.value)}
        />
        <div className="folder-showcase-grid">
          {visibleFolders.length ? (
            visibleFolders.map((folder) => (
              <Link
                key={folder.id}
                href={viewingOwnProfile ? `/profile?folder=${folder.id}` : `/profile?user=${viewedUserId}&folder=${folder.id}`}
                className="folder-showcase-card glass"
              >
                <div className="folder-showcase-art folder-showcase-art-compact" style={getFolderBackdropStyle(folder.coverUrl)} />
                <div className="folder-showcase-copy">
                  <div className="folder-showcase-meta">
                    <span className="folder-showcase-kicker">Playlist shelf</span>
                    <span className="folder-showcase-count">{folder.items.length} titles</span>
                  </div>
                  <div className="folder-showcase-title-row">
                    <strong>{folder.name}</strong>
                  </div>
                  <p className="copy folder-showcase-summary">
                    {folder.description?.trim()
                      ? folder.description
                      : folder.items.length
                      ? `Built around ${folder.items
                          .slice(0, 3)
                          .map((item) => item.title)
                          .join(", ")}${folder.items.length > 3 ? ", and more." : "."}`
                      : "A fresh shelf waiting for its first picks."}
                  </p>
                  <div className="folder-showcase-chip-row">
                    {folder.items.slice(0, 3).map((item) => (
                      <span key={`${folder.id}-${item.id}`} className="detail-pill folder-showcase-chip">
                        {item.title}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="folder-empty glass">
              <p className="headline">{folders.length ? "No folders match this search." : "No visible folders."}</p>
              <p className="copy">
                {folders.length
                  ? "Try another title or folder name."
                  : "Create one, or switch its visibility, and it will show here."}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
