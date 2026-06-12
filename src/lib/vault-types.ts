import { MediaItem } from "@/lib/types";

export type PrivacyLevel = "public" | "friends" | "private";

export type StoredList = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  visibility: PrivacyLevel;
  items: MediaItem[];
  itemCount?: number;
};

/** @deprecated Use StoredList instead */
export type StoredFolder = StoredList;

export type LibraryState = {
  watched: MediaItem[];
  wishlist: MediaItem[];
  lists: StoredList[];
  /** @deprecated Use lists */
  folders?: StoredList[];
};

export type CommunityReview = {
  id: string;
  userId: string;
  username: string;
  userHandle: string;
  userAvatarUrl?: string;
  rating: number | null;
  title?: string;
  text?: string;
  datePosted: number;
  likeCount: number;
  dislikeCount: number;
};

export type CommunityRatingSummary = {
  average: number | null;
  count: number;
  reviews: CommunityReview[];
};

export type SocialNotification = {
  id: string;
  type: "friend-request" | "friend-accepted" | "recommendation" | "info";
  fromUserId: string;
  fromUserName?: string;
  message: string;
  media?: MediaItem;
  ratingSnapshot?: number | null;
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
  lists: StoredList[];
  /** @deprecated Use lists */
  folders?: StoredList[];
  canSeeWatched: boolean;
  canSeeWishlist: boolean;
  viewingOwnProfile: boolean;
};
