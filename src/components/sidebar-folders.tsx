"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { readFileAsDataUrl } from "@/lib/read-file-as-data-url";
import { createLibraryFolder, fetchLibraryState, subscribeVaultChanges } from "@/lib/vault-client";
import { StoredFolder } from "@/lib/vault-types";

function getFolderArtStyle(coverUrl?: string) {
  if (!coverUrl) {
    return {
      background:
        "radial-gradient(circle at top left, rgba(157, 184, 255, 0.34), transparent 42%), linear-gradient(135deg, rgba(26, 31, 44, 1), rgba(16, 19, 29, 1))",
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, rgba(10, 13, 21, 0.18), rgba(10, 13, 21, 0.58)), url(${coverUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function SidebarFolders() {
  const [folders, setFolders] = useState<StoredFolder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderCover, setFolderCover] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFolder = searchParams.get("folder");

  useEffect(() => {
    function sync() {
      fetchLibraryState()
        .then((library) => setFolders(library.folders))
        .catch(() => setFolders([]));
    }

    sync();
    return subscribeVaultChanges(sync);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  async function handleCreateFolder() {
    await createLibraryFolder({
      name: folderName,
      description: folderDescription,
      coverUrl: folderCover,
    });

    setFolderName("");
    setFolderDescription("");
    setFolderCover("");
    setIsCreating(false);
  }

  async function handleFolderFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setFolderCover(dataUrl);
  }

  return (
    <>
      <button
        type="button"
        className={`sidebar-icon-button ${isCreating ? "is-active" : ""}`}
        aria-label="Create folder"
        title="Create folder"
        onClick={() => setIsCreating((current) => !current)}
      >
        <span>+</span>
      </button>

      {isCreating && isMounted
        ? createPortal(
            <div className="sidebar-modal-shell" onClick={() => setIsCreating(false)}>
              <div className="sidebar-folder-modal glass" onClick={(event) => event.stopPropagation()}>
                <div className="sidebar-folder-modal-header">
                  <div>
                    <strong>New folder</strong>
                    <p className="copy">Give it a vibe, a cover, and it will drop straight into your rail.</p>
                  </div>
                  <button type="button" className="topbar-panel-close" onClick={() => setIsCreating(false)}>
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
                <label className="sidebar-folder-upload folder-upload-field">
                  <span>Upload cover</span>
                  <div className="folder-upload-control">
                    <span className="button button-secondary folder-upload-button">Choose cover image</span>
                    <span className="folder-upload-name">{folderCover ? "Cover image selected" : "PNG, JPG, or WEBP"}</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFolderFileChange} />
                </label>
                <div className="sidebar-folder-actions">
                  <button type="button" className="button button-primary" onClick={() => void handleCreateFolder()} disabled={!folderName.trim()}>
                    Create folder
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => setIsCreating(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="sidebar-folder-stack">
        {folders.map((folder) => (
          <Link
            key={folder.id}
            href={`/profile?folder=${folder.id}`}
            className={`sidebar-folder-tile ${pathname === "/profile" && activeFolder === folder.id ? "is-active" : ""}`}
            title={folder.name}
            aria-label={folder.name}
          >
            <span className="sidebar-folder-art" style={getFolderArtStyle(folder.coverUrl)} />
          </Link>
        ))}
      </div>
    </>
  );
}
