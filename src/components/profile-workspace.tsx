"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { NVLoader } from "@/components/nv-loader";
import { MediaItem } from "@/lib/types";
import { deleteLibraryFolder, fetchProfilePayload, primeProfilePayload, saveFolder, saveProfileSettings, subscribeVaultChanges } from "@/lib/vault-client";
import { PrivacyLevel, SocialProfile, StoredFolder, VaultProfilePayload } from "@/lib/vault-types";

type LibrarySortMode = "recent" | "title" | "rating";
type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";
const PROFILE_MEDIA_PAGE_SIZE = 12;

function sortMediaItems(items: MediaItem[], mode: LibrarySortMode) {
  const sorted = [...items];

  switch (mode) {
    case "title":
      return sorted.sort((left, right) => left.title.localeCompare(right.title));
    case "rating":
      return sorted.sort((left, right) => right.rating - left.rating || right.year - left.year);
    default:
      return sorted.sort((left, right) => right.year - left.year || right.rating - left.rating);
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
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get("folder");
  const viewedUserId = searchParams.get("user") || viewerId;
  const [payload, setPayload] = useState<VaultProfilePayload>(initialPayload ?? emptyPayload(viewerId, userName, viewerAvatar));
  const [loading, setLoading] = useState(!initialPayload);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState(initialPayload?.viewerProfile.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [draftBio, setDraftBio] = useState(initialPayload?.viewerProfile.bio ?? "");
  const [draftWatchedVisibility, setDraftWatchedVisibility] = useState<PrivacyLevel>(initialPayload?.viewerProfile.watchedVisibility ?? "public");
  const [draftWishlistVisibility, setDraftWishlistVisibility] = useState<PrivacyLevel>(initialPayload?.viewerProfile.wishlistVisibility ?? "friends");
  const [draftFoldersVisibility, setDraftFoldersVisibility] = useState<PrivacyLevel>(initialPayload?.viewerProfile.foldersDefaultVisibility ?? "public");
  const [draftFolderName, setDraftFolderName] = useState("");
  const [draftFolderDescription, setDraftFolderDescription] = useState("");
  const [draftFolderCover, setDraftFolderCover] = useState("");
  const [folderCoverFile, setFolderCoverFile] = useState<File | null>(null);
  const [draftFolderVisibility, setDraftFolderVisibility] = useState<PrivacyLevel>("public");
  const [profileMessage, setProfileMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [watchedSort, setWatchedSort] = useState<LibrarySortMode>("recent");
  const [wishlistSort, setWishlistSort] = useState<LibrarySortMode>("recent");
  const [folderMediaFilter, setFolderMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedMediaFilter, setWatchedMediaFilter] = useState<MediaFilterMode>("all");
  const [wishlistMediaFilter, setWishlistMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedSearch, setWatchedSearch] = useState("");
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [watchedPage, setWatchedPage] = useState(1);
  const [wishlistPage, setWishlistPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFolderOpening, setIsFolderOpening] = useState(false);
  const profileSettingsRef = useRef<HTMLDivElement | null>(null);
  const profileAvatarActionsRef = useRef<HTMLDivElement | null>(null);
  const previousFolderIdRef = useRef<string | null>(selectedFolderId);

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
          setDraftBio(nextPayload.viewerProfile.bio ?? "");
          setDraftWatchedVisibility(nextPayload.viewerProfile.watchedVisibility);
          setDraftWishlistVisibility(nextPayload.viewerProfile.wishlistVisibility);
          setDraftFoldersVisibility(nextPayload.viewerProfile.foldersDefaultVisibility);
        })
        .finally(() => setLoading(false));
    }

    if (!initialPayload || viewedUserId !== initialPayload.viewedProfile.id) {
      void sync();
    }
    return subscribeVaultChanges(sync);
  }, [initialPayload, isDemo, viewedUserId, viewerAvatar, viewerId, userName]);

  const { viewerProfile, viewedProfile, friends, watched, wishlist, folders, canSeeWatched, canSeeWishlist, viewingOwnProfile } = payload;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);

  useEffect(() => {
    if (!selectedFolder) return;
    setDraftFolderName(selectedFolder.name);
    setDraftFolderDescription(selectedFolder.description ?? "");
    setDraftFolderCover(selectedFolder.coverUrl ?? "");
    setDraftFolderVisibility(selectedFolder.visibility);
  }, [selectedFolder]);

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  useEffect(() => {
    setWatchedPage(1);
  }, [viewedUserId, watchedMediaFilter, watchedSearch, watchedSort]);

  useEffect(() => {
    setWishlistPage(1);
  }, [viewedUserId, wishlistMediaFilter, wishlistSearch, wishlistSort]);

  useEffect(() => {
    if (!showProfileSettings) return;
    profileSettingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showProfileSettings]);

  useEffect(() => {
    const previousFolderId = previousFolderIdRef.current;
    previousFolderIdRef.current = selectedFolderId;

    if (!selectedFolderId || !selectedFolder || selectedFolderId === previousFolderId) {
      return;
    }

    setIsFolderOpening(true);
    const timeout = window.setTimeout(() => setIsFolderOpening(false), 520);
    return () => window.clearTimeout(timeout);
  }, [selectedFolder, selectedFolderId]);

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  }

  function handleFolderCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFolderCoverFile(file);
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    try {
      await saveProfileSettings({
        avatarUrl: draftAvatar,
        bio: draftBio,
        watchedVisibility: draftWatchedVisibility,
        wishlistVisibility: draftWishlistVisibility,
        foldersDefaultVisibility: draftFoldersVisibility,
      });
      setProfileMessage("Profile saved.");
      setShowProfileSettings(false);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveFolder() {
    if (!selectedFolder) return;
    await saveFolder(selectedFolder.id, {
      name: draftFolderName,
      description: draftFolderDescription,
      coverUrl: draftFolderCover,
      visibility: draftFolderVisibility,
    });
    setIsEditingFolder(false);
    setProfileMessage("Folder saved.");
  }

  async function handleDeleteFolder() {
    if (!selectedFolder) return;
    await deleteLibraryFolder(selectedFolder.id);
    setShowDeleteConfirm(false);
    setIsEditingFolder(false);
    setProfileMessage("Folder deleted.");
    window.location.href = viewingOwnProfile ? "/profile" : `/profile?user=${viewedUserId}`;
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

  const headlineCopy = viewingOwnProfile
    ? isDemo
      ? "Guest mode is browse-first now. Sign in when you want profile images, folders, friends, inbox, and saved library data to stay attached to your real account."
      : "Your profile, folders, and social activity now stay saved between visits."
    : viewedProfile.bio || "A friend profile inside NerdVault.";

  const deferredWatchedSearch = useDeferredValue(watchedSearch);
  const deferredWishlistSearch = useDeferredValue(wishlistSearch);
  const deferredFolderSearch = useDeferredValue(folderSearch);

  const sortedWatched = useMemo(
    () => sortMediaItems(filterMediaItems(watched, watchedMediaFilter, deferredWatchedSearch), watchedSort),
    [deferredWatchedSearch, watched, watchedMediaFilter, watchedSort],
  );
  const sortedWishlist = useMemo(
    () => sortMediaItems(filterMediaItems(wishlist, wishlistMediaFilter, deferredWishlistSearch), wishlistSort),
    [deferredWishlistSearch, wishlist, wishlistMediaFilter, wishlistSort],
  );
  const watchedTotalPages = Math.max(1, Math.ceil(sortedWatched.length / PROFILE_MEDIA_PAGE_SIZE));
  const wishlistTotalPages = Math.max(1, Math.ceil(sortedWishlist.length / PROFILE_MEDIA_PAGE_SIZE));
  const pagedWatched = useMemo(
    () => sortedWatched.slice((watchedPage - 1) * PROFILE_MEDIA_PAGE_SIZE, watchedPage * PROFILE_MEDIA_PAGE_SIZE),
    [sortedWatched, watchedPage],
  );
  const pagedWishlist = useMemo(
    () => sortedWishlist.slice((wishlistPage - 1) * PROFILE_MEDIA_PAGE_SIZE, wishlistPage * PROFILE_MEDIA_PAGE_SIZE),
    [sortedWishlist, wishlistPage],
  );
  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) =>
        `${folder.name} ${folder.description ?? ""} ${folder.items.map((item) => item.title).join(" ")}`.toLowerCase().includes(deferredFolderSearch.trim().toLowerCase()),
      ),
    [deferredFolderSearch, folders],
  );
  const filteredFolderItems = useMemo(
    () => (selectedFolder ? filterMediaItems(selectedFolder.items, folderMediaFilter, "") : []),
    [folderMediaFilter, selectedFolder],
  );

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

  if (selectedFolder) {
    if (isFolderOpening) {
      return (
        <main className="workspace">
          <section className="workspace-hero glass folder-hero folder-opening-shell">
            <div className="folder-opening-loader">
              <NVLoader label={`Opening ${selectedFolder.name}...`} />
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="workspace folder-page-reveal">
        <section className="workspace-hero glass folder-hero">
          <div className="folder-hero-media" style={getFolderBackdropStyle(selectedFolder.coverUrl)} />
          <div className="workspace-hero-grid">
            <div className="workspace-copy">
              <div className="folder-hero-topbar">
                <div className="folder-hero-title-group">
                  <div className="folder-hero-cover-card" style={getFolderBackdropStyle(selectedFolder.coverUrl)} />
                  <div className="folder-hero-copy">
                    <p className="eyebrow">Folder view</p>
                    <h1 className="display" style={{ fontSize: "clamp(3rem, 7vw, 5.4rem)" }}>
                      {selectedFolder.name}
                    </h1>
                    <p className="copy folder-hero-subcopy">
                      {selectedFolder.items.length} saved picks
                    </p>
                  </div>
                  {viewingOwnProfile ? (
                    <div className="folder-hero-actions">
                      <button type="button" className="button button-secondary folder-edit-button" onClick={() => setIsEditingFolder((current) => !current)}>
                        {isEditingFolder ? "Close edit" : "Edit folder"}
                      </button>
                      <button type="button" className="button button-secondary folder-delete-button" onClick={() => setShowDeleteConfirm(true)}>
                        Delete folder
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="copy">
                {selectedFolder.description?.trim() ? selectedFolder.description : "No description added for this folder yet."}
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
                    <button type="button" className="button button-primary" onClick={() => void handleSaveFolder()}>
                      Save changes
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => void handleDeleteFolder()}>
                      Delete folder
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

        {showDeleteConfirm ? (
          <div className="sidebar-modal-shell" onClick={() => setShowDeleteConfirm(false)}>
            <div className="sidebar-folder-modal glass delete-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <div className="sidebar-folder-modal-header">
                <div>
                  <strong>Delete folder?</strong>
                  <p className="copy">
                    {selectedFolder.name} will be removed from your vault. This cannot be undone.
                  </p>
                </div>
                <button type="button" className="topbar-panel-close" onClick={() => setShowDeleteConfirm(false)}>
                  Close
                </button>
              </div>
              <div className="button-row">
                <button type="button" className="button button-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Keep folder
                </button>
                <button type="button" className="button button-primary" onClick={() => void handleDeleteFolder()}>
                  Delete folder
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Inside folder</p>
              <h2 className="headline">Saved in {selectedFolder.name}</h2>
            </div>
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

          {filteredFolderItems.length ? (
            <div className="catalog-grid">
              {filteredFolderItems.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
          ) : (
            <div className="folder-empty glass">
              <p className="headline">Nothing in this view yet.</p>
              <p className="copy">Open a media page, choose this folder, and the saved titles will show up here.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <section className="workspace-hero glass folder-hero">
        <div className="folder-hero-media" style={getFolderBackdropStyle(viewedProfile.avatarUrl)} />
        <div className="workspace-hero-grid">
          <div className="workspace-copy">
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
                <div>
                  <p className="eyebrow">{viewingOwnProfile ? (isDemo ? "Local vault" : "Your vault") : "Friend profile"}</p>
                  <h1 className="display profile-display">{viewedProfile.name || userName}</h1>
                  <p className="copy profile-hero-subcopy">
                    {viewedProfile.handle} - {folders.length} folders - {watched.length} logged
                  </p>
                </div>
              </div>
            </div>
            <p className="copy">{loading ? "Loading your saved profile..." : headlineCopy}</p>
            {profileMessage ? <p className="media-action-message">{profileMessage}</p> : null}
          </div>
        </div>
      </section>

      {viewingOwnProfile ? (
        <section className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Profile settings</p>
              <h2 className="headline">{showProfileSettings ? "Shape your vault" : "Open settings when you want to tweak your profile"}</h2>
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
            <div className="info-panel glass profile-settings-layout" ref={profileSettingsRef}>
              <div className="profile-settings-side">
                <div className="profile-settings-avatar-card">
                  {draftAvatar ? (
                    <img src={draftAvatar} alt="Profile preview" className="profile-avatar profile-avatar-large" />
                  ) : (
                    <span className="profile-avatar profile-avatar-fallback profile-avatar-large">{(viewedProfile.name || userName).charAt(0).toUpperCase()}</span>
                  )}
                  <div>
                    <strong>Profile image</strong>
                    <p className="copy">Images now persist in the database, so your avatar stays put after refresh.</p>
                  </div>
                </div>
              </div>
              <div className="profile-settings-main">
                <textarea
                  className="search-input folder-description-input"
                  placeholder="Bio"
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                  rows={3}
                />

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
                  <button type="button" className="button button-primary" onClick={() => void handleSaveProfile()} disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving..." : "Save profile settings"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="profile-jump-section">
            <div className="profile-jump-copy">
              <p className="eyebrow">Quick shortcuts</p>
              <p className="copy">Here's the quick shortcut to where you wanna go.</p>
            </div>
            <div className="profile-jump-row profile-jump-row-outside">
              <a href="#profile-watched" className="button button-secondary profile-jump-button">Watched</a>
              <a href="#profile-wishlist" className="button button-secondary profile-jump-button">Wishlist</a>
              <a href="#profile-folders" className="button button-secondary profile-jump-button">Folders</a>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">Friends</p>
            <h2 className="headline">{viewingOwnProfile ? "Your people" : `${viewedProfile.name}'s friends`}</h2>
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
                    <span className="folder-row-avatar folder-row-avatar-fallback">{friend.name.charAt(0).toUpperCase()}</span>
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
              <p className="copy">Use the centered search to find people and send requests.</p>
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
              <div className="catalog-grid profile-media-grid">
                {pagedWatched.map((item, index) => (
                  <CatalogCard key={item.id} item={item} priority={index < 8} />
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
              <div className="catalog-grid profile-media-grid">
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
            visibleFolders.map((folder: StoredFolder) => (
              <Link
                key={folder.id}
                href={viewingOwnProfile ? `/profile?folder=${folder.id}` : `/profile?user=${viewedUserId}&folder=${folder.id}`}
                className="folder-showcase-card glass"
                prefetch={false}
              >
                <div className="folder-showcase-art folder-showcase-art-compact" style={getFolderBackdropStyle(folder.coverUrl)} />
                <div className="folder-showcase-copy">
                  <div className="folder-showcase-meta">
                    <span className="folder-showcase-kicker">{folder.visibility}</span>
                    <span className="folder-showcase-count">{folder.items.length} titles</span>
                  </div>
                  <div className="folder-showcase-title-row">
                    <strong>{folder.name}</strong>
                  </div>
                  <p className="copy folder-showcase-summary">
                    {folder.description?.trim()
                      ? folder.description
                      : folder.items.length
                        ? `Built around ${folder.items.slice(0, 3).map((item) => item.title).join(", ")}${folder.items.length > 3 ? ", and more." : "."}`
                        : "A fresh shelf waiting for its first picks."}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="folder-empty glass">
              <p className="headline">{folders.length ? "No folders match this search." : "No visible folders."}</p>
              <p className="copy">
                {folders.length ? "Try another title or folder name." : "Create one, or switch its visibility, and it will show here."}
              </p>
            </div>
          )}
        </div>
      </section>

      <ImageAdjusterModal
        file={avatarFile}
        title="Adjust profile image"
        onClose={() => setAvatarFile(null)}
        onApply={(dataUrl) => void handleApplyAvatar(dataUrl)}
      />

      <ImageAdjusterModal
        file={folderCoverFile}
        title="Adjust folder cover"
        onClose={() => setFolderCoverFile(null)}
        onApply={(dataUrl) => setDraftFolderCover(dataUrl)}
      />
    </main>
  );
}
