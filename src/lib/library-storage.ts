"use client";

import { MediaItem } from "@/lib/types";

export type StoredFolder = {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  items: MediaItem[];
};

export type LibraryState = {
  watched: MediaItem[];
  wishlist: MediaItem[];
  folders: StoredFolder[];
};

const STORAGE_KEY = "afterglow-library";
const LIBRARY_EVENT = "afterglow-library-change";

const defaultState: LibraryState = {
  watched: [],
  wishlist: [],
  folders: [],
};

function isBrowser() {
  return typeof window !== "undefined";
}

function mediaKey(item: MediaItem) {
  return `${item.source}-${item.sourceId}`;
}

function dedupeMedia(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = mediaKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function emitLibraryChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(LIBRARY_EVENT));
}

export function readLibraryState(): LibraryState {
  if (!isBrowser()) {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    return {
      watched: Array.isArray(parsed.watched) ? parsed.watched : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
    };
  } catch {
    return defaultState;
  }
}

export function writeLibraryState(nextState: LibraryState) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  emitLibraryChange();
}

export function subscribeLibraryChanges(callback: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handler = () => callback();
  window.addEventListener(LIBRARY_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(LIBRARY_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function isInWatched(item: MediaItem) {
  return readLibraryState().watched.some((entry) => mediaKey(entry) === mediaKey(item));
}

export function isInWishlist(item: MediaItem) {
  return readLibraryState().wishlist.some((entry) => mediaKey(entry) === mediaKey(item));
}

export function addToWatched(item: MediaItem) {
  const state = readLibraryState();
  const watched = dedupeMedia([item, ...state.watched]);
  const wishlist = state.wishlist.filter((entry) => mediaKey(entry) !== mediaKey(item));
  writeLibraryState({
    ...state,
    watched,
    wishlist,
  });
}

export function addToWishlist(item: MediaItem) {
  const state = readLibraryState();
  const wishlist = dedupeMedia([item, ...state.wishlist]);
  writeLibraryState({
    ...state,
    wishlist,
  });
}

export function removeFromWishlist(item: MediaItem) {
  const state = readLibraryState();
  writeLibraryState({
    ...state,
    wishlist: state.wishlist.filter((entry) => mediaKey(entry) !== mediaKey(item)),
  });
}

export function createFolder(name: string, coverUrl?: string, description?: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const state = readLibraryState();
  const existing = state.folders.find((folder) => folder.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    return existing;
  }

  const folder: StoredFolder = {
    id: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: trimmed,
    description: description?.trim() || undefined,
    coverUrl: coverUrl?.trim() || undefined,
    items: [],
  };

  writeLibraryState({
    ...state,
    folders: [folder, ...state.folders],
  });

  return folder;
}

export function addItemToFolder(folderId: string, item: MediaItem) {
  const state = readLibraryState();
  const folders = state.folders.map((folder) => {
    if (folder.id !== folderId) {
      return folder;
    }

    return {
      ...folder,
      items: dedupeMedia([item, ...folder.items]),
    };
  });

  writeLibraryState({
    ...state,
    folders,
  });
}

export function updateFolder(folderId: string, updates: { name?: string; coverUrl?: string; description?: string }) {
  const state = readLibraryState();
  const nextName = updates.name?.trim();
  const nextCover = updates.coverUrl?.trim();
  const nextDescription = updates.description?.trim();

  const folders = state.folders.map((folder) => {
    if (folder.id !== folderId) {
      return folder;
    }

    const resolvedName = nextName || folder.name;

    return {
      ...folder,
      name: resolvedName,
      description: nextDescription || undefined,
      coverUrl: nextCover || undefined,
    };
  });

  writeLibraryState({
    ...state,
    folders,
  });
}
