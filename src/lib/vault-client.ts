"use client";

import { MediaItem } from "@/lib/types";
import { LibraryState, PrivacyLevel, VaultProfilePayload } from "@/lib/vault-types";

const VAULT_EVENT = "nerdvault-data-change";
const CACHE_TTL_MS = 8000;
const requestCache = new Map<string, { expiresAt: number; value: unknown }>();
const inflightRequests = new Map<string, Promise<unknown>>();

function emitVaultChange() {
  if (typeof window === "undefined") return;
  requestCache.clear();
  inflightRequests.clear();
  window.dispatchEvent(new Event(VAULT_EVENT));
}

async function withCachedRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = requestCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = load().then((value) => {
    requestCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });
    inflightRequests.delete(key);
    return value;
  }).catch((error) => {
    inflightRequests.delete(key);
    throw error;
  });

  inflightRequests.set(key, promise);
  return promise;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { ok?: boolean; message?: string };
  if (!response.ok || (typeof payload === "object" && payload !== null && "ok" in payload && payload.ok === false)) {
    throw new Error((payload as { message?: string }).message || "Request failed");
  }

  return payload;
}

async function mutate(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  await readJson(response);
  emitVaultChange();
}

export function subscribeVaultChanges(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(VAULT_EVENT, callback);
  return () => window.removeEventListener(VAULT_EVENT, callback);
}

export async function fetchLibraryState(): Promise<LibraryState> {
  return withCachedRequest("library", async () => {
    const response = await fetch("/api/library", { cache: "no-store" });
    const payload = await readJson<LibraryState & { ok: true }>(response);
    return {
      watched: payload.watched,
      wishlist: payload.wishlist,
      folders: payload.folders,
    };
  });
}

export async function fetchProfilePayload(userId?: string): Promise<VaultProfilePayload> {
  const params = userId ? `?user=${encodeURIComponent(userId)}` : "";
  return withCachedRequest(`profile:${params || "self"}`, async () => {
    const response = await fetch(`/api/profile${params}`, { cache: "no-store" });
    return readJson<VaultProfilePayload & { ok: true }>(response);
  });
}

export async function fetchUserSearch(query: string) {
  return withCachedRequest(`user-search:${query.trim().toLowerCase()}`, async () => {
    const response = await fetch(`/api/social/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
    const payload = await readJson<{ ok: true; results: Array<{ id: string; name: string; handle: string; avatarUrl?: string; relationship: string }> }>(response);
    return payload.results;
  });
}

export async function saveProfileSettings(input: {
  avatarUrl?: string;
  bio?: string;
  watchedVisibility?: PrivacyLevel;
  wishlistVisibility?: PrivacyLevel;
  foldersDefaultVisibility?: PrivacyLevel;
}) {
  await mutate("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addMediaToWatched(item: MediaItem) {
  await mutate("/api/library/watched", {
    method: "POST",
    body: JSON.stringify({ item }),
  });
}

export async function removeMediaFromWatched(item: MediaItem) {
  await mutate(`/api/library/watched?source=${encodeURIComponent(item.source)}&sourceId=${encodeURIComponent(item.sourceId)}`, {
    method: "DELETE",
  });
}

export async function addMediaToWishlist(item: MediaItem) {
  await mutate("/api/library/wishlist", {
    method: "POST",
    body: JSON.stringify({ item }),
  });
}

export async function removeMediaFromWishlist(item: MediaItem) {
  await mutate(`/api/library/wishlist?source=${encodeURIComponent(item.source)}&sourceId=${encodeURIComponent(item.sourceId)}`, {
    method: "DELETE",
  });
}

export async function createLibraryFolder(input: { name: string; description?: string; coverUrl?: string }) {
  await mutate("/api/library/folders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveFolder(folderId: string, input: {
  name?: string;
  description?: string;
  coverUrl?: string;
  visibility?: PrivacyLevel;
}) {
  await mutate(`/api/library/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addMediaToFolder(folderId: string, item: MediaItem) {
  await mutate(`/api/library/folders/${encodeURIComponent(folderId)}/items`, {
    method: "POST",
    body: JSON.stringify({ item }),
  });
}

export async function removeMediaFromFolder(folderId: string, item: MediaItem) {
  await mutate(
    `/api/library/folders/${encodeURIComponent(folderId)}/items?source=${encodeURIComponent(item.source)}&sourceId=${encodeURIComponent(item.sourceId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function requestFriend(targetId: string) {
  await mutate("/api/social/friends/request", {
    method: "POST",
    body: JSON.stringify({ targetId }),
  });
}

export async function acceptFriend(fromUserId: string) {
  await mutate("/api/social/friends/accept", {
    method: "POST",
    body: JSON.stringify({ fromUserId }),
  });
}

export async function recommendToFriend(targetId: string, item: MediaItem) {
  await mutate("/api/social/recommend", {
    method: "POST",
    body: JSON.stringify({ targetId, item }),
  });
}

export async function markInboxRead(notificationId: string) {
  await mutate(`/api/social/notifications/${encodeURIComponent(notificationId)}`, {
    method: "PATCH",
  });
}

export async function dismissInboxNotification(notificationId: string) {
  await mutate(`/api/social/notifications/${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
  });
}
