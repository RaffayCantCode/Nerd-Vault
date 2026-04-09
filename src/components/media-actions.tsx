"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  addItemToFolder,
  addToWatched,
  addToWishlist,
  createFolder,
  isInWatched,
  isInWishlist,
  readLibraryState,
  removeFromWishlist,
  subscribeLibraryChanges,
} from "@/lib/library-storage";
import { SocialProfile, getFriends, sendRecommendation, subscribeSocialChanges } from "@/lib/social-storage";
import { MediaItem } from "@/lib/types";
import { readFileAsDataUrl } from "@/lib/read-file-as-data-url";

export function MediaActions({ item, viewerId }: { item: MediaItem; viewerId: string }) {
  const [isWatched, setIsWatched] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderCover, setFolderCover] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const [folders, setFolders] = useState(readLibraryState().folders);
  const [friends, setFriends] = useState<SocialProfile[]>([]);

  const primaryLabel = item.type === "game" ? "Played" : "Watched";

  useEffect(() => {
    function sync() {
      setIsWatched(isInWatched(item));
      setIsWishlisted(isInWishlist(item));
      setFolders(readLibraryState().folders);
      setFriends(getFriends(viewerId));
    }

    sync();
    const unsubscribeLibrary = subscribeLibraryChanges(sync);
    const unsubscribeSocial = subscribeSocialChanges(sync);
    return () => {
      unsubscribeLibrary();
      unsubscribeSocial();
    };
  }, [item, viewerId]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const folderOptions = useMemo(() => folders, [folders]);

  function handleWatched() {
    addToWatched(item);
    setMessage(`${item.title} added to ${primaryLabel.toLowerCase()}.`);
  }

  function handleWishlist() {
    if (isWishlisted) {
      removeFromWishlist(item);
      setMessage(`${item.title} removed from wishlist.`);
      return;
    }

    addToWishlist(item);
    setMessage(`${item.title} added to wishlist.`);
  }

  function handleAddToFolder() {
    if (!folderId) return;
    addItemToFolder(folderId, item);
    const target = folderOptions.find((folder) => folder.id === folderId);
    setMessage(`Added to ${target?.name ?? "folder"}.`);
  }

  function handleCreateFolder() {
    const folder = createFolder(folderName, folderCover, folderDescription);
    if (!folder) return;
    setFolderId(folder.id);
    setFolderName("");
    setFolderDescription("");
    setFolderCover("");
    setIsCreatingFolder(false);
    setMessage(`Created ${folder.name}.`);
  }

  async function handleFolderCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setFolderCover(dataUrl);
  }

  function handleRecommend() {
    if (!friendId) return;
    sendRecommendation(viewerId, friendId, item);
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
              onClick={handleWatched}
            >
              {isWatched ? `${primaryLabel} logged` : `Mark as ${primaryLabel}`}
            </button>
            <button
              className={`button button-secondary ${isWishlisted ? "button-accent" : ""}`}
              type="button"
              onClick={handleWishlist}
            >
              {isWishlisted ? "Wishlisted" : "Add to wishlist"}
            </button>
          </div>
        </div>

        <div className="media-action-section">
          <p className="eyebrow">Folders</p>
          <div className="folder-action-panel">
            <div className="picker-grid">
              {folderOptions.length ? (
                folderOptions.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={`picker-chip ${folderId === folder.id ? "is-active" : ""}`}
                    onClick={() => setFolderId(folder.id)}
                  >
                    {folder.name}
                  </button>
                ))
              ) : (
                <p className="copy">No folders yet. Make your first one below.</p>
              )}
            </div>
            <div className="folder-action-row">
              <button className="button button-secondary" type="button" onClick={handleAddToFolder} disabled={!folderId}>
                Add to folder
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
              <button className="button button-secondary" type="button" onClick={handleRecommend} disabled={!friendId}>
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
              <button className="button button-primary" type="button" onClick={handleCreateFolder} disabled={!folderName.trim()}>
                Create folder
              </button>
              <button className="button button-secondary" type="button" onClick={() => setIsCreatingFolder(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
