"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogCard } from "@/components/catalog-card";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { NVLoader } from "@/components/nv-loader";
import { MediaItem } from "@/lib/types";
import {
  deleteUserList,
  removeMediaFromList,
  saveUserList,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { PrivacyLevel, StoredList } from "@/lib/vault-types";

type MediaFilterMode = "all" | "movie" | "show" | "anime" | "game";
const PAGE_SIZE = 24;

function getListBackdropStyle(coverUrl?: string) {
  if (!coverUrl) {
    return {
      background:
        "radial-gradient(circle at 18% 20%, rgba(99, 90, 255, 0.22), transparent 40%), radial-gradient(circle at 78% 15%, rgba(216, 150, 80, 0.15), transparent 35%), linear-gradient(135deg, rgba(14, 18, 32, 0.98), rgba(6, 8, 16, 0.95))",
    };
  }
  return {
    backgroundImage: `linear-gradient(135deg, rgba(8, 12, 24, 0.35), rgba(8, 12, 24, 0.85)), url(${coverUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

function privacyLabel(v: PrivacyLevel) {
  return v === "public" ? "Public" : v === "friends" ? "Friends only" : "Private";
}

function mediaFilterOptions() {
  return [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "show", label: "Shows" },
    { value: "anime", label: "Anime" },
    { value: "game", label: "Games" },
  ] as Array<{ value: MediaFilterMode; label: string }>;
}

function privacyOptions() {
  return [
    { value: "public", label: "Public" },
    { value: "friends", label: "Friends only" },
    { value: "private", label: "Private" },
  ] as Array<{ value: PrivacyLevel; label: string }>;
}

export function ListDetailWorkspace({
  initialList,
  viewerId,
  isOwner,
}: {
  initialList: StoredList;
  viewerId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [list, setList] = useState<StoredList>(initialList);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftName, setDraftName] = useState(initialList.name);
  const [draftDescription, setDraftDescription] = useState(initialList.description ?? "");
  const [draftCover, setDraftCover] = useState(initialList.coverUrl ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [draftVisibility, setDraftVisibility] = useState<PrivacyLevel>(initialList.visibility);
  const [mediaFilter, setMediaFilter] = useState<MediaFilterMode>("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Re-sync from server on vault changes
  useEffect(() => {
    function reload() {
      setLoading(true);
      fetch(`/api/lists/${initialList.id}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((payload) => {
          if (payload.ok && payload.list) {
            setList(payload.list as StoredList);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
    return subscribeVaultChanges(reload);
  }, [initialList.id]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(t);
  }, [message]);

  const filteredItems = useMemo(() => {
    if (mediaFilter === "all") return list.items;
    return list.items.filter((item) =>
      mediaFilter === "anime"
        ? item.type === "anime" || item.type === "anime_movie"
        : item.type === mediaFilter,
    );
  }, [list.items, mediaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveUserList(list.id, {
        name: draftName.trim(),
        description: draftDescription.trim(),
        coverUrl: draftCover,
        visibility: draftVisibility,
      });
      setList((prev) => ({
        ...prev,
        name: draftName.trim(),
        description: draftDescription.trim(),
        coverUrl: draftCover || undefined,
        visibility: draftVisibility,
      }));
      setIsEditing(false);
      setMessage("List saved.");
    } catch {
      setMessage("Could not save changes. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteUserList(list.id);
      router.replace("/profile");
    } catch {
      setMessage("Could not delete list. Try again.");
      setIsDeleting(false);
    }
  }

  async function handleRemoveItem(item: MediaItem) {
    const key = `${item.source}-${item.sourceId}`;
    if (removingItemId === key) return;
    setRemovingItemId(key);
    try {
      await removeMediaFromList(list.id, item);
      setList((prev) => ({
        ...prev,
        items: prev.items.filter((entry) => !(entry.source === item.source && entry.sourceId === item.sourceId)),
      }));
    } catch {
      setMessage("Could not remove item. Try again.");
    } finally {
      setRemovingItemId(null);
    }
  }

  return (
    <main className="workspace">
      {/* Hero */}
      <section className="workspace-hero glass list-hero">
        <div className="list-hero-backdrop" style={getListBackdropStyle(list.coverUrl)} />
        <div className="workspace-hero-grid">
          <div className="workspace-copy">
            <div className="list-hero-topbar">
              <div className="list-hero-identity">
                <div className="list-hero-cover" style={getListBackdropStyle(list.coverUrl)} />
                <div className="list-hero-copy">
                  <p className="eyebrow">List</p>
                  <h1 className="display list-hero-title">{list.name}</h1>
                  <div className="list-hero-meta">
                    <span className="detail-pill">{list.items.length} {list.items.length === 1 ? "title" : "titles"}</span>
                    <span className={`detail-pill list-visibility-pill list-visibility-${list.visibility}`}>
                      {privacyLabel(list.visibility)}
                    </span>
                  </div>
                </div>
              </div>

              {isOwner ? (
                <div className="list-hero-actions">
                  <button
                    type="button"
                    id="list-edit-btn"
                    className={`button ${isEditing ? "button-primary" : "button-secondary"}`}
                    onClick={() => setIsEditing((v) => !v)}
                  >
                    {isEditing ? "Close edit" : "Edit list"}
                  </button>
                  <button
                    type="button"
                    id="list-delete-btn"
                    className="button button-secondary list-delete-button"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            {/* Description */}
            {!isEditing ? (
              <div className="list-hero-description glass">
                <p className="copy">
                  {list.description?.trim() || "No description added for this list yet."}
                </p>
              </div>
            ) : null}

            {/* Edit panel */}
            {isEditing ? (
              <div className="list-edit-panel glass">
                <div className="list-edit-fields">
                  <div className="list-edit-field-group">
                    <label className="list-edit-label">List name</label>
                    <input
                      id="list-name-input"
                      className="search-input list-edit-input"
                      type="text"
                      placeholder="Give your list a name"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </div>
                  <div className="list-edit-field-group">
                    <label className="list-edit-label">Description</label>
                    <textarea
                      id="list-description-input"
                      className="search-input list-edit-input list-edit-textarea"
                      placeholder="What's the vibe? A short description helps others (and future you) understand the list."
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="list-edit-row">
                    <div className="list-edit-field-group">
                      <label className="list-edit-label">Visibility</label>
                      <select
                        id="list-visibility-select"
                        className="media-select"
                        value={draftVisibility}
                        onChange={(e) => setDraftVisibility(e.target.value as PrivacyLevel)}
                      >
                        {privacyOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="upload-field list-cover-upload">
                      <span className="list-edit-label">Cover image</span>
                      <div className="folder-upload-control">
                        <span className="button button-secondary folder-upload-button">Choose cover</span>
                        <span className="folder-upload-name">{draftCover ? "Cover selected" : "PNG, JPG, or WEBP"}</span>
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }} />
                    </label>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    id="list-save-btn"
                    className="button button-primary"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !draftName.trim()}
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {message ? <p className="media-action-message" style={{ marginTop: 12 }}>{message}</p> : null}

            <div className="button-row" style={{ marginTop: 16 }}>
              <Link href="/profile" className="button button-secondary">
                ← Back to profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Delete confirm modal */}
      {showDeleteConfirm ? (
        <div className="sidebar-modal-shell" onClick={() => setShowDeleteConfirm(false)}>
          <div className="sidebar-folder-modal glass delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-folder-modal-header">
              <div>
                <strong>Delete &ldquo;{list.name}&rdquo;?</strong>
                <p className="copy">This list and all {list.items.length} saved titles will be permanently removed.</p>
              </div>
              <button type="button" className="topbar-panel-close" onClick={() => setShowDeleteConfirm(false)}>Close</button>
            </div>
            <div className="button-row">
              <button type="button" className="button button-secondary" onClick={() => setShowDeleteConfirm(false)}>Keep it</button>
              <button type="button" className="button button-primary" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete list"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Content section */}
      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">In this list</p>
            <h2 className="headline">{list.items.length} {list.items.length === 1 ? "title" : "titles"}</h2>
          </div>
          <div className="chip-row library-chip-row">
            {mediaFilterOptions().map((opt) => (
              <button
                key={`list-filter-${opt.value}`}
                type="button"
                className={`picker-chip ${mediaFilter === opt.value ? "is-active" : ""}`}
                onClick={() => { setMediaFilter(opt.value); setPage(1); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="list-loading-shell">
            <NVLoader label="Refreshing list…" />
          </div>
        ) : filteredItems.length ? (
          <>
            <div className="catalog-grid profile-media-grid list-detail-grid">
              {pagedItems.map((item, index) => (
                <div key={item.id} className="list-item-wrapper">
                  <CatalogCard item={item} priority={index < 8} />
                  {isOwner ? (
                    <button
                      type="button"
                      className="list-item-remove-btn"
                      title={`Remove ${item.title} from list`}
                      aria-label={`Remove ${item.title}`}
                      onClick={() => void handleRemoveItem(item)}
                      disabled={removingItemId === `${item.source}-${item.sourceId}`}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="bottom-pager glass profile-section-pager">
                <div className="pager-copy">
                  <p className="eyebrow">Page flow</p>
                  <p className="copy">Page {page} of {totalPages}.</p>
                </div>
                <div className="pager-actions">
                  <button type="button" className="chip" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <div className="page-indicator"><span>{page}</span><span>/</span><span>{totalPages}</span></div>
                  <button type="button" className="chip is-active" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="folder-empty glass">
            <p className="headline">Nothing in this view yet.</p>
            <p className="copy">
              {list.items.length
                ? "Try a different filter."
                : "Open any media page and use \u201cAdd to list\u201d to fill this list."}
            </p>
          </div>
        )}
      </section>

      <ImageAdjusterModal
        file={coverFile}
        title="Adjust list cover"
        onClose={() => setCoverFile(null)}
        onApply={(dataUrl) => setDraftCover(dataUrl)}
      />
    </main>
  );
}
