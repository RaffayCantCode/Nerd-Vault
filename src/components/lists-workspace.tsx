"use client";

import { useDeferredValue, useMemo, useState, ChangeEvent } from "react";
import Link from "next/link";
import { ImageAdjusterModal } from "@/components/image-adjuster-modal";
import { createUserList } from "@/lib/vault-client";
import { PrivacyLevel, StoredList } from "@/lib/vault-types";
import { Plus, Search, Layers, Lock, Globe, Users } from "lucide-react";

function getListArtStyle(coverUrl?: string, items?: { coverUrl?: string }[]) {
  if (coverUrl) {
    return {
      backgroundImage: `linear-gradient(160deg, rgba(8,12,24,0.2), rgba(8,12,24,0.65)), url(${coverUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

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

function privacyIcon(v: PrivacyLevel) {
  if (v === "public") return <Globe size={11} />;
  if (v === "friends") return <Users size={11} />;
  return <Lock size={11} />;
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
    <div className="lists-workspace" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Action header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 400 }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(226, 232, 240, 0.45)" }}
          />
          <input
            className="search-input library-search-input"
            style={{ paddingLeft: "2.5rem", width: "100%" }}
            type="search"
            placeholder="Filter lists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {viewingOwnProfile && (
          <button
            type="button"
            className={`button ${isCreating ? "button-secondary" : "button-primary"}`}
            style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}
            onClick={() => setIsCreating((v) => !v)}
          >
            <Plus size={15} />
            <span>{isCreating ? "Cancel" : "New List"}</span>
          </button>
        )}
      </div>

      {/* Create list modal / form panel */}
      {isCreating && (
        <div className="list-create-panel glass" style={{ padding: "1.5rem", borderRadius: "18px" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 750, color: "#fff", margin: 0 }}>Create Curated List</h3>
          </div>
          <div className="list-edit-fields">
            <div className="list-edit-field-group">
              <label className="list-edit-label">List name</label>
              <input
                id="new-list-name"
                className="search-input list-edit-input"
                type="text"
                placeholder="e.g. Atmospheric Sci-Fi, Summer Rewatches"
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
                  <span className="button button-secondary folder-upload-button" style={{ fontSize: "0.8rem" }}>Choose image</span>
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
          <div className="button-row" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              id="create-list-submit-btn"
              className="button button-primary"
              onClick={() => void handleCreate()}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Save List"}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>
          {createMsg ? <p className="media-action-message">{createMsg}</p> : null}
        </div>
      )}

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

              <div className="list-card-body">
                <div className="list-card-meta">
                  <span className={`list-card-visibility list-visibility-${list.visibility}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {privacyIcon(list.visibility)}
                    {list.visibility}
                  </span>
                  <span className="list-card-count">{list.items.length} titles</span>
                </div>
                <strong className="list-card-name">{list.name}</strong>
                {list.description && (
                  <p className="list-card-desc">{list.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="nv-lb-empty-box" style={{ padding: "3rem 1.5rem" }}>
          <Layers size={28} style={{ color: "#5eead4" }} />
          <h4 style={{ fontSize: "1.05rem", fontWeight: 750, color: "#fff", margin: 0 }}>
            {lists.length ? "No matching lists" : "No curated lists yet"}
          </h4>
          <p className="nv-lb-empty-text" style={{ maxWidth: "38ch" }}>
            {lists.length
              ? "Try adjusting your search filter."
              : "Group your favorite movies, series, anime, and games into curated thematic shelves."}
          </p>
          {viewingOwnProfile && !lists.length && (
            <button
              type="button"
              className="button button-primary"
              style={{ fontSize: "0.85rem", padding: "0.5rem 1.5rem" }}
              onClick={() => setIsCreating(true)}
            >
              <Plus size={15} />
              <span>Create First List</span>
            </button>
          )}
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
