"use client";

import { StoredFolder } from "@/lib/library-storage";
import { MediaItem } from "@/lib/types";

export type PrivacyLevel = "public" | "friends" | "private";

export type SocialNotification = {
  id: string;
  type: "friend-request" | "friend-accepted" | "recommendation" | "info";
  fromUserId: string;
  message: string;
  media?: MediaItem;
  createdAt: number;
  status: "unread" | "read";
};

export type SocialProfile = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  friends: string[];
  watchedVisibility: PrivacyLevel;
  wishlistVisibility: PrivacyLevel;
  foldersDefaultVisibility: PrivacyLevel;
  folderVisibility: Record<string, PrivacyLevel>;
  inbox: SocialNotification[];
  showcaseWatched: MediaItem[];
  showcaseWishlist: MediaItem[];
  showcaseFolders: StoredFolder[];
};

type SocialState = {
  profiles: SocialProfile[];
};

const STORAGE_KEY = "afterglow-social";
const SOCIAL_EVENT = "afterglow-social-change";
const SHOWCASE_MEDIA_LIMIT = 48;
const SHOWCASE_FOLDER_LIMIT = 18;
const SHOWCASE_FOLDER_ITEMS_LIMIT = 18;

function isBrowser() {
  return typeof window !== "undefined";
}

function emitSocialChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(SOCIAL_EVENT));
}

export function buildViewerId(name?: string | null, email?: string | null) {
  const base = email || name || "guest-vault";
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "guest-vault";
}

function defaultProfile(id: string, name: string, avatarUrl?: string): SocialProfile {
  return {
    id,
    name,
    handle: `@${id}`,
    avatarUrl,
    bio: "Still curating the perfect vault.",
    friends: [],
    watchedVisibility: "public",
    wishlistVisibility: "friends",
    foldersDefaultVisibility: "public",
    folderVisibility: {},
    inbox: [],
    showcaseWatched: [],
    showcaseWishlist: [],
    showcaseFolders: [],
  };
}

function sanitizeProfiles(profiles: SocialProfile[]) {
  return profiles
    .filter((profile) => profile && profile.id && !profile.id.startsWith("demo-"))
    .map((profile) => ({
      ...profile,
      friends: Array.isArray(profile.friends) ? profile.friends.filter((friendId) => !friendId.startsWith("demo-")) : [],
      inbox: Array.isArray(profile.inbox)
        ? profile.inbox.filter((notification) => notification.fromUserId !== "demo-noor" && notification.fromUserId !== "demo-riven")
        : [],
      showcaseWatched: Array.isArray(profile.showcaseWatched) ? profile.showcaseWatched : [],
      showcaseWishlist: Array.isArray(profile.showcaseWishlist) ? profile.showcaseWishlist : [],
      showcaseFolders: Array.isArray(profile.showcaseFolders) ? profile.showcaseFolders : [],
      folderVisibility: profile.folderVisibility ?? {},
    }));
}

function compactMediaForShowcase(item: MediaItem, aggressive = false): MediaItem {
  return {
    ...item,
    overview: aggressive ? item.overview.slice(0, 120) : item.overview.slice(0, 220),
    screenshots: aggressive ? [] : (item.screenshots ?? []).slice(0, 2),
    credits: aggressive ? [] : item.credits.slice(0, 3),
  };
}

function compactFolderForShowcase(folder: StoredFolder, aggressive = false): StoredFolder {
  return {
    ...folder,
    items: folder.items
      .slice(0, aggressive ? 10 : SHOWCASE_FOLDER_ITEMS_LIMIT)
      .map((item) => compactMediaForShowcase(item, aggressive)),
  };
}

function compactProfileForStorage(profile: SocialProfile, aggressive = false): SocialProfile {
  return {
    ...profile,
    inbox: profile.inbox.slice(0, aggressive ? 20 : 40),
    showcaseWatched: profile.showcaseWatched
      .slice(0, aggressive ? 24 : SHOWCASE_MEDIA_LIMIT)
      .map((item) => compactMediaForShowcase(item, aggressive)),
    showcaseWishlist: profile.showcaseWishlist
      .slice(0, aggressive ? 24 : SHOWCASE_MEDIA_LIMIT)
      .map((item) => compactMediaForShowcase(item, aggressive)),
    showcaseFolders: profile.showcaseFolders
      .slice(0, aggressive ? 10 : SHOWCASE_FOLDER_LIMIT)
      .map((folder) => compactFolderForShowcase(folder, aggressive)),
  };
}

