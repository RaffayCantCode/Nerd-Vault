"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { AuthRequiredModal } from "@/components/auth-required-modal";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { showFeedback } from "@/components/action-feedback";
import { MediaItem } from "@/lib/types";
import {
  addMediaToList,
  addMediaToWatched,
  addMediaToWishlist,
  createUserList,
  fetchLibraryState,
  fetchProfilePayload,
  recommendToFriend,
  removeMediaFromList,
  removeMediaFromWatched,
  removeMediaFromWishlist,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { SocialProfile, StoredList } from "@/lib/vault-types";

function normalizeReviewDraft(rating: number, title: string, review: string) {
  const cleanTitle = title.trim();
  const cleanReview = review.trim();
  const combinedReview = cleanTitle && cleanReview ? `${cleanTitle}\n\n${cleanReview}` : cleanReview || cleanTitle;

  return {
    rating: rating > 0 ? rating : null,
    review: combinedReview || null,
  };
}

function renderStars(rating: number) {
  return `${"\u2605".repeat(rating)}${"\u2606".repeat(Math.max(0, 5 - rating))}`;
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
  const [lists, setLists] = useState<StoredList[]>([]);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isSendingRecommendation, setIsSendingRecommendation] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const watchStatusLabel = item.type === "game" ? "Playing" : "Watching";

  const isWatchingActive = useMemo(() => {
    return lists.find((l) => l.name.toLowerCase() === watchStatusLabel.toLowerCase())?.items.some((i) => i.source === item.source && i.sourceId === item.sourceId) ?? false;
  }, [lists, item.source, item.sourceId, watchStatusLabel]);

  const isOnHoldActive = useMemo(() => {
    return lists.find((l) => l.name.toLowerCase() === "on hold")?.items.some((i) => i.source === item.source && i.sourceId === item.sourceId) ?? false;
  }, [lists, item.source, item.sourceId]);

  const isDroppedActive = useMemo(() => {
    return lists.find((l) => l.name.toLowerCase() === "dropped")?.items.some((i) => i.source === item.source && i.sourceId === item.sourceId) ?? false;
  }, [lists, item.source, item.sourceId]);

  const primaryLabel = item.type === "game" ? "Played" : "Watched";

  useEffect(() => {
    if (isGuest) {
      setLists([]);
      setFriends([]);
      setIsWatched(false);
      setIsWishlisted(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewText("");
      return;
    }

    function sync() {
      fetchLibraryState()
        .then((library) => {
          setLists(library.lists ?? library.folders ?? []);
          const watchedEntry = library.watched.find((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
          setIsWatched(Boolean(watchedEntry));
          setReviewRating(watchedEntry?.userRating ?? 0);
          const savedReview = watchedEntry?.userReview ?? "";
          const reviewParts = savedReview.split(/\n{2,}/);
          setReviewTitle(reviewParts.length > 1 && reviewParts[0].length <= 90 ? reviewParts[0] : "");
          setReviewText(reviewParts.length > 1 && reviewParts[0].length <= 90 ? reviewParts.slice(1).join("\n\n") : savedReview);
          setIsWishlisted(library.wishlist.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId));
        })
        .catch(() => {
          setLists([]);
          setIsWatched(false);
          setIsWishlisted(false);
          setReviewRating(0);
          setReviewTitle("");
          setReviewText("");
        });

      fetchProfilePayload()
        .then((payload) => setFriends(payload.friends))
        .catch(() => setFriends([]));
    }

    sync();
    return subscribeVaultChanges(sync);
  }, [isGuest, item.source, item.sourceId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const listOptions = useMemo(() => lists, [lists]);
  const selectedList = listOptions.find((list) => list.id === folderId);
  const selectedListContainsItem =
    selectedList?.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId) ?? false;
  const friendSelectionLabel = selectedFriendIds.length ? `${selectedFriendIds.length} selected` : "Choose friends";

  function closeReviewPanel() {
    if (!isWatched && reviewRating === 0 && !reviewTitle.trim() && !reviewText.trim() && !isSavingReview) {
      void saveReview("skip");
      return;
    }

    setReviewOpen(false);
  }

  async function saveReview(mode: "save" | "skip" | "clear") {
    if (isSavingReview) {
      return;
    }

    const payload =
      mode === "skip" || mode === "clear"
        ? { rating: null, review: null }
        : normalizeReviewDraft(reviewRating, reviewTitle, reviewText);

    setIsSavingReview(true);

    try {
      await addMediaToWatched(item, payload);
      setIsWatched(true);
      setReviewRating(payload.rating ?? 0);
      setReviewTitle(mode === "clear" || mode === "skip" ? "" : reviewTitle.trim());
      setReviewText(mode === "clear" || mode === "skip" ? "" : reviewText.trim());
      setReviewOpen(false);

      if (mode !== "clear") {
        // Remove from status folders
        const statusFolders = lists.filter((l) => ["watching", "playing", "on hold", "dropped"].includes(l.name.toLowerCase()));
        for (const folder of statusFolders) {
          if (folder.items.some((i) => i.source === item.source && i.sourceId === item.sourceId)) {
            await removeMediaFromList(folder.id, item);
          }
        }
        // Remove from wishlist
        if (isWishlisted) {
          await removeMediaFromWishlist(item);
          setIsWishlisted(false);
        }
      }

      if (mode === "skip") {
        showFeedback("success", `${item.title} marked as ${primaryLabel.toLowerCase()}`);
      } else if (mode === "clear") {
        showFeedback("info", `Review cleared for ${item.title}`);
      } else if (payload.rating) {
        showFeedback("star", `Rated ${renderStars(payload.rating)} for ${item.title}`);
      } else {
        showFeedback("success", `Review saved for ${item.title}`);
      }
    } catch {
      showFeedback("info", `Could not save your ${primaryLabel.toLowerCase()} entry yet. Try again.`);
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleRemoveWatched() {
    if (isSavingReview) {
      return;
    }

    setIsSavingReview(true);
    try {
      await removeMediaFromWatched(item);
      setIsWatched(false);
      setReviewOpen(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewText("");
      showFeedback("info", `${item.title} removed from ${primaryLabel.toLowerCase()}`);
    } catch {
      showFeedback("info", `Could not remove ${item.title} yet. Try again.`);
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleWishlist() {
    if (isTogglingWishlist) {
      return;
    }

    const nextValue = !isWishlisted;
    setIsTogglingWishlist(true);
    setIsWishlisted(nextValue);

    if (nextValue) {
      showFeedback("heart", `${item.title} added to wishlist`);
    } else {
      showFeedback("info", `${item.title} removed from wishlist`);
    }

    try {
      if (nextValue) {
        await addMediaToWishlist(item);
        // Remove from status folders
        const statusFolders = lists.filter((l) => ["watching", "playing", "on hold", "dropped"].includes(l.name.toLowerCase()));
        for (const folder of statusFolders) {
          if (folder.items.some((i) => i.source === item.source && i.sourceId === item.sourceId)) {
            await removeMediaFromList(folder.id, item);
          }
        }
      } else {
        await removeMediaFromWishlist(item);
      }
    } catch {
      setIsWishlisted(!nextValue);
      showFeedback("info", "Could not update wishlist yet. Try again.");
    } finally {
      setIsTogglingWishlist(false);
    }
  }

  async function handleFolderToggle() {
    if (!folderId || isUpdatingFolder) {
      return;
    }

    const nextContainsItem = !selectedListContainsItem;
    const nextLists = lists.map((list) => {
      if (list.id !== folderId) {
        return list;
      }

      const alreadySaved = list.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
      if (nextContainsItem && !alreadySaved) {
        return { ...list, items: [...list.items, item] };
      }

      if (!nextContainsItem && alreadySaved) {
        return {
          ...list,
          items: list.items.filter((entry) => !(entry.source === item.source && entry.sourceId === item.sourceId)),
        };
      }

      return list;
    });

    setIsUpdatingFolder(true);
    setLists(nextLists);

    try {
      if (nextContainsItem) {
        await addMediaToList(folderId, item);
        showFeedback("success", `Added to ${selectedList?.name ?? "list"}`);
      } else {
        await removeMediaFromList(folderId, item);
        showFeedback("info", `Removed from ${selectedList?.name ?? "list"}`);
      }
    } catch {
      setLists(lists);
      showFeedback("info", `Could not update ${selectedList?.name ?? "list"} yet. Try again.`);
    } finally {
      setIsUpdatingFolder(false);
    }
  }

  async function getOrCreateStatusFolder(statusName: string): Promise<string> {
    const existing = lists.find((l) => l.name.toLowerCase() === statusName.toLowerCase());
    if (existing) {
      return existing.id;
    }
    const result = await createUserList({ name: statusName, visibility: "public" });
    if (result && result.id) {
      return result.id;
    }
    throw new Error(`Failed to create list: ${statusName}`);
  }

  async function handleStatusToggle(statusName: string) {
    if (isGuest) {
      setShowGuestAuthModal(true);
      return;
    }
    if (isTogglingStatus) {
      return;
    }

    const currentFolder = lists.find((l) => l.name.toLowerCase() === statusName.toLowerCase());
    const isAlreadyInStatus = currentFolder?.items.some((i) => i.source === item.source && i.sourceId === item.sourceId) ?? false;

    setIsTogglingStatus(true);

    try {
      if (isAlreadyInStatus) {
        if (currentFolder) {
          await removeMediaFromList(currentFolder.id, item);
          showFeedback("info", `${item.title} removed from ${statusName}`);
        }
      } else {
        const targetFolderId = await getOrCreateStatusFolder(statusName);
        await addMediaToList(targetFolderId, item);

        // Remove from other status folders
        const otherStatuses = ["watching", "playing", "on hold", "dropped"].filter((s) => s !== statusName.toLowerCase());
        for (const otherStatus of otherStatuses) {
          const otherFolder = lists.find((l) => l.name.toLowerCase() === otherStatus);
          if (otherFolder && otherFolder.items.some((i) => i.source === item.source && i.sourceId === item.sourceId)) {
            await removeMediaFromList(otherFolder.id, item);
          }
        }

        // Remove from wishlist
        if (isWishlisted) {
          await removeMediaFromWishlist(item);
          setIsWishlisted(false);
        }

        // Remove from watched
        if (isWatched) {
          await removeMediaFromWatched(item);
          setIsWatched(false);
          setReviewRating(0);
          setReviewTitle("");
          setReviewText("");
        }

        showFeedback("success", `${item.title} marked as ${statusName}`);
      }
    } catch {
      showFeedback("info", `Could not update status to ${statusName} yet. Try again.`);
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleCreateFolder() {
    const nextName = folderName.trim();
    await createUserList({
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
    if (!file) {
      return;
    }
    setFolderCoverFile(file);
  }

  function toggleFriend(friendId: string) {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((entry) => entry !== friendId) : [...current, friendId],
    );
  }

  async function handleRecommend() {
    if (!selectedFriendIds.length || isSendingRecommendation) {
      return;
    }

    setIsSendingRecommendation(true);
    try {
      await recommendToFriend(selectedFriendIds, {
        ...item,
        userRating: reviewRating || null,
        userReview: reviewText.trim() || null,
      });
      setRecommendOpen(false);
      setSelectedFriendIds([]);

      if (reviewRating) {
        showFeedback("milestone", `Recommended with ${renderStars(reviewRating)} to ${selectedFriendIds.length} ${selectedFriendIds.length === 1 ? "friend" : "friends"}`);
      } else {
        showFeedback("success", `Recommended to ${selectedFriendIds.length} ${selectedFriendIds.length === 1 ? "friend" : "friends"}`);
      }
    } catch (error) {
      showFeedback("info", error instanceof Error ? error.message : "Could not send recommendation yet. Try again.");
    } finally {
      setIsSendingRecommendation(false);
    }
  }

  if (isGuest) {
    return (
      <>
        <div className="media-actions">
          <div className="media-action-surface glass">
            <div className="media-action-section">
              <div className="button-row media-actions-bar">
                <button className="button button-primary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  Mark as {primaryLabel}
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  {watchStatusLabel}
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  On Hold
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  Dropped
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  Recommend
                </button>
                <button className="button button-secondary" type="button" onClick={() => setShowGuestAuthModal(true)}>
                  <Heart size={16} />
                  Add to wishlist
                </button>
              </div>
              <p className="copy media-action-guest-note">
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

  return (
    <div className="media-actions">
      <div className="media-action-surface glass">
        <div className="media-action-section">
          <div className="button-row media-actions-bar">
            <button className={`button ${isWatched ? "button-success" : "button-primary"}`} type="button" onClick={() => setReviewOpen(true)}>
              {isWatched ? `✓ ${primaryLabel} / Edit review` : `Mark as ${primaryLabel}`}
            </button>
            <button
              className={`button ${isWatchingActive ? "button-accent is-active-status" : "button-secondary"}`}
              type="button"
              onClick={() => void handleStatusToggle(watchStatusLabel)}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus && isWatchingActive ? "Saving..." : watchStatusLabel}
            </button>
            <button
              className={`button ${isOnHoldActive ? "button-accent is-active-status" : "button-secondary"}`}
              type="button"
              onClick={() => void handleStatusToggle("On Hold")}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus && isOnHoldActive ? "Saving..." : "On Hold"}
            </button>
            <button
              className={`button ${isDroppedActive ? "button-accent is-active-status" : "button-secondary"}`}
              type="button"
              onClick={() => void handleStatusToggle("Dropped")}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus && isDroppedActive ? "Saving..." : "Dropped"}
            </button>
            <button className="button button-secondary" type="button" onClick={() => setRecommendOpen(true)}>
              Recommend
            </button>
            <button
              className={`button ${isWishlisted ? "button-accent is-active-status" : "button-secondary"}`}
              type="button"
              onClick={() => void handleWishlist()}
              disabled={isTogglingWishlist}
            >
              <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
              {isTogglingWishlist ? "Saving..." : isWishlisted ? "Wishlisted" : "Add to wishlist"}
            </button>
            {isWatched ? (
              <button className="button button-secondary" type="button" onClick={() => void handleRemoveWatched()} disabled={isSavingReview} title={`Remove ${primaryLabel}`}>
                {isSavingReview ? "Saving..." : `Remove ${primaryLabel}`}
              </button>
            ) : null}
          </div>

          {isWatched && (reviewRating || reviewTitle.trim() || reviewText.trim()) ? (
            <p className="copy media-saved-review-note">
              {reviewRating ? `${renderStars(reviewRating)} saved.` : "Review saved."} {(reviewTitle || reviewText).trim().slice(0, 120)}
            </p>
          ) : null}
        </div>

        <div className="media-action-section media-action-lists-section">
          <p className="eyebrow">Custom Lists</p>
          <div className="folder-action-panel">
            <div className="picker-grid">
              {listOptions.length ? (
                listOptions.map((list) => {
                  const containsItem = list.items.some((entry) => entry.source === item.source && entry.sourceId === item.sourceId);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      className={`picker-chip ${folderId === list.id ? "is-active" : ""}`}
                      onClick={() => setFolderId(list.id)}
                    >
                      {list.name} {containsItem ? "✓" : ""}
                    </button>
                  );
                })
              ) : (
                <p className="copy">No custom lists yet. Create one below.</p>
              )}
            </div>
            <div className="folder-action-row">
              <button className="button button-secondary" type="button" onClick={() => void handleFolderToggle()} disabled={!folderId || isUpdatingFolder}>
                {isUpdatingFolder ? "Saving..." : selectedListContainsItem ? "Remove from list" : "Add to list"}
              </button>
              <button className="button button-secondary" type="button" onClick={() => setIsCreatingFolder(true)}>
                New list
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="media-action-message" aria-live="polite">
        {message || "Save it, rate it, or pass it to a friend whenever you want."}
      </p>

      {reviewOpen ? (
        <div className="sidebar-modal-shell" onClick={closeReviewPanel}>
          <div className="sidebar-folder-modal glass" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-folder-modal-header">
              <div>
                <strong>{isWatched ? "Edit review" : `Mark as ${primaryLabel}`}</strong>
                <p className="copy">Ratings are optional signal. Reviews help the community decide what is worth their time.</p>
              </div>
              <button type="button" className="topbar-panel-close" onClick={closeReviewPanel}>
                Close
              </button>
            </div>

            <div className="review-stars-block">
              <span className="copy">Your rating</span>
              <div className="review-stars" role="radiogroup" aria-label="Choose a rating from one to five stars">
                {Array.from({ length: 5 }, (_, index) => {
                  const ratingValue = index + 1;
                  const isActive = ratingValue <= reviewRating;

                  return (
                    <button
                      key={ratingValue}
                      type="button"
                      role="radio"
                      aria-checked={reviewRating === ratingValue}
                      aria-label={`${ratingValue} star${ratingValue === 1 ? "" : "s"}`}
                      className={`review-star${isActive ? " is-active" : ""}`}
                      onClick={() => setReviewRating((current) => (current === ratingValue ? 0 : ratingValue))}
                    >
                      <span aria-hidden="true">★</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="button-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="copy">{reviewRating ? `${renderStars(reviewRating)} selected` : "Tap a star to rate it"}</span>
              {reviewRating ? (
                <button type="button" className="button button-secondary" onClick={() => setReviewRating(0)}>
                  Clear stars
                </button>
              ) : null}
            </div>

            <textarea
              className="sidebar-folder-input"
              placeholder="Optional review title"
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              maxLength={90}
            />

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
              {isWatched && (reviewRating || reviewTitle.trim() || reviewText.trim()) ? (
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
                <p className="copy">{friendSelectionLabel}. Recommendations stay available even if you have not logged a rating yet.</p>
              </div>
              <button type="button" className="topbar-panel-close" onClick={() => setRecommendOpen(false)}>
                Close
              </button>
            </div>

            <div className="picker-grid">
              {friends.length ? (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className={`picker-chip ${selectedFriendIds.includes(friend.id) ? "is-active" : ""}`}
                    onClick={() => toggleFriend(friend.id)}
                  >
                    {friend.name}
                  </button>
                ))
              ) : (
                <p className="copy">No friends added yet. Once you add one, this recommendation panel is ready to use.</p>
              )}
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
              <strong>Create list</strong>
              <button type="button" className="topbar-panel-close" onClick={() => setIsCreatingFolder(false)}>
                Close
              </button>
            </div>

            <input
              className="sidebar-folder-input"
              type="text"
              placeholder="List name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
            />
            <textarea
              className="sidebar-folder-input sidebar-folder-textarea"
              placeholder="Optional description"
              value={folderDescription}
              onChange={(event) => setFolderDescription(event.target.value)}
              rows={3}
            />
            <label className="upload-field folder-upload-field">
              <span>Upload list cover</span>
              <div className="folder-upload-control">
                <span className="button button-secondary folder-upload-button">Choose cover image</span>
                <span className="folder-upload-name">{folderCover ? "Cover image selected" : "PNG, JPG, or WEBP"}</span>
              </div>
              <input type="file" accept="image/*" onChange={handleFolderCoverFileChange} />
            </label>

            <div className="sidebar-folder-actions">
              <button className="button button-primary" type="button" onClick={() => void handleCreateFolder()} disabled={!folderName.trim()}>
                Create list
              </button>
              <button className="button button-secondary" type="button" onClick={() => setIsCreatingFolder(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ImageAdjusterModal file={folderCoverFile} title="Adjust folder cover" onClose={() => setFolderCoverFile(null)} onApply={(dataUrl) => setFolderCover(dataUrl)} />
    </div>
  );
}
