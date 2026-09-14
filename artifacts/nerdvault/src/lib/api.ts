import { mediaCache } from "./mediaCache";

export type MediaType = "Movie" | "Series" | "Anime" | "Game";

export type UnifiedMedia = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  year: string;
  releaseDate?: string;
  rating: string;
  genre: string;
  genres: string[];
  poster: string;
  backdrop?: string;
  overview: string;
  runtime?: string;
  airingStatus?: "Completed" | "Ongoing" | "Upcoming" | string;
  director?: string;
  cast?: string[];
  platform?: string;
  studio?: string;
  trailerUrl?: string;
  audio?: string;
  status?: "Watching" | "Completed" | "Wishlist" | "Favorite" | "Dropped" | "Paused";
  progress?: number;
  userRating?: number;
  notes?: string;
  source: "tmdb" | "anilist" | "igdb" | "local";
  sourceId: string;
  franchise?: {
    name: string;
    items: UnifiedMedia[];
  };
  similar?: UnifiedMedia[];
  highlightTag?: string;
};

export type HomeFeedData = {
  featured: UnifiedMedia;
  featuredSlides?: UnifiedMedia[];
  trendingMovies: UnifiedMedia[];
  trendingShows: UnifiedMedia[];
  topAnime: UnifiedMedia[];
  popularGames: UnifiedMedia[];
  weeklyDrop: UnifiedMedia[];
};

export type VaultStats = {
  totalCollected: number;
  hoursWatched: number;
  topGenre: string;
  topGenreCount: number;
  averageRating: number;
  tasteScore: number;
  genresBreakdown: Array<{ name: string; count: number; percentage: number; color: string }>;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
};

export type Shelf = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  visibility?: string;
  isPublic?: boolean;
  itemCount?: number;
  items?: UnifiedMedia[];
  ownerName?: string;
  ownerAvatar?: string;
  isOwner?: boolean;
  createdAt?: string;
  created_at?: string;
};

export type ActivityItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string;
  mediaType: string;
  action: string;
  detail?: string;
  rating?: number;
  createdAt: string;
};

export type FriendRecommendation = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string;
  mediaType: string;
  note: string;
  createdAt: string;
};

export type MediaReview = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating?: number;
  reviewText?: string;
  content?: string;
  isPrivate?: boolean;
  isOwner?: boolean;
  likesCount?: number;
  likes?: number;
  isLiked?: boolean;
  createdAt?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("nv_user_id");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) message = parsed.error;
    } catch {}
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

