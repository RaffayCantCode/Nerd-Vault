"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { MediaItem } from "@/lib/types";
import {
  addMediaToFolder,
  addMediaToWatched,
  addMediaToWishlist,
  createLibraryFolder,
  fetchLibraryState,
  fetchProfilePayload,
  recommendToFriend,
  removeMediaFromFolder,
  removeMediaFromWatched,
  removeMediaFromWishlist,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { SocialProfile, StoredFolder } from "@/lib/vault-types";

export function MediaActions({ item, viewerId }: { item: MediaItem; viewerId: string }) {
  const isGuest = viewerId === "guest-vault";
  const [isWatched, setIsWatched] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderCover, setFolderCover] = useState("");
  const [folderCoverFile, setFolderCoverFile] = useState<File | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const [folders, setFolders] = useState<StoredFolder[]>([]);
  const [friends, setFriends] = useState<SocialProfile[]>([]);

  const primaryLabel = item.type === "game" ? "Played" : "Watched";

  useEffect(() => {
    if (isGuest) {
      setFolders([]);
      setFriends([]);
      setIsWatched(false);
      setIsWishlisted(false);
      return;
    }

    function sync() {
      fetchLibraryState()
        .then((library) => {
          setFolders(library.folders);
          setIsWatched(library.watched.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId));
          setIsWishlisted(library.wishlist.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId));
        })
        .catch(() => {
          setFolders([]);
          setIsWatched(false);
          setIsWishlisted(false);
        });

      fetchProfilePayload()
        .then((payload) => setFriends(payload.friends))
        .catch(() => setFriends([]));
    }

    sync();
    const unsubscribe = subscribeVaultChanges(sync);
    return () => unsubscribe();
  }, [isGuest, item.source, item.sourceId, viewerId]);

  if (isGuest) {
    return (
      <div className="media-actions">
        <div className="media-action-surface glass">
          <div className="media-action-section">
            <p className="eyebrow">Save to your vault</p>
            <p className="copy">Guest browse is now read-only so account data stays private and separate. Sign in to log watched, wishlist, folders, profile image, friends, and inbox activity properly.</p>
            <div className="button-row" style={{ marginTop: 16 }}>
              <Link href="/sign-in" className="button button-primary">
                Sign in to save
              </Link>
              <Link href="/browse" className="button button-secondary">
                Keep browsing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const folderOptions = useMemo(() => folders, [folders]);
  const selectedFolder = folderOptions.find((folder) => folder.id === folderId);
  const selectedFolderContainsItem = selectedFolder?.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId) ?? false;

  async function handleWatched() {
    if (isWatched) {
      await removeMediaFromWatched(item);
      setMessage(`${item.title} removed from ${primaryLabel.toLowerCase()}.`);
      return;
    }

    await addMediaToWatched(item);
    setMessage(`${item.title} added to ${primaryLabel.toLowerCase()}.`);
  }

  async function handleWishlist() {
    if (isWishlisted) {
      await removeMediaFromWishlist(item);
      setMessage(`${item.title} removed from wishlist.`);
      return;
    }

    await addMediaToWishlist(item);
    setMessage(`${item.title} added to wishlist.`);
  }

  async function handleFolderToggle() {
    if (!folderId) return;

    if (selectedFolderContainsItem) {
      await removeMediaFromFolder(folderId, item);
      setMessage(`Removed from ${selectedFolder?.name ?? "folder"}.`);
      return;
    }

    await addMediaToFolder(folderId, item);
    setMessage(`Added to ${selectedFolder?.name ?? "folder"}.`);
  }

  async function handleCreateFolder() {
    await createLibraryFolder({
      name: folderName,
      description: folderDescription,
      coverUrl: folderCover,
    });
    setFolderName("");
    setFolderDescription("");
    setFolderCover("");
    setIsCreatingFolder(false);
    setMessage(`Created ${folderName.trim()}.`);
  }

  function handleFolderCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFolderCoverFile(file);
  }

  async function handleRecommend() {
    if (!friendId) return;
    await recommendToFriend(friendId, item);
    const target = friends.find((friend) => friend.id === friendId);
    setMessage(`Sent ${item.title} to ${target?.name ?? "your friend"}.`);
    setFriendId("");
  }

  return (
    <div className="media-actions">
      <div className="media-action-surface glass">
        <div className="media-action-section">
          <p className="eyebrow">Library</p>
          <div className="button-row">
            <button
              className={`button button-primary ${isWatched ? "button-success" : ""}`}
              type="button"
              onClick={() => void handleWatched()}
            >
              {isWatched ? `Remove ${primaryLabel}` : `Mark as ${primaryLabel}`}
            </button>
            <button
              className={`button button-secondary ${isWishlisted ? "button-accent" : ""}`}
              type="button"
              onClick={() => void handleWishlist()}
            >
              {isWishlisted ? "Remove wishlist" : "Add to wishlist"}
            </button>
          </div>
        </div>

        <div className="media-action-section">
          <p className="eyebrow">Folders</p>
          <div className="folder-action-panel">
            <div className="picker-grid">
              {folderOptions.length ? (
                folderOptions.map((folder) => {
                  const containsItem = folder.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      className={`picker-chip ${folderId === folder.id ? "is-active" : ""}`}
                      onClick={() => setFolderId(folder.id)}
                    >
                      {folder.name} {containsItem ? "• saved" : ""}
                    </button>
                  );
                })
              ) : (
                <p className="copy">No folders yet. Make your first one below.</p>
              )}
            </div>
            <div className="folder-action-row">
              <button className="button button-secondary" type="button" onClick={() => void handleFolderToggle()} disabled={!folderId}>
                {selectedFolderContainsItem ? "Remove from folder" : "Add to folder"}
              </button>
              <button className="button button-secondary" type="button" onClick={() => setIsCreatingFolder(true)}>
                New folder
              </button>
            </div>
          </div>
        </div>
      </div>

      {isWatched && friends.length ? (
        <div className="media-action-surface glass">
          <div className="media-action-section">
            <p className="eyebrow">Recommend</p>
            <div className="picker-grid">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  className={`picker-chip ${friendId === friend.id ? "is-active" : ""}`}
                  onClick={() => setFriendId(friend.id)}
                >
                  {friend.name}
                </button>
              ))}
            </div>
            <div className="folder-action-row">
              <button className="button button-secondary" type="button" onClick={() => void handleRecommend()} disabled={!friendId}>
                Send rec
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="media-action-message" aria-live="polite">
        {message || "Save it to your library or drop it into a custom folder."}
      </p>

      {isCreatingFolder ? (
        <div className="sidebar-modal-shell" onClick={() => setIsCreatingFolder(false)}>
          <div className="sidebar-folder-modal glass" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-folder-modal-header">
              <strong>Create folder</strong>
              <button type="button" className="topbar-panel-close" onClick={() => setIsCreatingFolder(false)}>
                Close
              </button>
            </div>
            <input
              className="sidebar-folder-input"
              type="text"
              placeholder="Folder name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
            />
            <textarea
              className="sidebar-folder-input sidebar-folder-textarea"
              placeholder="Optional description so the folder has a memory hook"
              value={folderDescription}
              onChange={(event) => setFolderDescription(event.target.value)}
              rows={3}
            />
            <label className="upload-field folder-upload-field">
              <span>Upload folder cover</span>
              <div className="folder-upload-control">
                <span className="button button-secondary folder-upload-button">Choose cover image</span>
                <span className="folder-upload-name">{folderCover ? "Cover image selected" : "PNG, JPG, or WEBP"}</span>
              </div>
              <input type="file" accept="image/*" onChange={handleFolderCoverFileChange} />
            </label>
            <div className="sidebar-folder-actions">
              <button className="button button-primary" type="button" onClick={() => void handleCreateFolder()} disabled={!folderName.trim()}>
                Create folder
              </button>
              <button className="button button-secondary" type="button" onClick={() => setIsCreatingFolder(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ImageAdjusterModal
        file={folderCoverFile}
        title="Adjust folder cover"
        onClose={() => setFolderCoverFile(null)}
        onApply={(dataUrl) => setFolderCover(dataUrl)}
      />
    </div>
  );
}
