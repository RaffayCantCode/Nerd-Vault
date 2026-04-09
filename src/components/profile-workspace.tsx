"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { readFileAsDataUrl } from "@/lib/read-file-as-data-url";
import { MediaItem } from "@/lib/types";
import { fetchProfilePayload, saveFolder, saveProfileSettings, subscribeVaultChanges } from "@/lib/vault-client";
import { PrivacyLevel, SocialProfile, StoredFolder, VaultProfilePayload } from "@/lib/vault-types";

type LibrarySortMode = "recent" | "title" | "rating";
type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";

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
}: {
  userName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
}) {
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get("folder");
  const viewedUserId = searchParams.get("user") || viewerId;
  const [payload, setPayload] = useState<VaultProfilePayload>(emptyPayload(viewerId, userName, viewerAvatar));
  const [loading, setLoading] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftWatchedVisibility, setDraftWatchedVisibility] = useState<PrivacyLevel>("public");
  const [draftWishlistVisibility, setDraftWishlistVisibility] = useState<PrivacyLevel>("friends");
  const [draftFoldersVisibility, setDraftFoldersVisibility] = useState<PrivacyLevel>("public");
  const [draftFolderName, setDraftFolderName] = useState("");
  const [draftFolderDescription, setDraftFolderDescription] = useState("");
  const [draftFolderCover, setDraftFolderCover] = useState("");
  const [draftFolderVisibility, setDraftFolderVisibility] = useState<PrivacyLevel>("public");
  const [watchedSort, setWatchedSort] = useState<LibrarySortMode>("recent");
  const [wishlistSort, setWishlistSort] = useState<LibrarySortMode>("recent");
  const [folderMediaFilter, setFolderMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedMediaFilter, setWatchedMediaFilter] = useState<MediaFilterMode>("all");
  const [wishlistMediaFilter, setWishlistMediaFilter] = useState<MediaFilterMode>("all");
  const [watchedSearch, setWatchedSearch] = useState("");
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");

  useEffect(() => {
    if (isDemo) {
      setPayload(emptyPayload(viewerId, userName, viewerAvatar));
      setLoading(false);
      return;
    }

    function sync() {
      setLoading(true);
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

    sync();
    return subscribeVaultChanges(sync);
  }, [isDemo, viewedUserId, viewerAvatar, viewerId, userName]);

  const { viewerProfile, viewedProfile, friends, watched, wishlist, folders, canSeeWatched, canSeeWishlist, viewingOwnProfile } = payload;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);

  useEffect(() => {
    if (!selectedFolder) return;
    setDraftFolderName(selectedFolder.name);
    setDraftFolderDescription(selectedFolder.description ?? "");
    setDraftFolderCover(selectedFolder.coverUrl ?? "");
    setDraftFolderVisibility(selectedFolder.visibility);
  }, [selectedFolder]);

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

  async function handleSaveProfile() {
    await saveProfileSettings({
      avatarUrl: draftAvatar,
      bio: draftBio,
      watchedVisibility: draftWatchedVisibility,
      wishlistVisibility: draftWishlistVisibility,
      foldersDefaultVisibility: draftFoldersVisibility,
    });
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
  }

  const headlineCopy = viewingOwnProfile
    ? isDemo
      ? "Guest mode is browse-first now. Sign in when you want profile images, folders, friends, inbox, and saved library data to stay attached to your real account."
      : "Your profile, folders, and social activity now stay saved between visits."
    : viewedProfile.bio || "A friend profile inside NerdVault.";

  const sortedWatched = useMemo(
    () => sortMediaItems(filterMediaItems(watched, watchedMediaFilter, watchedSearch), watchedSort),
    [watched, watchedMediaFilter, watchedSearch, watchedSort],
  );
  const sortedWishlist = useMemo(
    () => sortMediaItems(filterMediaItems(wishlist, wishlistMediaFilter, wishlistSearch), wishlistSort),
    [wishlist, wishlistMediaFilter, wishlistSearch, wishlistSort],
  );
  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) =>
        `${folder.name} ${folder.description ?? ""} ${folder.items.map((item) => item.title).join(" ")}`.toLowerCase().includes(folderSearch.trim().toLowerCase()),
      ),
    [folderSearch, folders],
  );
  const filteredFolderItems = useMemo(
    () => (selectedFolder ? filterMediaItems(selectedFolder.items, folderMediaFilter, "") : []),
    [folderMediaFilter, selectedFolder],
  );

  if (selectedFolder) {
    return (
      <main className="workspace">
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
                </div>
                {viewingOwnProfile ? (
                  <button type="button" className="button button-secondary folder-edit-button" onClick={() => setIsEditingFolder((current) => !current)}>
                    {isEditingFolder ? "Close edit" : "Edit folder"}
                  </button>
                ) : null}
              </div>

              <p className="copy">
                {selectedFolder.description?.trim() ? selectedFolder.description : "This folder is ready for the titles you want to revisit later."}
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
                  <label className="profile-avatar-edit" title="Change profile image">
                    {draftAvatar ? (
                      <img src={draftAvatar} alt={viewedProfile.name} className="profile-avatar" />
                    ) : (
                      <span className="profile-avatar profile-avatar-fallback">{(viewedProfile.name || userName).charAt(0).toUpperCase()}</span>
                    )}
                    <span className="profile-avatar-pencil" aria-hidden="true">Edit</span>
                    <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
                  </label>
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
            <div className="info-panel glass profile-settings-layout">
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
                  <button type="button" className="button button-primary" onClick={() => void handleSaveProfile()}>
                    Save profile settings
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
            <div className="catalog-grid">
              {sortedWatched.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
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
            <div className="catalog-grid">
              {sortedWishlist.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
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
    </main>
  );
}