export const api = {
  // Auth
  getMe: () => request<{ user: UserProfile | null }>("/api/auth/me"),
  login: (data: { email: string; password: string } | string, pass?: string) => {
    const payload = typeof data === "string" ? { email: data, password: pass } : data;
    return request<{ user: UserProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  register: (data: { name: string; email: string; password: string } | string, email?: string, pass?: string) => {
    const payload = typeof data === "string" ? { name: data, email, password: pass } : data;
    return request<{ user: UserProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  // Catalog
  getHomeFeed: async () => {
    const data = await request<HomeFeedData>("/api/catalog/home");
    if (data) {
      if (data.featured) mediaCache.set(data.featured);
      if (data.featuredSlides) mediaCache.setMany(data.featuredSlides);
      if (data.trendingMovies) mediaCache.setMany(data.trendingMovies);
      if (data.trendingShows) mediaCache.setMany(data.trendingShows);
      if (data.topAnime) mediaCache.setMany(data.topAnime);
      if (data.popularGames) mediaCache.setMany(data.popularGames);
      if (data.weeklyDrop) mediaCache.setMany(data.weeklyDrop);
    }
    return data;
  },
  discover: async (params: { type?: string; genre?: string; mood?: string; sort?: string; search?: string; page?: number; seed?: number | string; curation?: string }) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== "All types") query.set("type", params.type);
    if (params.genre && params.genre !== "All genres") query.set("genre", params.genre);
    if (params.mood) query.set("mood", params.mood);
    if (params.sort) query.set("sort", params.sort);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.seed !== undefined) query.set("seed", String(params.seed));
    if (params.curation && params.curation !== "All") query.set("curation", params.curation);
    const data = await request<{ items: UnifiedMedia[]; total: number }>(`/api/catalog/discover?${query.toString()}`);
    if (data?.items) {
      mediaCache.setMany(data.items);
    }
    return data;
  },
  search: async (q: string, type?: string) => {
    const query = new URLSearchParams({ q });
    if (type && type !== "All types") query.set("type", type);
    const data = await request<{ items: UnifiedMedia[] }>(`/api/catalog/search?${query.toString()}`);
    if (data?.items) {
      mediaCache.setMany(data.items);
    }
    return data;
  },
  getMediaDetail: async (id: string) => {
    const cacheKey = `media_detail_${id}`;
    const cached = mediaCache.getCachedQuery<{ item: UnifiedMedia }>(cacheKey);
    if (cached) return cached;

    const data = await request<{ item: UnifiedMedia }>(`/api/catalog/media/${encodeURIComponent(id)}`);
    if (data?.item) {
      mediaCache.set(data.item);
      mediaCache.setCachedQuery(cacheKey, data, 1000 * 60 * 10);
    }
    return data;
  },
  getReviews: async (mediaId: string) => {
    const cacheKey = `media_reviews_${mediaId}`;
    const cached = mediaCache.getCachedQuery<{ reviews: MediaReview[] }>(cacheKey);
    if (cached) return cached;

    const data = await request<{ reviews: MediaReview[] }>(`/api/catalog/media/${encodeURIComponent(mediaId)}/reviews`);
    if (data) {
      mediaCache.setCachedQuery(cacheKey, data, 1000 * 60 * 3);
    }
    return data;
  },

  // Vault
  getVault: () => request<{ items: UnifiedMedia[]; stats: VaultStats }>("/api/vault"),
  trackMedia: (data: {
    mediaId: string;
    media?: Partial<UnifiedMedia>;
    mediaData?: Partial<UnifiedMedia>;
    status: string;
    rating?: number;
    notes?: string;
    progress?: number;
  }) =>
    request<{ success: boolean; item?: any; items?: UnifiedMedia[]; stats?: VaultStats }>("/api/vault/track", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        media: data.media || data.mediaData,
      }),
    }),
  removeFromVault: (mediaId: string) =>
    request<{ success: boolean }>("/api/vault/remove", {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),
  removeMedia: (mediaId: string) =>
    request<{ success: boolean }>("/api/vault/remove", {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),

  // Shelves
  getShelves: () => request<{ shelves: Shelf[] }>("/api/shelves"),
  getShelfDetail: (idOrSlug: string) =>
    request<{ shelf: Shelf; items: UnifiedMedia[] }>(`/api/shelves/${encodeURIComponent(idOrSlug)}`),
  createShelf: (data: { name: string; description?: string; isPublic?: boolean; visibility?: string; color?: string; coverUrl?: string }) =>
    request<{ shelf: Shelf }>("/api/shelves", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateShelf: (id: string, data: { name?: string; description?: string; visibility?: string; coverUrl?: string }) =>
    request<{ shelf: Shelf }>(`/api/shelves/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteShelf: (id: string) => request<{ success: boolean }>(`/api/shelves/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addMediaToShelf: (shelfId: string, mediaId: string, mediaData?: Partial<UnifiedMedia>) =>
    request<{ success: boolean }>(`/api/shelves/${encodeURIComponent(shelfId)}/items`, {
      method: "POST",
      body: JSON.stringify({ mediaId, mediaData }),
    }),
  removeMediaFromShelf: (shelfId: string, mediaId: string) =>
    request<{ success: boolean }>(`/api/shelves/${encodeURIComponent(shelfId)}/items/${encodeURIComponent(mediaId)}`, {
      method: "DELETE",
    }),

  // Social
  getActivity: () => request<{ activity: ActivityItem[] }>("/api/social/activity"),
  getSocialActivity: () => request<{ activity: ActivityItem[] }>("/api/social/activity"),
  getFriends: () => request<{ friends: UserProfile[]; suggested: UserProfile[] }>("/api/social/friends"),
  sendFriendRequest: (toUserId: string) =>
    request<{ success: boolean }>("/api/social/request", {
      method: "POST",
      body: JSON.stringify({ toUserId }),
    }),
  respondFriendRequest: (fromUserId: string, action: "accept" | "decline") =>
    request<{ success: boolean }>("/api/social/respond-request", {
      method: "POST",
      body: JSON.stringify({ fromUserId, action }),
    }),
  searchUsers: (q: string) =>
    request<{ users: Array<UserProfile & { friendStatus: "none" | "friend" | "pending_sent" | "pending_received"; totalVaultItems: number }> }>(
      `/api/social/search-users?q=${encodeURIComponent(q)}`
    ),
  getNotifications: () => request<{ notifications: any[] }>("/api/social/notifications"),
  markNotificationsRead: (notificationId?: string) =>
    request<{ success: boolean }>("/api/social/notifications/read", {
      method: "POST",
      body: JSON.stringify({ notificationId }),
    }),
  getRecommendations: () => request<{ recommendations: FriendRecommendation[] }>("/api/social/recommendations"),
  sendRecommendation: (dataOrToUser: { toUserId: string; mediaId: string; note?: string } | string, mediaId?: string, note?: string) => {
    const payload = typeof dataOrToUser === "string"
      ? { toUserId: dataOrToUser, mediaId, note }
      : dataOrToUser;
    return request<{ success: boolean }>("/api/social/recommend", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  recommendMedia: (dataOrToUser: { toUserId: string; mediaId: string; note?: string } | string, mediaId?: string, note?: string) => {
    const payload = typeof dataOrToUser === "string"
      ? { toUserId: dataOrToUser, mediaId, note }
      : dataOrToUser;
    return request<{ success: boolean }>("/api/social/recommend", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  dismissRecommendation: (id: string) =>
    request<{ success: boolean }>(`/api/social/recommendations/${id}/dismiss`, { method: "POST" }),

  // Profile
  getProfile: (id?: string) => request<{ user: UserProfile; stats: VaultStats; favorites: UnifiedMedia[]; logs?: UnifiedMedia[]; recentActivity: any[]; isOwner?: boolean }>(id ? `/api/profile/${id}` : "/api/profile"),
  updateProfile: (data: { name?: string; bio?: string; image?: string }) =>
    request<{ user: UserProfile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
