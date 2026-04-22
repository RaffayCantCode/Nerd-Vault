"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { AuthRequiredModal } from "@/components/auth-required-modal";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { ResilientMediaImage } from "@/components/resilient-media-image";
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

function normalizeReviewDraft(rating: number, review: string) {
  return {
    rating: rating > 0 ? rating : null,
    review: review.trim() ? review.trim() : null,
  };
}

function renderStars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}`;
}

export function MediaActions({ item, viewerId }: { item: MediaItem; viewerId: string }) {
  const isGuest = viewerId === "guest-vault";
  const pathname = usePathname();
  const [isWatched, setIsWatched] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderCover, setFolderCover] = useState("");
  const [folderCoverFile, setFolderCoverFile] = useState<File | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [message, setMessage] = useState("");
  const [folders, setFolders] = useState<StoredFolder[]>([]);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isSendingRecommendation, setIsSendingRecommendation] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const primaryLabel = item.type === "game" ? "Played" : "Watched";

  useEffect(() => {
    if (isGuest) {
      setFolders([]);
      setFriends([]);
      setIsWatched(false);
      setIsWishlisted(false);
      setReviewRating(0);
      setReviewText("");
      return;
    }

    function sync() {
      fetchLibraryState()
        .then((library) => {
          setFolders(library.folders);
          const watchedEntry = library.watched.find((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
          setIsWatched(Boolean(watchedEntry));
          setReviewRating(watchedEntry?.userRating ?? 0);
          setReviewText(watchedEntry?.userReview ?? "");
          setIsWishlisted(library.wishlist.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId));
        })
        .catch(() => {
          setFolders([]);
          setIsWatched(false);
          setIsWishlisted(false);
          setReviewRating(0);
          setReviewText("");
        });

      fetchProfilePayload()
        .then((payload) => setFriends(payload.friends))
        .catch(() => setFriends([]));
    }

    sync();
    const unsubscribe = subscribeVaultChanges(sync);
    return () => unsubscribe();
  }, [isGuest, item.source, item.sourceId]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const folderOptions = useMemo(() => folders, [folders]);
  const selectedFolder = folderOptions.find((folder) => folder.id === folderId);
  const selectedFolderContainsItem = selectedFolder?.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId) ?? false;
  const friendSelectionLabel = selectedFriendIds.length ? `${selectedFriendIds.length} selected` : "Choose friends";

  function closeReviewPanel() {
    if (!isWatched && reviewRating === 0 && !reviewText.trim() && !isSavingReview) {
      void saveReview("skip");
      return;
    }

    setReviewOpen(false);
  }

  if (isGuest) {
    return (
      <>
        <div className="media-actions">
          <div className="media-action-surface glass">
            <div className="media-action-section">
              <p className="eyebrow">Library</p>
              <div className="button-row">
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  Mark as {primaryLabel}
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  <Heart size={16} />
                  Add to wishlist
                </button>
              </div>
              <p className="copy" style={{ marginTop: 14 }}>
                Guest mode keeps library actions locked until you sign in.
              </p>
            </div>
          </div>
        </div>
        <AuthRequiredModal
          isOpen={showGuestAuthModal}
          title="Save titles to your vault"
          message="You need to be logged in to track watched titles, leave ratings, and send recommendations."
          redirectTo={pathname}
          onClose={() => setShowGuestAuthModal(false)}
        />
      </>
    );
  }

  async function saveReview(mode: "save" | "skip" | "clear") {
    if (isSavingReview) return;

    const payload =
      mode === "skip" || mode === "clear"
        ? { rating: null, review: null }
        : normalizeReviewDraft(reviewRating, reviewText);

    setIsSavingReview(true);

    try {
      await addMediaToWatched(item, payload);
      setIsWatched(true);
      setReviewRating(payload.rating ?? 0);
      setReviewText(payload.review ?? "");
      setReviewOpen(false);
      setMessage(
        mode === "skip"
          ? `${item.title} marked as ${primaryLabel.toLowerCase()}.`
          : mode === "clear"
            ? `Review cleared for ${item.title}.`
            : payload.rating
              ? `Saved ${renderStars(payload.rating)} for ${item.title}.`
              : `Saved your note for ${item.title}.`,
      );
    } catch {
      setMessage(`Could not save your ${primaryLabel.toLowerCase()} entry yet. Try again.`);
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleRemoveWatched() {
    if (isSavingReview) return;
    setIsSavingReview(true);

    try {
      await removeMediaFromWatched(item);
      setIsWatched(false);
      setReviewOpen(false);
      setReviewRating(0);
      setReviewText("");
      setRecommendOpen(false);
      setSelectedFriendIds([]);
      setMessage(`${item.title} removed from ${primaryLabel.toLowerCase()}.`);
    } catch {
      setMessage(`Could not remove ${item.title} yet. Try again.`);
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleWishlist() {
    if (isTogglingWishlist) return;

    const nextValue = !isWishlisted;
    setIsTogglingWishlist(true);
    setIsWishlisted(nextValue);
    setMessage(nextValue ? `${item.title} added to wishlist.` : `${item.title} removed from wishlist.`);

    try {
      if (nextValue) {
        await addMediaToWishlist(item);
      } else {
        await removeMediaFromWishlist(item);
      }
    } catch {
      setIsWishlisted(!nextValue);
      setMessage("Could not update wishlist yet. Try again.");
    } finally {
      setIsTogglingWishlist(false);
    }
  }

  async function handleFolderToggle() {
    if (!folderId || isUpdatingFolder) return;

    const nextContainsItem = !selectedFolderContainsItem;
    const nextFolders = folders.map((folder) => {
      if (folder.id !== folderId) return folder;

      const alreadySaved = folder.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
      if (nextContainsItem && !alreadySaved) {
        return {
          ...folder,
          items: [...folder.items, item],
        };
      }

      if (!nextContainsItem && alreadySaved) {
        return {
          ...folder,
          items: folder.items.filter((entry) => !(entry.source === item.source && entry.sourceId === item.sourceId)),
        };
      }

      return folder;
    });

    setIsUpdatingFolder(true);
    setFolders(nextFolders);
    setMessage(`${nextContainsItem ? "Added to" : "Removed from"} ${selectedFolder?.name ?? "folder"}.`);

    try {
      if (nextContainsItem) {
        await addMediaToFolder(folderId, item);
      } else {
        await removeMediaFromFolder(folderId, item);
      }
    } catch {
      setFolders(folders);
      setMessage(`Could not update ${selectedFolder?.name ?? "folder"} yet. Try again.`);
    } finally {
      setIsUpdatingFolder(false);
    }
  }

  async function handleCreateFolder() {
    const nextName = folderName.trim();
    await createLibraryFolder({
      name: nextName,
      description: folderDescription,
      coverUrl: folderCover,
    });
    setFolderName("");
    setFolderDescription("");
    setFolderCover("");
    setIsCreatingFolder(false);
    setMessage(`Created ${nextName}.`);
  }

  function handleFolderCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFolderCoverFile(file);
  }

  function toggleFriend(friendId: string) {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((entry) => entry !== friendId) : [...current, friendId],
    );
  }

  async function handleRecommend() {
    if (!selectedFriendIds.length || isSendingRecommendation) return;

    setIsSendingRecommendation(true);
    try {
      await recommendToFriend(
        selectedFriendIds,
        {
          ...item,
          userRating: reviewRating || null,
          userReview: reviewText.trim() || null,
        },
      );
      setRecommendOpen(false);
      setMessage(
        reviewRating
          ? `Sent ${item.title} with your ${renderStars(reviewRating)} take.`
          : `Recommended ${item.title} to ${selectedFriendIds.length} ${selectedFriendIds.length === 1 ? "friend" : "friends"}.`,
      );
      setSelectedFriendIds([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send recommendation yet. Try again.");
    } finally {
      setIsSendingRecommendation(false);
    }
  }

  return (
    <div className="media-actions">
      <div className="media-action-surface glass">
        <div className="media-action-section">
          <div className="media-action-hero">
            <div
              className="media-action-hero-backdrop"
              style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 9, 16, 0.18), rgba(6, 9, 16, 0.82)), url(${item.backdropUrl || item.coverUrl})` }}
              aria-hidden="true"
            />
            <ResilientMediaImage
              item={item}
              className="media-action-hero-image"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="media-action-hero-copy">
              <p className="eyebrow">Library</p>
              <strong>{item.title}</strong>
              <span>{item.type === "game" ? "Log your playthrough, score, and recommendation signal." : "Log your watch, score, and recommendation signal."}</span>
            </div>
          </div>
          <div className="button-row">
            <button className={`button button-primary ${isWatched ? "button-success" : ""}`} type="button" onClick={() => setReviewOpen(true)}>
              {isWatched ? "Edit review" : `Mark as ${primaryLabel}`}
            </button>
            {isWatched ? (
              <button className="button button-secondary" type="button" onClick={() => void handleRemoveWatched()} disabled={isSavingReview}>
                {isSavingReview ? "Saving..." : `Remove ${primaryLabel}`}
              </button>
            ) : null}
            <button
              className={`button button-secondary ${isWishlisted ? "button-accent" : ""}`}
              type="button"
              onClick={() => void handleWishlist()}
              disabled={isTogglingWishlist}
            >
              {isTogglingWishlist ? "Saving..." : isWishlisted ? "Remove wishlist" : "Add to wishlist"}
            </button>
          </div>
          {isWatched && (reviewRating || reviewText.trim()) ? (
            <p className="copy" style={{ marginTop: 14 }}>
              {reviewRating ? `${renderStars(reviewRating)} saved.` : "Review saved."} {reviewText.trim() ? reviewText.trim().slice(0, 120) : ""}
            </p>
          ) : null}
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
                      {folder.name} {containsItem ? "saved" : ""}
                    </button>
                  );
                })
              ) : (
                <p className="copy">No folders yet. Make your first one below.</p>
              )}
            </div>
            <div className="folder-action-row">
              <button className="button button-secondary" type="button" onClick={() => void handleFolderToggle()} disabled={!folderId || isUpdatingFolder}>
                {isUpdatingFolder ? "Saving..." : selectedFolderContainsItem ? "Remove from folder" : "Add to folder"}
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
            <div className="button-row">
              <button className="button button-secondary" type="button" onClick={() => setRecommendOpen(true)}>
                Recommend
              </button>
              <p className="copy" style={{ margin: 0 }}>
                {reviewRating ? `Your current signal is ${renderStars(reviewRating)}.` : "Recommendation goes out without a rating if you skip review."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <p className="media-action-message" aria-live="polite">
        {message || "Save it to your library, leave a rating, or pass it to a friend."}
      </p>

      {reviewOpen ? (
        <div className="sidebar-modal-shell" onClick={closeReviewPanel}>
          <div className="sidebar-folder-modal glass" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-folder-modal-header">
              <div>
                <strong>{isWatched ? "Edit review" : `Mark as ${primaryLabel}`}</strong>
                <p className="copy">Ratings are optional signal. Notes are optional depth.</p>
              </div>
              <button type="button" className="topbar-panel-close" onClick={closeReviewPanel}>
                Close
              </button>
            </div>

            <label className="copy" htmlFor="review-rating-input">Your rating</label>
            <input
              id="review-rating-input"
              type="range"
              min={0}
              max={5}
              step={1}
              value={reviewRating}
              onChange={(event) => setReviewRating(Number(event.target.value))}
            />
            <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="copy">{reviewRating ? renderStars(reviewRating) : "No rating selected"}</span>
              {reviewRating ? (
                <button type="button" className="button button-secondary" onClick={() => setReviewRating(0)}>
                  Clear stars
                </button>
              ) : null}
            </div>

            <textarea
              className="sidebar-folder-input sidebar-folder-textarea"
              placeholder="Optional review. What landed for you?"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              rows={4}
            />

            <div className="sidebar-folder-actions">
              <button className="button button-primary" type="button" onClick={() => void saveReview("save")} disabled={isSavingReview}>
                {isSavingReview ? "Saving..." : "Save"}
              </button>
              {!isWatched ? (
                <button className="button button-secondary" type="button" onClick={() => void saveReview("skip")} disabled={isSavingReview}>
                  Skip review
                </button>
              ) : null}
              {isWatched && (reviewRating || reviewText.trim()) ? (
                <button className="button button-secondary" type="button" onClick={() => void saveReview("clear")} disabled={isSavingReview}>
                  Clear review
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {recommendOpen ? (
        <div className="sidebar-modal-shell" onClick={() => setRecommendOpen(false)}>
          <div className="sidebar-folder-modal glass" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-folder-modal-header">
              <div>
                <strong>Recommend {item.title}</strong>
                <p className="copy">{friendSelectionLabel}. Recent repeats are throttled to reduce spam.</p>
              </div>
              <button type="button" className="topbar-panel-close" onClick={() => setRecommendOpen(false)}>
                Close
              </button>
            </div>
            <div className="picker-grid">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  className={`picker-chip ${selectedFriendIds.includes(friend.id) ? "is-active" : ""}`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  {friend.name}
                </button>
              ))}
            </div>
            <div className="sidebar-folder-actions">
              <button className="button button-primary" type="button" onClick={() => void handleRecommend()} disabled={!selectedFriendIds.length || isSendingRecommendation}>
                {isSendingRecommendation ? "Sending..." : "Send"}
              </button>
              <button className="button button-secondary" type="button" onClick={() => setRecommendOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
