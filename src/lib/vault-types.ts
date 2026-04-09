import { MediaItem } from "@/lib/types";

export type PrivacyLevel = "public" | "friends" | "private";

export type StoredFolder = {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  visibility: PrivacyLevel;
  items: MediaItem[];
};

export type LibraryState = {
  watched: MediaItem[];
  wishlist: MediaItem[];
  folders: StoredFolder[];
};

export type SocialNotification = {
  id: string;
  type: "friend-request" | "friend-accepted" | "recommendation" | "info";
  fromUserId: string;
  fromUserName?: string;
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
  inbox: SocialNotification[];
};

export type VaultProfilePayload = {
  viewerProfile: SocialProfile;
  viewedProfile: SocialProfile;
  friends: SocialProfile[];
  watched: MediaItem[];
  wishlist: MediaItem[];
  folders: StoredFolder[];
  canSeeWatched: boolean;
  canSeeWishlist: boolean;
  viewingOwnProfile: boolean;
};
