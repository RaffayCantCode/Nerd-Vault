export type UnifiedMedia = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  type: "Movie" | "Series" | "Anime" | "Game";
  year: string;
  rating: string; // Out of 5 (e.g. "4.3")
  genre: string;
  genres: string[];
  poster: string;
  backdrop?: string;
  overview: string;
  runtime?: string;
  director?: string;
  cast?: string[];
  platform?: string;
  studio?: string;
  trailerUrl?: string;
  audio?: string;
  status?: "Watching" | "Completed" | "Wishlist" | "Favorite" | "Dropped" | "Paused";
  progress?: number;
  userRating?: number; // 1 to 5
  notes?: string;
  source: "tmdb" | "anilist" | "igdb" | "local";
  sourceId: string;
  franchise?: {
    name: string;
    items: UnifiedMedia[];
  };
  similar?: UnifiedMedia[];
};

export type VaultStats = {
  totalCollected: number;
  hoursWatched: number;
  topGenre: string;
  topGenreCount: number;
  averageRating: number; // Out of 5
  tasteScore: number; // Out of 5
  genresBreakdown: Array<{ name: string; count: number; percentage: number; color: string }>;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  bio?: string;
  image?: string;
  role?: string;
};

export type HomeFeedData = {
  featured: UnifiedMedia;
  continueWatching: UnifiedMedia[];
  curatedForYou: UnifiedMedia[];
  trendingMovies: UnifiedMedia[];
  trendingShows: UnifiedMedia[];
  topAnime: UnifiedMedia[];
  popularGames: UnifiedMedia[];
  weeklyDrop: {
    title: string;
    description: string;
    items: UnifiedMedia[];
  };
};

export type Shelf = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  itemCount: number;
  isPublic: boolean;
  color?: string;
  coverImage?: string;
};

export type ActivityItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string;
  mediaType?: string;
  action: string;
  detail?: string;
  createdAt: string;
};

export type FriendRecommendation = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  mediaId: string;
  mediaTitle: string;
  mediaPoster?: string;
  mediaType?: string;
  note?: string;
  createdAt: string;
};

const BASE_URL = "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("nv_user_id");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export type MediaReview = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  mediaId: string;
  rating?: number;
  content: string;
  isPrivate: boolean;
  isOwner: boolean;
  likesCount: number;
  createdAt: string;
};

export const api = {
  // Auth
  getMe: () => request<{ user: UserProfile | null }>("/api/auth/me"),
  login: (email: string, pass: string) =>
    request<{ user: UserProfile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    }),
  register: (name: string, email: string, pass: string) =>
    request<{ user: UserProfile }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password: pass }),
    }),
  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  // Catalog
  getHomeFeed: () => request<HomeFeedData>("/api/catalog/home"),
  discover: (params: { type?: string; genre?: string; mood?: string; sort?: string; search?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== "All types") query.set("type", params.type);
    if (params.genre && params.genre !== "All genres") query.set("genre", params.genre);
    if (params.mood) query.set("mood", params.mood);
    if (params.sort) query.set("sort", params.sort);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    return request<{ items: UnifiedMedia[]; total: number }>(`/api/catalog/discover?${query.toString()}`);
  },
  search: (q: string) => request<{ items: UnifiedMedia[] }>(`/api/catalog/search?q=${encodeURIComponent(q)}`),
  getMediaDetail: (id: string) => request<{ item: UnifiedMedia }>(`/api/catalog/media/${encodeURIComponent(id)}`),
  getReviews: (mediaId: string) => request<{ reviews: MediaReview[] }>(`/api/catalog/media/${encodeURIComponent(mediaId)}/reviews`),

  // Vault
  getVault: () => request<{ items: UnifiedMedia[]; stats: VaultStats }>("/api/vault"),
  trackMedia: (data: {
    mediaId: string;
    media: Partial<UnifiedMedia>;
    status: string;
    rating?: number;
    notes?: string;
    progress?: number;
  }) =>
    request<{ success: boolean; item: any }>("/api/vault/track", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeFromVault: (mediaId: string) =>
    request<{ success: boolean }>("/api/vault/remove", {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),

  // Shelves
  getShelves: () => request<{ shelves: Shelf[] }>("/api/shelves"),
  createShelf: (data: { name: string; description?: string; isPublic?: boolean; color?: string }) =>
    request<{ shelf: Shelf }>("/api/shelves", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteShelf: (id: string) => request<{ success: boolean }>(`/api/shelves/${id}`, { method: "DELETE" }),
  addMediaToShelf: (shelfId: string, mediaId: string) =>
    request<{ success: boolean }>(`/api/shelves/${shelfId}/items`, {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),

  // Social
  getSocialActivity: () => request<{ activity: any[] }>("/api/social/activity"),
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
  getRecommendations: () => request<{ recommendations: any[] }>("/api/social/recommendations"),
  recommendMedia: (toUserId: string, mediaId: string, note?: string) =>
    request<{ success: boolean }>("/api/social/recommend", {
      method: "POST",
      body: JSON.stringify({ toUserId, mediaId, note }),
    }),
  dismissRecommendation: (id: string) =>
    request<{ success: boolean }>(`/api/social/recommendations/${id}/dismiss`, { method: "POST" }),

  // Profile
  getProfile: (id?: string) => request<{ user: UserProfile; stats: VaultStats; favorites: UnifiedMedia[]; recentActivity: any[] }>(id ? `/api/profile/${id}` : "/api/profile"),
  updateProfile: (data: { name?: string; bio?: string; image?: string }) =>
    request<{ user: UserProfile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