function buildPersistedState(state: SocialState, aggressive = false): SocialState {
  return {
    profiles: sanitizeProfiles(state.profiles).map((profile) => compactProfileForStorage(profile, aggressive)),
  };
}

function buildEmergencyState(state: SocialState): SocialState {
  return {
    profiles: sanitizeProfiles(state.profiles).map((profile) => ({
      ...profile,
      bio: profile.bio?.slice(0, 120),
      inbox: [],
      showcaseWatched: [],
      showcaseWishlist: [],
      showcaseFolders: [],
    })),
  };
}

export function readSocialState(): SocialState {
  const fallback: SocialState = { profiles: [] };
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SocialState>;
    return {
      profiles: Array.isArray(parsed.profiles) ? sanitizeProfiles(parsed.profiles as SocialProfile[]) : [],
    };
  } catch {
    return fallback;
  }
}

export function writeSocialState(nextState: SocialState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState(nextState)));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState(nextState, true)));
      } catch {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildEmergencyState(nextState)));
        } catch {
          return;
        }
      }
    } else {
      throw error;
    }
  }
  emitSocialChange();
}

export function subscribeSocialChanges(callback: () => void) {
  if (!isBrowser()) return () => undefined;

  const handler = () => callback();
  window.addEventListener(SOCIAL_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(SOCIAL_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function ensureViewerProfile(viewerId: string, viewerName: string, viewerAvatar?: string) {
  const state = readSocialState();
  const existing = state.profiles.find((profile) => profile.id === viewerId);
  if (existing) {
    if ((viewerAvatar && existing.avatarUrl !== viewerAvatar) || existing.name !== viewerName) {
      const profiles = state.profiles.map((profile) =>
        profile.id === viewerId
          ? {
              ...profile,
              name: viewerName,
              avatarUrl: viewerAvatar || existing.avatarUrl,
            }
          : profile,
      );
      writeSocialState({ profiles });
      return profiles.find((profile) => profile.id === viewerId) as SocialProfile;
    }
    return existing;
  }

  const created = defaultProfile(viewerId, viewerName, viewerAvatar);
  const profiles = [...state.profiles, created];
  writeSocialState({ profiles });
  return created;
}

export function getProfileById(profileId: string) {
  return readSocialState().profiles.find((profile) => profile.id === profileId);
}

export function searchProfiles(viewerId: string, query: string) {
  const normalized = query.trim().toLowerCase();
  return readSocialState().profiles.filter((profile) => {
    if (profile.id === viewerId) return false;
    if (!normalized) return true;
    return `${profile.name} ${profile.handle} ${profile.bio ?? ""}`.toLowerCase().includes(normalized);
  });
}

export function getFriends(viewerId: string) {
  const viewer = getProfileById(viewerId);
  if (!viewer) return [];
  return viewer.friends
    .map((friendId) => getProfileById(friendId))
    .filter((profile): profile is SocialProfile => Boolean(profile));
}

function addNotification(profile: SocialProfile, notification: SocialNotification) {
  return {
    ...profile,
    inbox: [notification, ...profile.inbox],
  };
}

export function sendFriendRequest(viewerId: string, targetId: string) {
  const state = readSocialState();
  const viewer = state.profiles.find((profile) => profile.id === viewerId);
  const target = state.profiles.find((profile) => profile.id === targetId);
  if (!viewer || !target) return;
  if (viewer.friends.includes(targetId)) return;

  const now = Date.now();
  const profiles = state.profiles.map((profile) => {
    if (profile.id === targetId) {
      return addNotification(profile, {
        id: `friend-target-${viewerId}-${targetId}-${now}`,
        type: "friend-request",
        fromUserId: viewerId,
        message: `${viewer.name} sent you a friend request.`,
        createdAt: now,
        status: "unread",
      });
    }

    if (profile.id === viewerId) {
      return addNotification(profile, {
        id: `friend-${viewerId}-${targetId}-${now}`,
        type: "info",
        fromUserId: targetId,
        message: `Friend request sent to ${target.name}.`,
        createdAt: now,
        status: "unread",
      });
    }

    return profile;
  });

  writeSocialState({ profiles });
}

export function acceptFriendRequest(viewerId: string, fromUserId: string) {
  const state = readSocialState();
  const viewer = state.profiles.find((profile) => profile.id === viewerId);
  const other = state.profiles.find((profile) => profile.id === fromUserId);
  if (!viewer || !other) return;

  const now = Date.now();
  const profiles: SocialProfile[] = state.profiles.map((profile) => {
    if (profile.id === viewerId) {
      return {
        ...profile,
        friends: [...new Set([...profile.friends, fromUserId])],
        inbox: profile.inbox.map((notification): SocialNotification =>
          notification.fromUserId === fromUserId && notification.type === "friend-request"
            ? { ...notification, type: "friend-accepted", message: `You accepted ${other.name}.`, status: "read" }
            : notification,
        ),
      };
    }

    if (profile.id === fromUserId) {
      return addNotification(
        {
          ...profile,
          friends: [...new Set([...profile.friends, viewerId])],
        },
        {
          id: `friend-accept-${viewerId}-${fromUserId}-${now}`,
          type: "friend-accepted",
          fromUserId: viewerId,
          message: `${viewer.name} accepted your friend request.`,
          createdAt: now,
          status: "unread",
        },
      );
    }

    return profile;
  });

  writeSocialState({ profiles });
}

export function markNotificationRead(viewerId: string, notificationId: string) {
  const state = readSocialState();
  writeSocialState({
    profiles: state.profiles.map((profile) =>
      profile.id === viewerId
        ? {
            ...profile,
            inbox: profile.inbox.map((notification) =>
              notification.id === notificationId ? { ...notification, status: "read" } : notification,
            ),
          }
        : profile,
    ),
  });
}

export function updateSocialProfile(
  viewerId: string,
  updates: {
    avatarUrl?: string;
    watchedVisibility?: PrivacyLevel;
    wishlistVisibility?: PrivacyLevel;
    foldersDefaultVisibility?: PrivacyLevel;
    folderVisibility?: Record<string, PrivacyLevel>;
    showcaseWatched?: MediaItem[];
    showcaseWishlist?: MediaItem[];
    showcaseFolders?: StoredFolder[];
  },
) {
  const state = readSocialState();
  writeSocialState({
    profiles: state.profiles.map((profile) =>
      profile.id === viewerId
        ? {
            ...profile,
            avatarUrl: updates.avatarUrl?.trim() || undefined,
            watchedVisibility: updates.watchedVisibility ?? profile.watchedVisibility,
            wishlistVisibility: updates.wishlistVisibility ?? profile.wishlistVisibility,
            foldersDefaultVisibility: updates.foldersDefaultVisibility ?? profile.foldersDefaultVisibility,
            folderVisibility: updates.folderVisibility ?? profile.folderVisibility,
            showcaseWatched: updates.showcaseWatched ?? profile.showcaseWatched,
            showcaseWishlist: updates.showcaseWishlist ?? profile.showcaseWishlist,
            showcaseFolders: updates.showcaseFolders ?? profile.showcaseFolders,
          }
        : profile,
    ),
  });
}

export function sendRecommendation(viewerId: string, targetId: string, media: MediaItem) {
  const state = readSocialState();
  const viewer = state.profiles.find((profile) => profile.id === viewerId);
  const target = state.profiles.find((profile) => profile.id === targetId);
  if (!viewer || !target) return;

  const now = Date.now();
  writeSocialState({
    profiles: state.profiles.map((profile) => {
      if (profile.id === viewerId) {
        return addNotification(profile, {
          id: `recommend-sent-${viewerId}-${targetId}-${now}`,
          type: "info",
          fromUserId: targetId,
          message: `You sent ${media.title} to ${target.name}.`,
          media,
          createdAt: now,
          status: "unread",
        });
      }

      if (profile.id === targetId) {
        return addNotification(profile, {
          id: `recommend-received-${viewerId}-${targetId}-${now}`,
          type: "recommendation",
          fromUserId: viewerId,
          message: `${viewer.name} recommended ${media.title}.`,
          media,
          createdAt: now,
          status: "unread",
        });
      }

      return profile;
    }),
  });
}

export function canViewPrivacy(
  profile: SocialProfile,
  viewerId: string,
  visibility: PrivacyLevel,
) {
  if (viewerId === profile.id) return true;
  if (visibility === "public") return true;
  if (visibility === "private") return false;
  return profile.friends.includes(viewerId);
}
