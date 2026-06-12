"use client";

import { useDeferredValue, useMemo, useState, ChangeEvent } from "react";
import Link from "next/link";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { createUserList } from "@/lib/vault-client";
import { PrivacyLevel, StoredList } from "@/lib/vault-types";

function getListArtStyle(coverUrl?: string, items?: { coverUrl?: string }[]) {
  if (coverUrl) {
    return {
      backgroundImage: `linear-gradient(160deg, rgba(8,12,24,0.2), rgba(8,12,24,0.65)), url(${coverUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  // Generate a gradient mosaic if no cover but has items
  if (items?.length) {
    const hues = [220, 260, 290, 310, 340, 20, 45];
    const hue = hues[(items[0].coverUrl?.charCodeAt(12) ?? 0) % hues.length];
    return {
      background: `radial-gradient(ellipse at 25% 30%, hsl(${hue}, 65%, 28%), transparent 60%), radial-gradient(ellipse at 75% 70%, hsl(${(hue + 60) % 360}, 55%, 20%), transparent 55%), linear-gradient(145deg, hsl(${hue}, 45%, 12%), hsl(${(hue + 40) % 360}, 35%, 8%))`,
    };
  }

  return {
    background:
      "radial-gradient(circle at 30% 25%, rgba(99, 90, 255, 0.28), transparent 50%), linear-gradient(145deg, rgba(18, 22, 40, 1), rgba(8, 10, 20, 1))",
  };
}

function privacyLabel(v: PrivacyLevel) {
  return v === "public" ? "Public" : v === "friends" ? "Friends" : "Private";
}

export function ListsWorkspace({
  lists,
  viewingOwnProfile,
  viewedUserId,
}: {
  lists: StoredList[];
  viewingOwnProfile: boolean;
  viewedUserId: string;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newVisibility, setNewVisibility] = useState<PrivacyLevel>("public");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((l) =>
      `${l.name} ${l.description ?? ""} ${l.items.map((i) => i.title).join(" ")}`.toLowerCase().includes(q),
    );
  }, [lists, deferredSearch]);

  async function handleCreate() {
    if (creating || !newName.trim()) return;
    setCreating(true);
    try {
      await createUserList({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        coverUrl: newCover || undefined,
        visibility: newVisibility,
      });
      setNewName("");
      setNewDescription("");
      setNewCover("");
      setNewVisibility("public");
      setIsCreating(false);
      setCreateMsg("List created!");
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Could not create list.");
    } finally {
      setCreating(false);
      window.setTimeout(() => setCreateMsg(""), 2200);
    }
  }

  return (
    <div className="lists-workspace">
      {/* Toolbar */}
      <div className="lists-toolbar glass">
        <div className="lists-toolbar-copy">
          <p className="eyebrow">Discovery</p>
          <p className="copy">{lists.length} {lists.length === 1 ? "list" : "lists"} curated by {viewingOwnProfile ? "you" : "this user"}.</p>
        </div>
        <div className="lists-toolbar-controls">
          <input
            className="search-input library-search-input"
            type="search"
            placeholder="Search lists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {viewingOwnProfile ? (
            <button
              type="button"
              id="create-list-btn"
              className={`button ${isCreating ? "button-primary" : "button-secondary"} lists-create-btn`}
              onClick={() => setIsCreating((v) => !v)}
            >
              {isCreating ? "Cancel" : "+ New list"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Create list panel */}
      {isCreating ? (
        <div className="list-create-panel glass">
          <div className="list-create-header">
            <div>
              <strong>New list</strong>
              <p className="copy">Give it a name, a vibe, and pick who can see it.</p>
            </div>
          </div>
          <div className="list-edit-fields">
            <div className="list-edit-field-group">
              <label className="list-edit-label">List name *</label>
              <input
                id="new-list-name"
                className="search-input list-edit-input"
                type="text"
                placeholder="e.g. Rainy night picks, Comfort rewatches…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
              />
            </div>
            <div className="list-edit-field-group">
              <label className="list-edit-label">Description (optional)</label>
              <textarea
                id="new-list-description"
                className="search-input list-edit-input list-edit-textarea"
                placeholder="What's the thread connecting these titles?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="list-edit-row">
              <div className="list-edit-field-group">
                <label className="list-edit-label">Visibility</label>
                <select
                  id="new-list-visibility"
                  className="media-select"
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value as PrivacyLevel)}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <label className="upload-field list-cover-upload">
                <span className="list-edit-label">Cover (optional)</span>
                <div className="folder-upload-control">
                  <span className="button button-secondary folder-upload-button">Choose image</span>
                  <span className="folder-upload-name">{newCover ? "Selected" : "PNG, JPG, WEBP"}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) setNewCoverFile(f);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="button-row">
            <button
              type="button"
              id="create-list-submit-btn"
              className="button button-primary"
              onClick={() => void handleCreate()}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Create list"}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>
          {createMsg ? <p className="media-action-message">{createMsg}</p> : null}
        </div>
      ) : null}

      {createMsg && !isCreating ? <p className="media-action-message" style={{ margin: "0 0 12px" }}>{createMsg}</p> : null}

      {/* Lists grid */}
      {filtered.length ? (
        <div className="lists-grid">
          {filtered.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              id={`list-card-${list.id}`}
              className="list-card glass"
              prefetch={false}
            >
              {/* Mosaic cover */}
              <div className="list-card-art" style={getListArtStyle(list.coverUrl, list.items)}>
                {!list.coverUrl && list.items.length >= 4 ? (
                  <div className="list-card-mosaic">
                    {list.items.slice(0, 4).map((item, i) => (
                      item.coverUrl ? (
                        <img key={i} src={item.coverUrl} alt={item.title} className="list-card-mosaic-img" />
                      ) : (
                        <div key={i} className="list-card-mosaic-placeholder" />
                      )
                    ))}
                  </div>
                ) : !list.coverUrl && list.items.length ? (
                  <div className="list-card-single-cover">
                    {list.items[0].coverUrl ? (
                      <img src={list.items[0].coverUrl} alt={list.items[0].title} className="list-card-mosaic-img list-card-single-img" />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Info */}
              <div className="list-card-body">
                <div className="list-card-meta">
                  <span className={`list-card-visibility list-visibility-${list.visibility}`}>
                    {privacyLabel(list.visibility)}
                  </span>
                  <span className="list-card-count">{list.items.length} {list.items.length === 1 ? "title" : "titles"}</span>
                </div>
                <strong className="list-card-name">{list.name}</strong>
                <p className="list-card-desc">
                  {list.description?.trim()
                    ? list.description
                    : list.items.length
                      ? `${list.items.slice(0, 3).map((i) => i.title).join(", ")}${list.items.length > 3 ? " and more." : "."}`
                      : "An empty list waiting for its first picks."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="folder-empty glass">
          <p className="headline">
            {lists.length ? "No lists match that search." : viewingOwnProfile ? "No lists yet." : "No visible lists."}
          </p>
          <p className="copy">
            {lists.length
              ? "Try a different search term."
              : viewingOwnProfile
                ? "Create your first list with the button above, then add media from any detail page."
                : "This user hasn't made any public lists yet."}
          </p>
        </div>
      )}

      <ImageAdjusterModal
        file={newCoverFile}
        title="Adjust list cover"
        onClose={() => setNewCoverFile(null)}
        onApply={(dataUrl) => setNewCover(dataUrl)}
      />
    </div>
  );
}
