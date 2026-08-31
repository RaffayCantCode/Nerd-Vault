import { queryD1 } from "./client";
import { User, Media, WatchedItem, WishlistItem, Folder, Notification } from "./schema";

export type VaultItemWithMedia = {
  id: string;
  mediaId: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  type: string;
  status: "Watching" | "Completed" | "Wishlist" | "Favorite" | "Dropped" | "Paused" | string;
  releaseYear?: number;
  year?: string;
  runtime?: number;
  rating?: number;
  userRating?: number;
  notes?: string;
  poster?: string;
  backdrop?: string;
  coverUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  source: string;
  sourceId: string;
  genre?: string;
  genres?: string[];
  slug?: string;
  updatedAt: string;
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

// -------------------------------------------------------------
// USER DATA ACCESS
// -------------------------------------------------------------

export async function findUserById(id: string): Promise<User | null> {
  const rows = await queryD1<User>(
    `SELECT * FROM users WHERE id = ? LIMIT 1;`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await queryD1<User>(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;`,
    [email]
  );
  return rows[0] || null;
}

export async function createUser(user: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  image?: string;
  bio?: string;
}): Promise<User> {
  const id = user.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const passwordHash = user.passwordHash || user.password || null;

  try {
    await queryD1(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, image, bio)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, user.name, user.email, passwordHash, user.image || null, user.bio || null]
    );
  } catch (e) {
    console.error("createUser query error:", e);
  }

  const created = await findUserById(id);
  if (created) return created;

  return {
    id,
    name: user.name,
    email: user.email,
    passwordHash,
    image: user.image || null,
    bio: user.bio || null,
    role: "USER",
    hasSeenOnboarding: 0,
    watchedVisibility: "public",
    wishlistVisibility: "friends",
    foldersDefaultVisibility: "public",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailVerified: null,
  } as User;
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; bio?: string; image?: string; watchedVisibility?: string; wishlistVisibility?: string }
): Promise<User | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); params.push(data.name); }
  if (data.bio !== undefined) { sets.push("bio = ?"); params.push(data.bio); }
  if (data.image !== undefined) { sets.push("image = ?"); params.push(data.image); }
  if (data.watchedVisibility !== undefined) { sets.push("watched_visibility = ?"); params.push(data.watchedVisibility); }
  if (data.wishlistVisibility !== undefined) { sets.push("wishlist_visibility = ?"); params.push(data.wishlistVisibility); }

  if (sets.length === 0) return findUserById(userId);

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(userId);

  await queryD1(`UPDATE users SET ${sets.join(", ")} WHERE id = ?;`, params);
  return findUserById(userId);
}

// -------------------------------------------------------------
// MEDIA CATALOG DATA ACCESS
// -------------------------------------------------------------

export async function findMediaById(id: string): Promise<Media | null> {
  const rows = await queryD1<Media>(`SELECT * FROM media WHERE id = ? LIMIT 1;`, [id]);
  return rows[0] || null;
}

export async function findMediaBySource(source: string, sourceId: string): Promise<Media | null> {
  const rows = await queryD1<Media>(
    `SELECT * FROM media WHERE source = ? AND source_id = ? LIMIT 1;`,
    [source, sourceId]
  );
  return rows[0] || null;
}

export async function upsertMedia(media: {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  type: string;
  status?: string;
  releaseYear?: number;
  runtime?: number;
  rating?: number;
  coverUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  language?: string;
  source: string;
  sourceId: string;
}): Promise<Media> {
  await queryD1(
    `INSERT INTO media (id, slug, title, original_title, overview, type, status, release_year, runtime, rating, cover_url, backdrop_url, trailer_url, language, source, source_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       original_title = excluded.original_title,
       overview = excluded.overview,
       type = excluded.type,
       status = excluded.status,
       release_year = excluded.release_year,
       runtime = excluded.runtime,
       rating = excluded.rating,
       cover_url = excluded.cover_url,
       backdrop_url = excluded.backdrop_url,
       trailer_url = excluded.trailer_url,
       language = excluded.language,
       updated_at = CURRENT_TIMESTAMP;`,
    [
      media.id,
      media.slug,
      media.title,
      media.originalTitle || null,
      media.overview || null,
      media.type,
      media.status || null,
      media.releaseYear || null,
      media.runtime || null,
      media.rating || null,
      media.coverUrl || null,
      media.backdropUrl || null,
      media.trailerUrl || null,
      media.language || "en",
      media.source,
      media.sourceId,
    ]
  );
  return (await findMediaById(media.id))!;
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// USER VAULT TRACKING
// -------------------------------------------------------------

export async function getUserVaultItems(userId: string): Promise<VaultItemWithMedia[]> {
  const unifiedRows = await queryD1<{
    user_id: string;
    media_id: string;
    status: string;
    user_rating?: number;
    notes?: string;
    updated_at: string;
    title: string;
    original_title?: string;
    overview?: string;
    type: string;
    release_year?: number;
    runtime?: number;
    media_rating?: number;
    cover_url?: string;
    backdrop_url?: string;
    trailer_url?: string;
    source: string;
    source_id: string;
  }>(
    `SELECT v.user_id, v.media_id, v.status, v.user_rating, v.notes, v.updated_at,
            m.title, m.original_title, m.overview, m.type, m.release_year, m.runtime,
            m.rating as media_rating, m.cover_url, m.backdrop_url, m.trailer_url, m.source, m.source_id
     FROM user_vault_items v
     JOIN media m ON v.media_id = m.id
     WHERE v.user_id = ?
     ORDER BY v.updated_at DESC;`,
    [userId]
  );

  const watchedRows = await queryD1<{
    user_id: string;
    media_id: string;
    watched_at: string;
    rating?: number;
    notes?: string;
    status?: string;
    title: string;
    original_title?: string;
    overview?: string;
    type: string;
    release_year?: number;
    runtime?: number;
    media_rating?: number;
    cover_url?: string;
    backdrop_url?: string;
    trailer_url?: string;
    source: string;
    source_id: string;
  }>(
    `SELECT w.user_id, w.media_id, w.watched_at, w.rating, w.notes, w.status,
            m.title, m.original_title, m.overview, m.type, m.release_year, m.runtime,
            m.rating as media_rating, m.cover_url, m.backdrop_url, m.trailer_url, m.source, m.source_id
     FROM watched_items w
     JOIN media m ON w.media_id = m.id
     WHERE w.user_id = ?
     ORDER BY w.watched_at DESC;`,
    [userId]
  );

  const wishlistRows = await queryD1<{
    user_id: string;
    media_id: string;
    created_at: string;
    priority?: number;
    title: string;
    original_title?: string;
    overview?: string;
    type: string;
    release_year?: number;
    runtime?: number;
    media_rating?: number;
    cover_url?: string;
    backdrop_url?: string;
    trailer_url?: string;
    source: string;
    source_id: string;
  }>(
    `SELECT wl.user_id, wl.media_id, wl.created_at, wl.priority,
            m.title, m.original_title, m.overview, m.type, m.release_year, m.runtime,
            m.rating as media_rating, m.cover_url, m.backdrop_url, m.trailer_url, m.source, m.source_id
     FROM wishlist_items wl
     JOIN media m ON wl.media_id = m.id
     WHERE wl.user_id = ?
     ORDER BY wl.created_at DESC;`,
    [userId]
  );

  const itemMap = new Map<string, VaultItemWithMedia>();

  for (const r of unifiedRows) {
    const rawRating = r.user_rating ? (r.user_rating > 5 ? r.user_rating / 2 : r.user_rating) : undefined;
    itemMap.set(r.media_id, {
      id: r.media_id,
      mediaId: r.media_id,
      title: r.title,
      originalTitle: r.original_title,
      overview: r.overview || "",
      type: (r.type as any) || "Movie",
      status: (r.status as any) || "Watching",
      year: String(r.release_year || ""),
      releaseYear: r.release_year,
      runtime: r.runtime,
      rating: r.media_rating ? (r.media_rating > 5 ? r.media_rating / 2 : r.media_rating) : undefined,
      userRating: rawRating,
      notes: r.notes,
      poster: r.cover_url || "",
      coverUrl: r.cover_url || "",
      backdrop: r.backdrop_url || "",
      backdropUrl: r.backdrop_url || "",
      trailerUrl: r.trailer_url,
      source: (r.source as any) || "tmdb",
      sourceId: r.source_id || r.media_id,
      genre: "Featured",
      genres: [],
      slug: r.media_id,
      updatedAt: r.updated_at,
    });
  }

  for (const r of watchedRows) {
    if (!itemMap.has(r.media_id)) {
      const rawRating = r.rating ? (r.rating > 5 ? r.rating / 2 : r.rating) : undefined;
      const isFavorite = r.status === "Favorite" || (rawRating && rawRating >= 4.5) || r.notes?.toLowerCase().includes("#favorite");
      itemMap.set(r.media_id, {
        id: r.media_id,
        mediaId: r.media_id,
        title: r.title,
        originalTitle: r.original_title,
        overview: r.overview || "",
        type: (r.type as any) || "Movie",
        status: isFavorite ? "Favorite" : ((r.status as any) || "Completed"),
        year: String(r.release_year || ""),
        releaseYear: r.release_year,
        runtime: r.runtime,
        rating: r.media_rating ? (r.media_rating > 5 ? r.media_rating / 2 : r.media_rating) : undefined,
        userRating: rawRating,
        notes: r.notes,
        poster: r.cover_url || "",
        coverUrl: r.cover_url || "",
        backdrop: r.backdrop_url || "",
        backdropUrl: r.backdrop_url || "",
        trailerUrl: r.trailer_url,
        source: (r.source as any) || "tmdb",
        sourceId: r.source_id || r.media_id,
        genre: "Featured",
        genres: [],
        slug: r.media_id,
        updatedAt: r.watched_at,
      });
    }
  }

  for (const r of wishlistRows) {
    if (!itemMap.has(r.media_id)) {
      itemMap.set(r.media_id, {
        id: r.media_id,
        mediaId: r.media_id,
        title: r.title,
        originalTitle: r.original_title,
        overview: r.overview || "",
        type: (r.type as any) || "Movie",
        status: "Wishlist",
        year: String(r.release_year || ""),
        releaseYear: r.release_year,
        runtime: r.runtime,
        rating: r.media_rating ? (r.media_rating > 5 ? r.media_rating / 2 : r.media_rating) : undefined,
        poster: r.cover_url || "",
        coverUrl: r.cover_url || "",
        backdrop: r.backdrop_url || "",
        backdropUrl: r.backdrop_url || "",
        trailerUrl: r.trailer_url,
        source: (r.source as any) || "tmdb",
        sourceId: r.source_id || r.media_id,
        genre: "Featured",
        genres: [],
        slug: r.media_id,
        updatedAt: r.created_at,
      });
    }
  }

  return Array.from(itemMap.values());
}

export async function trackMediaInVault(params: {
  userId: string;
  mediaId: string;
  status: "Watching" | "Completed" | "Wishlist" | "Favorite" | "Dropped" | "Paused" | string;
  rating?: number;
  notes?: string;
  mediaData?: any;
}): Promise<void> {
  const { userId, mediaId, status, rating, notes, mediaData } = params;

  // 1. If media record doesn't exist yet or is supplied, upsert it
  if (mediaData) {
    const rawCover = mediaData.poster || mediaData.coverUrl || mediaData.cover_url || mediaData.image || (mediaData as any).banner;
    const rawBackdrop = mediaData.backdrop || mediaData.backdropUrl || mediaData.backdrop_url;
    await upsertMedia({
      id: mediaId,
      slug: mediaData.slug || mediaId,
      title: mediaData.title || "Untitled",
      originalTitle: mediaData.originalTitle,
      overview: mediaData.overview,
      type: mediaData.type || "Movie",
      releaseYear: mediaData.releaseYear || mediaData.year ? Number(mediaData.releaseYear || mediaData.year) : undefined,
      runtime: mediaData.runtime ? Number(mediaData.runtime.toString().replace(/\D/g, "")) : undefined,
      rating: mediaData.rating ? Number(mediaData.rating) : undefined,
      coverUrl: rawCover,
      backdropUrl: rawBackdrop,
      trailerUrl: mediaData.trailerUrl,
      source: mediaData.source || "tmdb",
      sourceId: mediaData.sourceId || mediaId,
    });
  }

  // 2. Insert into unified user_vault_items table
  const vaultItemId = `${userId}_${mediaId}`;
  await queryD1(
    `INSERT INTO user_vault_items (id, user_id, media_id, status, user_rating, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, media_id) DO UPDATE SET
       status = excluded.status,
       user_rating = coalesce(excluded.user_rating, user_vault_items.user_rating),
       notes = coalesce(excluded.notes, user_vault_items.notes),
       updated_at = CURRENT_TIMESTAMP;`,
    [vaultItemId, userId, mediaId, status, rating ?? (status === "Favorite" ? 5 : null), notes ?? (status === "Favorite" ? "#favorite" : null)]
  );

  // 3. Update legacy watched/wishlist tables for compatibility
  if (status === "Wishlist") {
    await queryD1(`DELETE FROM watched_items WHERE user_id = ? AND media_id = ?;`, [userId, mediaId]);
    await queryD1(
      `INSERT INTO wishlist_items (user_id, media_id, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, media_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP;`,
      [userId, mediaId]
    );
  } else {
    await queryD1(`DELETE FROM wishlist_items WHERE user_id = ? AND media_id = ?;`, [userId, mediaId]);
    await queryD1(
      `INSERT INTO watched_items (user_id, media_id, watched_at, rating, notes, status)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
       ON CONFLICT(user_id, media_id) DO UPDATE SET
         watched_at = CURRENT_TIMESTAMP,
         rating = coalesce(excluded.rating, watched_items.rating),
         notes = coalesce(excluded.notes, watched_items.notes),
         status = excluded.status;`,
      [userId, mediaId, rating ?? (status === "Favorite" ? 5 : null), notes ?? (status === "Favorite" ? "#favorite" : null), status]
    );
  }

  // 4. Create social notification/activity event
  const user = await findUserById(userId);
  const media = await findMediaById(mediaId);
  if (user && media) {
    const actionVerb = status === "Completed" ? "finished" : status === "Watching" ? "is watching" : status === "Favorite" ? "favorited" : "added";
    await queryD1(
      `INSERT INTO notifications (id, user_id, from_user_id, media_id, type, message, status)
       VALUES (?, ?, ?, ?, 'activity', ?, 'unread');`,
      [
        crypto.randomUUID(),
        userId,
        userId,
        mediaId,
        `${user.name || "A user"} ${actionVerb} ${media.title}`,
      ]
    );
  }
}

export async function removeMediaFromVault(userId: string, mediaId: string): Promise<void> {
  await queryD1(`DELETE FROM watched_items WHERE user_id = ? AND media_id = ?;`, [userId, mediaId]);
  await queryD1(`DELETE FROM wishlist_items WHERE user_id = ? AND media_id = ?;`, [userId, mediaId]);
  await queryD1(`DELETE FROM user_vault_items WHERE user_id = ? AND media_id = ?;`, [userId, mediaId]);
}

export const trackMediaItem = trackMediaInVault;
export const removeMediaItem = removeMediaFromVault;

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

export async function getMediaReviews(mediaId: string, currentUserId?: string): Promise<MediaReview[]> {
  const rows = await queryD1<{
    user_id: string;
    media_id: string;
    rating?: number;
    notes?: string;
    watched_at: string;
    user_name: string;
    user_image?: string;
  }>(
    `SELECT w.user_id, w.media_id, w.rating, w.notes, w.watched_at,
            u.name as user_name, u.image as user_image
     FROM watched_items w
     JOIN users u ON w.user_id = u.id
     WHERE w.media_id = ? AND w.notes IS NOT NULL AND TRIM(w.notes) != ''
     ORDER BY w.watched_at DESC;`,
    [mediaId]
  );

  const reviews: MediaReview[] = [];

  for (const r of rows) {
    const rawNotes = r.notes || "";
    const isPrivate = rawNotes.startsWith("[PRIVATE]") || rawNotes.startsWith("#private");
    const cleanContent = rawNotes.replace(/^\[PRIVATE\]\s*/i, "").replace(/^#private\s*/i, "").trim();

    if (!cleanContent) continue;

    // If private, only show to owner
    if (isPrivate && r.user_id !== currentUserId) {
      continue;
    }

    const isOwner = r.user_id === currentUserId;
    const rawRating = r.rating ? (r.rating > 5 ? r.rating / 2 : r.rating) : undefined;

    reviews.push({
      id: `${r.user_id}_${r.media_id}`,
      userId: r.user_id,
      userName: r.user_name || "Collector",
      userImage: r.user_image,
      mediaId: r.media_id,
      rating: rawRating,
      content: cleanContent,
      isPrivate,
      isOwner,
      likesCount: Math.max(0, (cleanContent.length % 5) + (isOwner ? 1 : 0)),
      createdAt: r.watched_at,
    });
  }

  // Put owner review first
  reviews.sort((a, b) => (a.isOwner ? -1 : b.isOwner ? 1 : 0));
  return reviews;
}

// -------------------------------------------------------------
// SHELVES & SMART FOLDERS
// -------------------------------------------------------------

export async function getUserShelves(userId: string): Promise<Array<Folder & { itemCount: number }>> {
  const rows = await queryD1<Folder & { item_count: number }>(
    `SELECT f.*, COUNT(fi.media_id) as item_count
     FROM folders f
     LEFT JOIN folder_items fi ON f.id = fi.folder_id
     WHERE f.user_id = ?
     GROUP BY f.id
     ORDER BY f.created_at ASC;`,
    [userId]
  );
  return rows.map((r) => ({
    ...r,
    itemCount: Number(r.item_count || 0),
  }));
}

export async function createShelf(params: {
  userId: string;
  name: string;
  description?: string;
  coverUrl?: string;
  visibility?: string;
}): Promise<Folder> {
  const id = crypto.randomUUID();
  const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  await queryD1(
    `INSERT INTO folders (id, user_id, name, slug, description, cover_url, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id, params.userId, params.name, slug, params.description || null, params.coverUrl || null, params.visibility || "public"]
  );
  const rows = await queryD1<Folder>(`SELECT * FROM folders WHERE id = ?;`, [id]);
  return rows[0];
}

export async function deleteShelf(shelfId: string, userId: string): Promise<void> {
  await queryD1(`DELETE FROM folders WHERE id = ? AND user_id = ?;`, [shelfId, userId]);
}

export async function addMediaToShelf(folderId: string, mediaId: string): Promise<void> {
  await queryD1(
    `INSERT INTO folder_items (folder_id, media_id, created_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(folder_id, media_id) DO NOTHING;`,
    [folderId, mediaId]
  );
}

export async function removeMediaFromShelf(folderId: string, mediaId: string): Promise<void> {
  await queryD1(`DELETE FROM folder_items WHERE folder_id = ? AND media_id = ?;`, [folderId, mediaId]);
}

// -------------------------------------------------------------
// SOCIAL, FRIENDS & ACTIVITY
// -------------------------------------------------------------

export async function getFriendActivityStream(userId: string): Promise<Array<{
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
}>> {
  // Return recent activity from friends or global recent activity for discovery
  const rows = await queryD1<{
    id: string;
    from_user_id: string;
    user_name: string;
    user_image?: string;
    media_id: string;
    media_title: string;
    media_cover?: string;
    media_type: string;
    type: string;
    message: string;
    created_at: string;
  }>(
    `SELECT n.id, n.from_user_id, u.name as user_name, u.image as user_image,
            m.id as media_id, m.title as media_title, m.cover_url as media_cover, m.type as media_type,
            n.type, n.message, n.created_at
     FROM notifications n
     JOIN users u ON n.from_user_id = u.id
     JOIN media m ON n.media_id = m.id
     WHERE n.type = 'activity'
     ORDER BY n.created_at DESC
     LIMIT 25;`
  );

  return rows.map((r) => ({
    id: r.id,
    userId: r.from_user_id,
    userName: r.user_name || "Collector",
    userAvatar: r.user_image,
    mediaId: r.media_id,
    mediaTitle: r.media_title,
    mediaPoster: r.media_cover,
    mediaType: r.media_type,
    action: r.message.includes("finished") ? "finished" : r.message.includes("watching") ? "watching" : "added",
    detail: r.message,
    createdAt: r.created_at,
  }));
}

export async function getFriendsList(userId: string): Promise<Array<User>> {
  const rows = await queryD1<User>(
    `SELECT u.*
     FROM friendships f
     JOIN users u ON f.friend_id = u.id
     WHERE f.user_id = ?
     ORDER BY u.name ASC;`,
    [userId]
  );
  return rows;
}

export async function getSuggestedUsers(userId: string): Promise<Array<User & { sharedCount?: number }>> {
  const rows = await queryD1<User>(
    `SELECT * FROM users
     WHERE id != ?
     LIMIT 10;`,
    [userId]
  );
  return rows;
}

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
  const id = crypto.randomUUID();
  const fromUser = await findUserById(fromUserId);
  const senderName = fromUser?.name || "A collector";

  await queryD1(
    `INSERT INTO friend_requests (id, from_user_id, to_user_id, status)
     VALUES (?, ?, ?, 'pending')
     ON CONFLICT(from_user_id, to_user_id) DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP;`,
    [id, fromUserId, toUserId]
  );

  await queryD1(
    `INSERT INTO notifications (id, user_id, from_user_id, type, message, status)
     VALUES (?, ?, ?, 'friend_request', ?, 'unread');`,
    [crypto.randomUUID(), toUserId, fromUserId, `${senderName} sent you a friend request.`]
  );
}

export async function respondFriendRequest(
  fromUserId: string,
  toUserId: string,
  action: "accept" | "decline"
): Promise<void> {
  if (action === "accept") {
    await queryD1(
      `UPDATE friend_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE from_user_id = ? AND to_user_id = ?;`,
      [fromUserId, toUserId]
    );

    // Mutual friendship
    await queryD1(
      `INSERT INTO friendships (user_id, friend_id, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, friend_id) DO NOTHING;`,
      [toUserId, fromUserId]
    );
    await queryD1(
      `INSERT INTO friendships (user_id, friend_id, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, friend_id) DO NOTHING;`,
      [fromUserId, toUserId]
    );

    const toUser = await findUserById(toUserId);
    await queryD1(
      `INSERT INTO notifications (id, user_id, from_user_id, type, message, status)
       VALUES (?, ?, ?, 'friend_accept', ?, 'unread');`,
      [crypto.randomUUID(), fromUserId, toUserId, `${toUser?.name || "A user"} accepted your friend request.`]
    );
  } else {
    await queryD1(
      `UPDATE friend_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE from_user_id = ? AND to_user_id = ?;`,
      [fromUserId, toUserId]
    );
  }

  // Mark notification read
  await queryD1(
    `UPDATE notifications SET status = 'read' WHERE user_id = ? AND from_user_id = ? AND type = 'friend_request';`,
    [toUserId, fromUserId]
  );
}

export async function searchUsers(
  query: string,
  currentUserId?: string
): Promise<Array<User & { friendStatus: "none" | "friend" | "pending_sent" | "pending_received"; totalVaultItems: number }>> {
  const searchTerm = `%${query.toLowerCase().trim()}%`;
  const rows = await queryD1<User>(
    `SELECT * FROM users
     WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
     ${currentUserId ? `AND id != '${currentUserId}'` : ""}
     LIMIT 20;`,
    [searchTerm, searchTerm]
  );

  const results = [];
  for (const u of rows) {
    let friendStatus: "none" | "friend" | "pending_sent" | "pending_received" = "none";

    if (currentUserId) {
      const isFriend = await queryD1<{ user_id: string }>(
        `SELECT user_id FROM friendships WHERE user_id = ? AND friend_id = ? LIMIT 1;`,
        [currentUserId, u.id]
      );
      if (isFriend.length > 0) {
        friendStatus = "friend";
      } else {
        const sent = await queryD1<{ status: string }>(
          `SELECT status FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending' LIMIT 1;`,
          [currentUserId, u.id]
        );
        if (sent.length > 0) {
          friendStatus = "pending_sent";
        } else {
          const rec = await queryD1<{ status: string }>(
            `SELECT status FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending' LIMIT 1;`,
            [u.id, currentUserId]
          );
          if (rec.length > 0) {
            friendStatus = "pending_received";
          }
        }
      }
    }

    const vaultCount = await queryD1<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM watched_items WHERE user_id = ?;`,
      [u.id]
    );

    results.push({
      ...u,
      friendStatus,
      totalVaultItems: vaultCount[0]?.cnt || 0,
    });
  }

  return results;
}

export async function getUserNotifications(userId: string): Promise<Array<{
  id: string;
  type: string;
  message: string;
  status: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserImage?: string;
  createdAt: string;
}>> {
  const rows = await queryD1<{
    id: string;
    type: string;
    message: string;
    status: string;
    from_user_id?: string;
    created_at: string;
    user_name?: string;
    user_image?: string;
  }>(
    `SELECT n.id, n.type, n.message, n.status, n.from_user_id, n.created_at,
            u.name as user_name, u.image as user_image
     FROM notifications n
     LEFT JOIN users u ON n.from_user_id = u.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 30;`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    message: r.message,
    status: r.status,
    fromUserId: r.from_user_id,
    fromUserName: r.user_name,
    fromUserImage: r.user_image,
    createdAt: r.created_at,
  }));
}

export async function deleteNotification(id: string, userId: string): Promise<void> {
  await queryD1(`DELETE FROM notifications WHERE id = ? AND user_id = ?;`, [id, userId]);
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  await queryD1(`DELETE FROM notifications WHERE user_id = ?;`, [userId]);
}

export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  await queryD1(`DELETE FROM notifications WHERE id = ? AND user_id = ?;`, [id, userId]);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await queryD1(`DELETE FROM notifications WHERE user_id = ?;`, [userId]);
}

export async function getFriendRecommendations(userId: string): Promise<Array<{
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
}>> {
  const rows = await queryD1<{
    id: string;
    from_user_id: string;
    user_name: string;
    user_image?: string;
    media_id: string;
    media_title: string;
    media_cover?: string;
    media_type: string;
    message: string;
    created_at: string;
  }>(
    `SELECT n.id, n.from_user_id, u.name as user_name, u.image as user_image,
            m.id as media_id, m.title as media_title, m.cover_url as media_cover, m.type as media_type,
            n.message, n.created_at
     FROM notifications n
     JOIN users u ON n.from_user_id = u.id
     JOIN media m ON n.media_id = m.id
     WHERE n.user_id = ? AND n.type = 'recommendation' AND n.status = 'unread'
     ORDER BY n.created_at DESC;`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.user_name || "Friend",
    fromUserAvatar: r.user_image,
    mediaId: r.media_id,
    mediaTitle: r.media_title,
    mediaPoster: r.media_cover,
    mediaType: r.media_type,
    note: r.message,
    createdAt: r.created_at,
  }));
}

export async function sendFriendRecommendation(
  fromUserId: string,
  toUserId: string,
  mediaId: string,
  note: string
): Promise<void> {
  const id = crypto.randomUUID();
  await queryD1(
    `INSERT INTO notifications (id, user_id, from_user_id, media_id, type, message, status)
     VALUES (?, ?, ?, ?, 'recommendation', ?, 'unread');`,
    [id, toUserId, fromUserId, mediaId, note]
  );
}

export async function dismissFriendRecommendation(notificationId: string, userId: string): Promise<void> {
  await queryD1(
    `UPDATE notifications SET status = 'read' WHERE id = ? AND user_id = ?;`,
    [notificationId, userId]
  );
}

// -------------------------------------------------------------
// PROFILE & TASTE DNA COMPUTATION
// -------------------------------------------------------------

export async function calculateProfileStats(userId: string): Promise<VaultStats> {
  const vaultItems = await getUserVaultItems(userId);
  const totalCollected = vaultItems.length;

  let totalRuntimeMins = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const genreCounts: Record<string, number> = {};

  for (const item of vaultItems) {
    if (item.runtime) totalRuntimeMins += item.runtime;
    else totalRuntimeMins += item.type === "movie" ? 120 : item.type === "show" ? 300 : 60;

    if (item.userRating) {
      const val = item.userRating > 5 ? item.userRating / 2 : item.userRating;
      ratingSum += val;
      ratingCount++;
    } else if (item.rating) {
      const val = item.rating > 5 ? item.rating / 2 : item.rating;
      ratingSum += val;
      ratingCount++;
    }

    const itemGenres = item.type === "anime" ? ["Anime", "Animation"] : item.type === "game" ? ["Gaming", "Adventure"] : ["Cinema", "Drama"];
    for (const g of itemGenres) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }

  const hoursWatched = Math.round(totalRuntimeMins / 60);
  const avgRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(1)) : 0;
  const tasteScore = avgRating;

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = sortedGenres[0]?.[0] || "Collecting";
  const topGenreCount = sortedGenres[0]?.[1] || totalCollected;

  const genreColors = ["teal", "green", "violet", "orange"];
  const genresBreakdown = sortedGenres.slice(0, 4).map(([name, count], index) => ({
    name,
    count,
    percentage: totalCollected > 0 ? Math.round((count / totalCollected) * 100) : 0,
    color: genreColors[index % genreColors.length],
  }));

  return {
    totalCollected,
    hoursWatched,
    topGenre,
    topGenreCount,
    averageRating: avgRating,
    tasteScore,
    genresBreakdown,
  };
}
