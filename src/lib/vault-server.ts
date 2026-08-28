import { cache } from "react";
import { auth } from "@/lib/auth";
import { execute, queryAll, queryOne, uuid } from "@/lib/d1";
import { MediaItem } from "@/lib/types";
import {
  CommunityRatingSummary,
  LibraryState,
  PrivacyLevel,
  SocialNotification,
  SocialProfile,
  StoredList,
  VaultProfilePayload,
} from "@/lib/vault-types";

type MediaRow = {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  overview: string | null;
  type: string;
  status: string | null;
  release_year: number | null;
  runtime: number | null;
  rating: number | null;
  cover_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  language: string | null;
  source: string;
  source_id: string;
  genre_names: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  role: string | null;
  has_seen_onboarding: number | null;
  watched_visibility: PrivacyLevel | null;
  wishlist_visibility: PrivacyLevel | null;
  folders_default_visibility: PrivacyLevel | null;
  created_at: string | null;
  updated_at: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  from_user_id: string | null;
  media_id: string | null;
  type: string;
  message: string;
  status: string;
  created_at: string;
  from_user_name: string | null;
  from_user_email: string | null;
  from_user_image: string | null;
  media_slug: string | null;
  media_title: string | null;
  media_source: string | null;
  media_source_id: string | null;
  media_type: string | null;
  media_cover_url: string | null;
  media_backdrop_url: string | null;
  media_rating: number | null;
  media_genre_names: string | null;
};

type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  visibility: PrivacyLevel;
  created_at: string;
  updated_at: string;
};

type WatchedRow = {
  user_id: string;
  media_id: string;
  watched_at: string;
  rating: number | null;
  notes: string | null;
  user_name: string | null;
  user_email: string | null;
  user_image: string | null;
  watched_visibility: PrivacyLevel | null;
  media_slug: string;
  media_title: string;
  media_source: string;
  media_source_id: string;
  media_type: string;
  media_cover_url: string | null;
  media_backdrop_url: string | null;
  media_rating: number | null;
  media_genre_names: string | null;
};

type FolderItemRow = {
  folder_id: string;
  folder_user_id: string;
  folder_name: string;
  folder_slug: string;
  media_id: string;
  created_at: string;
  media_slug: string;
  media_title: string;
  media_source: string;
  media_source_id: string;
  media_type: string;
  media_cover_url: string | null;
  media_backdrop_url: string | null;
  media_rating: number | null;
  media_genre_names: string | null;
};

type FriendRequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildHandle(name?: string | null, email?: string | null, id?: string) {
  const nameBase = name?.trim();
  const emailBase = email?.split("@")[0]?.trim();
  const idBase = id?.slice(0, 8);
  const base = nameBase || emailBase || (idBase ? `vault-${idBase}` : "vault-user");
  return `@${slugify(base) || "vault-user"}`;
}

function parseGenres(value: string | null) {
  if (!value) return [];
  return value.split("||").map((entry) => entry.trim()).filter(Boolean);
}

function toMediaItem(row: MediaRow | Omit<MediaRow, "genre_names"> & { genre_names?: string | null }): MediaItem {
  return {
    id: row.id,
    slug: row.slug,
    source: row.source as MediaItem["source"],
    sourceId: row.source_id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    type: row.type as MediaItem["type"],
    year: row.release_year ?? 0,
    rating: row.rating ?? 0,
    language: row.language ?? "en",
    genres: parseGenres(row.genre_names ?? null),
    coverUrl: row.cover_url || "",
    backdropUrl: row.backdrop_url || row.cover_url || "",
    screenshots: [],
    overview: row.overview || "No overview yet.",
    credits: [],
    details: {
      runtime: row.runtime ? `${row.runtime} min` : undefined,
      status: row.status ?? undefined,
      trailerUrl: row.trailer_url ?? undefined,
    },
  };
}

function splitReviewNotes(notes?: string | null) {
  if (!notes?.trim()) {
    return { title: undefined, text: undefined };
  }

  const parts = notes.trim().split(/\n{2,}/);
  if (parts.length > 1 && parts[0].length <= 90) {
    return {
      title: parts[0],
      text: parts.slice(1).join("\n\n").trim() || undefined,
    };
  }

  return { text: notes.trim() };
}

function extractRatingSnapshot(message: string) {
  const match = message.match(/rated it ([★☆]{5})/);
  if (!match) return null;
  return match[1].split("").filter((char) => char === "★").length || null;
}

function renderStars(rating: number) {
  return "★".repeat(rating).padEnd(5, "☆");
}

function toPrivacyLevel(value: PrivacyLevel | null | undefined): PrivacyLevel {
  return value ?? "public";
}

function serializeNotification(notification: NotificationRow): SocialNotification {
  const media = notification.media_id
    ? {
        id: notification.media_id,
        slug: notification.media_slug ?? "",
        source: (notification.media_source ?? "local") as MediaItem["source"],
        sourceId: notification.media_source_id ?? "",
        title: notification.media_title ?? "Untitled",
        type: (notification.media_type ?? "movie") as MediaItem["type"],
        year: 0,
        rating: notification.media_rating ?? 0,
        language: "en",
        genres: parseGenres(notification.media_genre_names ?? null),
        coverUrl: notification.media_cover_url ?? "",
        backdropUrl: notification.media_backdrop_url ?? notification.media_cover_url ?? "",
        screenshots: [],
        overview: "No overview yet.",
        credits: [],
        details: {},
      }
    : undefined;

  return {
    id: notification.id,
    type:
      notification.type === "friend_request"
        ? "friend-request"
        : notification.type === "friend_accepted"
          ? "friend-accepted"
          : notification.type === "recommendation"
            ? "recommendation"
            : "info",
    fromUserId: notification.from_user_id ?? "",
    fromUserName: notification.from_user_name ?? undefined,
    message: notification.message,
    media,
    ratingSnapshot: extractRatingSnapshot(notification.message),
    createdAt: new Date(notification.created_at).getTime(),
    status: notification.status === "read" ? "read" : "unread",
  };
}

function serializeList(folder: FolderRow & { items: MediaItem[] }): StoredList {
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    description: folder.description ?? undefined,
    coverUrl: folder.cover_url ?? undefined,
    visibility: toPrivacyLevel(folder.visibility),
    items: folder.items,
    itemCount: folder.items.length,
  };
}

function serializeProfile(
  user: UserRow,
  friendIds: string[],
  notifications: NotificationRow[] = [],
): SocialProfile {
  return {
    id: user.id,
    name: user.name || "Vault user",
    handle: buildHandle(user.name, user.email, user.id),
    avatarUrl: user.image ?? undefined,
    bio: user.bio ?? undefined,
    friends: friendIds,
    watchedVisibility: toPrivacyLevel(user.watched_visibility),
    wishlistVisibility: toPrivacyLevel(user.wishlist_visibility),
    foldersDefaultVisibility: toPrivacyLevel(user.folders_default_visibility),
    inbox: notifications.map(serializeNotification),
  };
}

function canViewPrivacy(ownerId: string, viewerId: string, visibility: PrivacyLevel, ownerFriendIds: string[]) {
  if (ownerId === viewerId) return true;
  if (visibility === "public") return true;
  if (visibility === "private") return false;
  return ownerFriendIds.includes(viewerId);
}

async function getUserById(userId: string) {
  return queryOne<UserRow>(`SELECT * FROM users WHERE id = ? LIMIT 1`, [userId]);
}

async function getUserByEmail(email: string) {
  return queryOne<UserRow>(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
}

async function getFriendIds(userId: string) {
  const rows = await queryAll<{ friend_id: string }>(`SELECT friend_id FROM friendships WHERE user_id = ?`, [userId]);
  return rows.map((row) => row.friend_id);
}

async function getFolderItems(folderId: string) {
  const rows = await queryAll<FolderItemRow>(
    `
      SELECT
        fi.folder_id,
        fi.media_id,
        fi.created_at,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM folder_items fi
      JOIN media m ON m.id = fi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE fi.folder_id = ?
      GROUP BY fi.folder_id, fi.media_id
      ORDER BY fi.created_at DESC
    `,
    [folderId],
  );

  return rows.map((row) =>
    toMediaItem({
      id: row.media_id,
      slug: row.media_slug,
      title: row.media_title,
      original_title: null,
      overview: null,
      type: row.media_type,
      status: null,
      release_year: null,
      runtime: null,
      rating: row.media_rating,
      cover_url: row.media_cover_url,
      backdrop_url: row.media_backdrop_url,
      trailer_url: null,
      language: "en",
      source: row.media_source,
      source_id: row.media_source_id,
      genre_names: row.media_genre_names,
    }),
  );
}

async function getFolderItemsForMultipleFolders(folderIds: string[]) {
  if (!folderIds.length) return new Map<string, MediaItem[]>();

  const rows = await queryAll<FolderItemRow>(
    `
      SELECT
        fi.folder_id,
        fi.media_id,
        fi.created_at,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM folder_items fi
      JOIN media m ON m.id = fi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE fi.folder_id IN (${folderIds.map(() => "?").join(",")})
      GROUP BY fi.folder_id, fi.media_id
      ORDER BY fi.created_at DESC
    `,
    folderIds,
  );

  const map = new Map<string, MediaItem[]>();
  folderIds.forEach((id) => map.set(id, []));

  for (const row of rows) {
    const item = toMediaItem({
      id: row.media_id,
      slug: row.media_slug,
      title: row.media_title,
      original_title: null,
      overview: null,
      type: row.media_type,
      status: null,
      release_year: null,
      runtime: null,
      rating: row.media_rating,
      cover_url: row.media_cover_url,
      backdrop_url: row.media_backdrop_url,
      trailer_url: null,
      language: "en",
      source: row.media_source,
      source_id: row.media_source_id,
      genre_names: row.media_genre_names,
    });
    const list = map.get(row.folder_id);
    if (list) {
      list.push(item);
    } else {
      map.set(row.folder_id, [item]);
    }
  }

  return map;
}

async function getMediaBySource(source: string, sourceId: string) {
  const row = await queryOne<MediaRow>(
    `
      SELECT
        m.*,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS genre_names
      FROM media m
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE m.source = ? AND m.source_id = ?
      GROUP BY m.id
      LIMIT 1
    `,
    [source, sourceId],
  );

  return row ? toMediaItem(row) : null;
}

async function loadWatchedRows(userId: string, limit = 500) {
  return queryAll<WatchedRow>(
    `
      SELECT
        wi.user_id,
        wi.media_id,
        wi.watched_at,
        wi.rating,
        wi.notes,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image,
        u.watched_visibility,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM watched_items wi
      JOIN users u ON u.id = wi.user_id
      JOIN media m ON m.id = wi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE wi.user_id = ?
      GROUP BY wi.user_id, wi.media_id
      ORDER BY wi.watched_at DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

async function loadWishlistRows(userId: string, limit = 500) {
  return queryAll<WatchedRow>(
    `
      SELECT
        wi.user_id,
        wi.media_id,
        wi.created_at AS watched_at,
        NULL AS rating,
        NULL AS notes,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image,
        u.watched_visibility,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM wishlist_items wi
      JOIN users u ON u.id = wi.user_id
      JOIN media m ON m.id = wi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE wi.user_id = ?
      GROUP BY wi.user_id, wi.media_id
      ORDER BY wi.created_at DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

async function loadFolderRows(userId: string, limit = 100) {
  return queryAll<FolderRow>(
    `
      SELECT *
      FROM folders
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

async function loadFolderById(folderId: string) {
  return queryOne<FolderRow>(`SELECT * FROM folders WHERE id = ? LIMIT 1`, [folderId]);
}

async function getNotificationsForUser(userId: string, limit = 50) {
  return queryAll<NotificationRow>(
    `
      SELECT
        n.*,
        fu.name AS from_user_name,
        fu.email AS from_user_email,
        fu.image AS from_user_image,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM notifications n
      LEFT JOIN users fu ON fu.id = n.from_user_id
      LEFT JOIN media m ON m.id = n.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE n.user_id = ?
      GROUP BY n.id
      ORDER BY n.created_at DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function ensureCurrentUserRecord() {
  const sessionUser = await requireSessionUser();
  const existing = await getUserById(sessionUser.id);
  const nextName = sessionUser.name ?? null;
  const nextEmail = sessionUser.email ?? null;
  const nextImage = sessionUser.image ?? null;

  if (!existing) {
    await execute(
      `
        INSERT INTO users (
          id, name, email, image, bio, password_hash, role,
          has_seen_onboarding, watched_visibility, wishlist_visibility,
          folders_default_visibility, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, 'USER', 0, 'public', 'friends', 'public', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [sessionUser.id, nextName, nextEmail, nextImage],
    );
    return await getUserById(sessionUser.id);
  }

  if (existing.name === nextName && existing.email === nextEmail && existing.image === nextImage) {
    return existing;
  }

  await execute(
    `
      UPDATE users
      SET name = ?, email = ?, image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [nextName, nextEmail, nextImage, sessionUser.id],
  );

  return await getUserById(sessionUser.id);
}

export async function persistMediaItem(item: MediaItem, _txArg?: unknown) {
  const type = item.type === "all" ? "movie" : item.type === "anime_movie" ? "anime" : item.type;
  const mediaId = item.id || uuid();

  await execute(
    `
      INSERT INTO media (
        id, slug, title, original_title, overview, type, status,
        release_year, runtime, rating, cover_url, backdrop_url,
        trailer_url, language, source, source_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(source, source_id) DO UPDATE SET
        slug = excluded.slug,
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
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      mediaId,
      item.slug,
      item.title,
      item.originalTitle ?? null,
      item.overview,
      type,
      item.details.status ?? null,
      item.year || null,
      item.details.runtime ? Number.parseInt(item.details.runtime, 10) || null : null,
      item.rating ?? null,
      item.coverUrl,
      item.backdropUrl || item.coverUrl,
      item.details.trailerUrl ?? null,
      item.language || "en",
      item.source,
      item.sourceId,
    ],
  );

  const saved = await getMediaBySource(item.source, item.sourceId);
  if (!saved) {
    throw new Error("Failed to persist media.");
  }

  await execute(`DELETE FROM media_genres WHERE media_id = ?`, [saved.id]);

  const uniqueGenres = Array.from(new Set(item.genres.map((genre) => genre.trim()).filter(Boolean)));
  for (const genreName of uniqueGenres) {
    const genreSlug = slugify(genreName);
    const genreId = `genre_${genreSlug}`;
    await execute(
      `
        INSERT INTO genres (id, name, slug)
        VALUES (?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name
      `,
      [genreId, genreName, genreSlug],
    );
    await execute(
      `INSERT OR IGNORE INTO media_genres (media_id, genre_id) VALUES (?, ?)`,
      [saved.id, genreId],
    );
  }

  return (await getMediaBySource(item.source, item.sourceId)) ?? saved;
}

export const getLibraryStateForUser = cache(async (userId: string): Promise<LibraryState> => {
  const [watchedRows, wishlistRows, folderRows] = await Promise.all([
    loadWatchedRows(userId, 500),
    loadWishlistRows(userId, 500),
    loadFolderRows(userId, 100),
  ]);

  const folders = await Promise.all(
    folderRows.map(async (folder) => ({
      ...folder,
      items: await getFolderItems(folder.id),
    })),
  );

  const lists = folders.map(serializeList);

  return {
    watched: watchedRows.map((row) =>
      ({
        ...toMediaItem({
          id: row.media_id,
          slug: row.media_slug,
          title: row.media_title,
          original_title: null,
          overview: null,
          type: row.media_type,
          status: null,
          release_year: null,
          runtime: null,
          rating: row.media_rating,
          cover_url: row.media_cover_url,
          backdrop_url: row.media_backdrop_url,
          trailer_url: null,
          language: "en",
          source: row.media_source,
          source_id: row.media_source_id,
          genre_names: row.media_genre_names,
        }),
        userRating: row.rating ?? null,
        userReview: row.notes ?? null,
        watchedAt: new Date(row.watched_at).getTime(),
      }) as MediaItem,
    ),
    wishlist: wishlistRows.map((row) =>
      toMediaItem({
        id: row.media_id,
        slug: row.media_slug,
        title: row.media_title,
        original_title: null,
        overview: null,
        type: row.media_type,
        status: null,
        release_year: null,
        runtime: null,
        rating: row.media_rating,
        cover_url: row.media_cover_url,
        backdrop_url: row.media_backdrop_url,
        trailer_url: null,
        language: "en",
        source: row.media_source,
        source_id: row.media_source_id,
        genre_names: row.media_genre_names,
      }),
    ),
    lists,
    folders: lists,
  };
});

export const getListsForUser = cache(async (userId: string): Promise<StoredList[]> => {
  const rows = await loadFolderRows(userId, 100);
  if (!rows.length) return [];
  const folderIds = rows.map((r) => r.id);
  const itemsMap = await getFolderItemsForMultipleFolders(folderIds);
  return rows.map((folder) =>
    serializeList({
      ...folder,
      items: itemsMap.get(folder.id) ?? [],
    }),
  );
});

export const getFoldersForUser = getListsForUser;

export type FriendMediaActivity = {
  friendId: string;
  friendName: string;
  friendHandle: string;
  friendAvatarUrl?: string;
  rating?: number | null;
  review?: string | null;
  watchedAt?: number;
};

export async function getFriendsActivityForMedia(
  mediaId: string,
  friendIds: string[],
  viewerId: string,
): Promise<FriendMediaActivity[]> {
  if (!friendIds.length || !mediaId) return [];

  const rows = await queryAll<{
    user_id: string;
    rating: number | null;
    notes: string | null;
    watched_at: string;
    user_name: string | null;
    user_image: string | null;
    user_email: string | null;
    watched_visibility: PrivacyLevel | null;
  }>(
    `
      SELECT
        wi.user_id,
        wi.rating,
        wi.notes,
        wi.watched_at,
        u.name AS user_name,
        u.image AS user_image,
        u.email AS user_email,
        u.watched_visibility
      FROM watched_items wi
      JOIN users u ON u.id = wi.user_id
      WHERE wi.media_id = ? AND wi.user_id IN (${friendIds.map(() => "?").join(",")})
      ORDER BY wi.watched_at DESC
    `,
    [mediaId, ...friendIds],
  );

  return rows
    .filter((row) => canViewPrivacy(row.user_id, viewerId, row.watched_visibility || "public", friendIds))
    .map((row) => ({
      friendId: row.user_id,
      friendName: row.user_name || "Friend",
      friendHandle: buildHandle(row.user_name, row.user_email, row.user_id),
      friendAvatarUrl: row.user_image || undefined,
      rating: row.rating ?? null,
      review: row.notes ?? null,
      watchedAt: new Date(row.watched_at).getTime(),
    }));
}

export async function getViewerHomePayload(viewerId: string, requestedUserId?: string) {
  const targetUserId = requestedUserId || viewerId;
  const isOwn = targetUserId === viewerId;

  if (isOwn) {
    const profile = await getVaultProfilePayload(viewerId, viewerId);
    const library: LibraryState = {
      watched: profile.watched,
      wishlist: profile.wishlist,
      lists: profile.lists,
      folders: profile.folders,
    };
    const shellData = {
      lists: profile.lists,
      folders: profile.folders,
      viewerProfile: profile.viewerProfile,
      friends: profile.friends,
    };
    return {
      shellData,
      library,
      profilePayload: profile,
    };
  }

  const [shellData, library, profilePayload] = await Promise.all([
    getViewerShellData(viewerId),
    getLibraryStateForUser(viewerId),
    getVaultProfilePayload(viewerId, targetUserId),
  ]);

  return {
    shellData,
    library,
    profilePayload,
  };
}

export async function getListById(listId: string, viewerId: string): Promise<StoredList | null> {
  const row = await loadFolderById(listId);
  if (!row) return null;

  const friendIds = await getFriendIds(row.user_id);
  const canView =
    row.visibility === "public" ||
    row.user_id === viewerId ||
    (row.visibility === "friends" && friendIds.includes(viewerId));

  if (!canView) return null;

  return serializeList({
    ...row,
    items: await getFolderItems(row.id),
  });
}

export const getViewerShellData = cache(async (userId: string) => {
  const [viewer, friendIds, lists, notifications] = await Promise.all([
    getUserById(userId).catch(() => null),
    getFriendIds(userId).catch(() => []),
    getListsForUser(userId).catch(() => []),
    getNotificationsForUser(userId, 50).catch(() => []),
  ]);

  const effectiveViewer: UserRow = viewer ?? {
    id: userId,
    name: "Vault Explorer",
    email: null,
    image: null,
    bio: null,
    role: "user",
    has_seen_onboarding: 1,
    watched_visibility: "public",
    wishlist_visibility: "public",
    folders_default_visibility: "public",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const friends =
    friendIds.length > 0
      ? await queryAll<UserRow>(`SELECT * FROM users WHERE id IN (${friendIds.map(() => "?").join(",")}) ORDER BY name ASC`, friendIds).catch(() => [])
      : [];

  return {
    lists,
    folders: lists,
    viewerProfile: serializeProfile(effectiveViewer, friendIds, notifications),
    friends: friends.map((friend) => serializeProfile(friend, [])),
  };
});

export const getVaultProfilePayload = cache(async (viewerId: string, viewedUserId: string): Promise<VaultProfilePayload> => {
  const [viewer, viewed, viewerFriendIds, viewedFriendIds, viewerNotifications] = await Promise.all([
    getUserById(viewerId).catch(() => null),
    getUserById(viewedUserId).catch(() => null),
    getFriendIds(viewerId).catch(() => []),
    getFriendIds(viewedUserId).catch(() => []),
    getNotificationsForUser(viewerId, 50).catch(() => []),
  ]);

  const effectiveViewer: UserRow = viewer ?? {
    id: viewerId,
    name: "Vault Explorer",
    email: null,
    image: null,
    bio: null,
    role: "user",
    has_seen_onboarding: 1,
    watched_visibility: "public",
    wishlist_visibility: "public",
    folders_default_visibility: "public",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const effectiveViewed: UserRow = viewed ?? (viewedUserId === viewerId ? effectiveViewer : {
    id: viewedUserId,
    name: "Community Member",
    email: null,
    image: null,
    bio: null,
    role: "user",
    has_seen_onboarding: 1,
    watched_visibility: "public",
    wishlist_visibility: "public",
    folders_default_visibility: "public",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const viewingOwnProfile = viewerId === viewedUserId;
  const [viewerLibrary, viewedLibrary, friends] = await Promise.all([
    getLibraryStateForUser(viewerId),
    viewingOwnProfile ? Promise.resolve(null) : getLibraryStateForUser(viewedUserId),
    viewerFriendIds.length > 0
      ? queryAll<UserRow>(`SELECT * FROM users WHERE id IN (${viewerFriendIds.map(() => "?").join(",")}) ORDER BY name ASC`, viewerFriendIds)
      : Promise.resolve([] as UserRow[]),
  ]);

  const viewerProfile = serializeProfile(effectiveViewer, viewerFriendIds, viewerNotifications);
  const viewedProfile = viewingOwnProfile ? viewerProfile : serializeProfile(effectiveViewed, viewedFriendIds);
  const canSeeWatched = canViewPrivacy(viewedUserId, viewerId, viewedProfile.watchedVisibility, viewedFriendIds);
  const canSeeWishlist = canViewPrivacy(viewedUserId, viewerId, viewedProfile.wishlistVisibility, viewedFriendIds);

  const visibleLists = viewingOwnProfile
    ? viewerLibrary.lists ?? []
    : viewedLibrary?.lists.filter((list) => canViewPrivacy(viewedUserId, viewerId, list.visibility, viewedFriendIds)) ?? [];

  const visibleLibrary = viewingOwnProfile
    ? viewerLibrary
    : {
        watched: canSeeWatched && viewedLibrary ? viewedLibrary.watched : [],
        wishlist: canSeeWishlist && viewedLibrary ? viewedLibrary.wishlist : [],
        lists: visibleLists,
        folders: visibleLists,
      };

  return {
    viewerProfile,
    viewedProfile,
    friends: friends.map((friend) => serializeProfile(friend, [])),
    watched: visibleLibrary.watched,
    wishlist: visibleLibrary.wishlist,
    lists: visibleLists,
    folders: visibleLists,
    canSeeWatched,
    canSeeWishlist,
    viewingOwnProfile,
  };
});

export const getCommunityRatingSummary = cache(async (
  source: MediaItem["source"],
  sourceId: string,
  limit = 3,
): Promise<CommunityRatingSummary> => {
  const media = await getMediaBySource(source, sourceId);
  if (!media) {
    return { average: null, count: 0, reviews: [] };
  }

  const rows = await queryAll<WatchedRow>(
    `
      SELECT
        wi.user_id,
        wi.media_id,
        wi.watched_at,
        wi.rating,
        wi.notes,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image,
        u.watched_visibility,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM watched_items wi
      JOIN users u ON u.id = wi.user_id
      JOIN media m ON m.id = wi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE wi.media_id = ? AND (wi.rating IS NOT NULL OR wi.notes IS NOT NULL)
      GROUP BY wi.user_id, wi.media_id
      ORDER BY wi.rating DESC, wi.watched_at DESC
      LIMIT 50
    `,
    [media.id],
  );

  const ratedRows = rows.filter((row) => typeof row.rating === "number");
  const average = ratedRows.length
    ? ratedRows.reduce((total, row) => total + (row.rating ?? 0), 0) / ratedRows.length
    : null;

  const reviews = rows
    .map((row) => {
      const review = splitReviewNotes(row.notes);
      const helpfulSeed = Math.max(0, (row.rating ?? 0) * 3 + Math.floor((row.notes?.length ?? 0) / 80));
      return {
        id: `${row.user_id}-${row.media_id}`,
        userId: row.user_id,
        username: row.user_name || "Vault user",
        userHandle: buildHandle(row.user_name, row.user_email, row.user_id),
        userAvatarUrl: row.user_image ?? undefined,
        rating: row.rating ?? null,
        title: review.title,
        text: review.text,
        datePosted: new Date(row.watched_at).getTime(),
        likeCount: helpfulSeed,
        dislikeCount: 0,
      };
    })
    .sort((left, right) => (right.likeCount - right.dislikeCount) - (left.likeCount - left.dislikeCount) || right.datePosted - left.datePosted)
    .slice(0, limit);

  return {
    average,
    count: ratedRows.length,
    reviews,
  };
});

export async function updateProfile(userId: string, updates: {
  avatarUrl?: string;
  bio?: string;
  watchedVisibility?: PrivacyLevel;
  wishlistVisibility?: PrivacyLevel;
  foldersDefaultVisibility?: PrivacyLevel;
  listsDefaultVisibility?: PrivacyLevel;
}) {
  await execute(
    `
      UPDATE users
      SET
        image = ?,
        bio = ?,
        watched_visibility = COALESCE(?, watched_visibility),
        wishlist_visibility = COALESCE(?, wishlist_visibility),
        folders_default_visibility = COALESCE(?, COALESCE(?, folders_default_visibility)),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      updates.avatarUrl?.trim() || null,
      updates.bio?.trim() || null,
      updates.watchedVisibility ?? null,
      updates.wishlistVisibility ?? null,
      updates.foldersDefaultVisibility ?? null,
      updates.listsDefaultVisibility ?? null,
      userId,
    ],
  );
}

function normalizeReviewInput(input: { rating?: number | null; review?: string | null }) {
  const rating =
    typeof input.rating === "number" && Number.isFinite(input.rating)
      ? Math.min(5, Math.max(1, Math.round(input.rating)))
      : null;
  const review = input.review?.trim() ? input.review.trim() : null;
  return { rating, review };
}

export async function addToWatched(userId: string, item: MediaItem, reviewInput?: { rating?: number | null; review?: string | null }) {
  const media = await persistMediaItem(item);
  const review = normalizeReviewInput(reviewInput ?? { rating: item.userRating ?? null, review: item.userReview ?? null });

  await execute(
    `
      INSERT INTO watched_items (user_id, media_id, watched_at, rating, notes)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON CONFLICT(user_id, media_id) DO UPDATE SET
        watched_at = CURRENT_TIMESTAMP,
        rating = excluded.rating,
        notes = excluded.notes
    `,
    [userId, media.id, review.rating, review.review],
  );
}

export async function removeFromWatched(userId: string, source: string, sourceId: string) {
  const media = await getMediaBySource(source, sourceId);
  if (!media) return;
  await execute(`DELETE FROM watched_items WHERE user_id = ? AND media_id = ?`, [userId, media.id]);
}

export async function addToWishlist(userId: string, item: MediaItem) {
  const media = await persistMediaItem(item);
  await execute(
    `
      INSERT INTO wishlist_items (user_id, media_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, media_id) DO UPDATE SET
        created_at = CURRENT_TIMESTAMP
    `,
    [userId, media.id],
  );
}

export async function removeFromWishlist(userId: string, source: string, sourceId: string) {
  const media = await getMediaBySource(source, sourceId);
  if (!media) return;
  await execute(`DELETE FROM wishlist_items WHERE user_id = ? AND media_id = ?`, [userId, media.id]);
}

export async function createList(userId: string, input: { name: string; description?: string; coverUrl?: string }) {
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new Error("List name is required");
  }

  const slugBase = slugify(trimmed);
  let slug = slugBase;
  let suffix = 1;

  while (await queryOne<{ id: string }>(`SELECT id FROM folders WHERE user_id = ? AND slug = ? LIMIT 1`, [userId, slug])) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const folderId = uuid();
  await execute(
    `
      INSERT INTO folders (id, user_id, name, slug, description, cover_url, visibility, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'public', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [folderId, userId, trimmed, slug, input.description?.trim() || null, input.coverUrl?.trim() || null],
  );

  return queryOne<FolderRow>(`SELECT * FROM folders WHERE id = ? LIMIT 1`, [folderId]);
}

export const createFolder = createList;

export async function updateList(userId: string, listId: string, updates: {
  name?: string;
  description?: string;
  coverUrl?: string;
  visibility?: PrivacyLevel;
}) {
  const list = await queryOne<FolderRow>(`SELECT * FROM folders WHERE id = ? AND user_id = ? LIMIT 1`, [listId, userId]);
  if (!list) {
    throw new Error("List not found");
  }

  const nextName = updates.name?.trim();
  let nextSlug = list.slug;

  if (nextName && nextName !== list.name) {
    const slugBase = slugify(nextName);
    nextSlug = slugBase;
    let suffix = 1;

    while (await queryOne<{ id: string }>(`SELECT id FROM folders WHERE user_id = ? AND slug = ? AND id <> ? LIMIT 1`, [userId, nextSlug, listId])) {
      suffix += 1;
      nextSlug = `${slugBase}-${suffix}`;
    }
  }

  await execute(
    `
      UPDATE folders
      SET name = ?, slug = ?, description = ?, cover_url = ?, visibility = COALESCE(?, visibility), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
    [nextName || list.name, nextSlug, updates.description?.trim() || null, updates.coverUrl?.trim() || null, updates.visibility ?? null, listId, userId],
  );
}

export const updateFolder = updateList;

export async function deleteList(userId: string, listId: string) {
  await execute(`DELETE FROM folders WHERE id = ? AND user_id = ?`, [listId, userId]);
}

export const deleteFolder = deleteList;

export async function addItemToList(userId: string, listId: string, item: MediaItem) {
  const list = await queryOne<FolderRow>(`SELECT * FROM folders WHERE id = ? AND user_id = ? LIMIT 1`, [listId, userId]);
  if (!list) {
    throw new Error("List not found");
  }

  const media = await persistMediaItem(item);
  await execute(
    `
      INSERT INTO folder_items (folder_id, media_id, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(folder_id, media_id) DO UPDATE SET
        created_at = CURRENT_TIMESTAMP
    `,
    [list.id, media.id],
  );

  await execute(`UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [list.id]);
}

export const addItemToFolder = addItemToList;

export async function removeItemFromList(userId: string, listId: string, source: string, sourceId: string) {
  const [list, media] = await Promise.all([
    queryOne<FolderRow>(`SELECT * FROM folders WHERE id = ? AND user_id = ? LIMIT 1`, [listId, userId]),
    getMediaBySource(source, sourceId),
  ]);

  if (!list || !media) return;

  await execute(`DELETE FROM folder_items WHERE folder_id = ? AND media_id = ?`, [list.id, media.id]);
  await execute(`UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [list.id]);
}

export const removeItemFromFolder = removeItemFromList;

async function createNotification(data: {
  userId: string;
  fromUserId?: string;
  type: "friend_request" | "friend_accepted" | "recommendation" | "info";
  message: string;
  mediaId?: string;
}) {
  const id = uuid();
  await execute(
    `
      INSERT INTO notifications (id, user_id, from_user_id, media_id, type, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'unread', CURRENT_TIMESTAMP)
    `,
    [id, data.userId, data.fromUserId ?? null, data.mediaId ?? null, data.type, data.message],
  );
  return id;
}

export async function ensureUpcomingInboxNotifications(userId: string, upcoming: Array<{
  base: MediaItem;
  continuation: MediaItem;
  label: string;
  dateLabel: string;
  sortDate: string;
}>) {
  if (!upcoming.length) {
    return;
  }

  const recentCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();

  for (const entry of upcoming) {
    if (!entry.sortDate) continue;
    const today = new Date().toISOString().slice(0, 10);
    if (entry.sortDate <= today) continue;

    const persisted = await persistMediaItem(entry.continuation);
    const message = `Coming soon: ${entry.continuation.title} · ${entry.label} · ${entry.dateLabel}`;

    const existing = await queryOne<{ id: string }>(
      `
        SELECT id
        FROM notifications
        WHERE user_id = ? AND type = 'info' AND media_id = ? AND message = ? AND created_at >= ?
        LIMIT 1
      `,
      [userId, persisted.id, message, recentCutoff],
    );

    if (existing) {
      continue;
    }

    await execute(
      `
        INSERT INTO notifications (id, user_id, type, message, media_id, status, created_at)
        VALUES (?, ?, 'info', ?, ?, 'unread', CURRENT_TIMESTAMP)
      `,
      [uuid(), userId, message, persisted.id],
    );
  }
}

export async function searchUsers(viewerId: string, query: string) {
  const trimmed = query.trim();
  const viewerFriendIds = await getFriendIds(viewerId);
  const requests = await queryAll<FriendRequestRow>(
    `
      SELECT *
      FROM friend_requests
      WHERE (from_user_id = ? OR to_user_id = ?) AND status = 'pending'
    `,
    [viewerId, viewerId],
  );

  const users = await queryAll<UserRow>(
    trimmed
      ? `
          SELECT *
          FROM users
          WHERE id <> ? AND (
            LOWER(name) LIKE LOWER(?) OR
            LOWER(email) LIKE LOWER(?) OR
            LOWER(bio) LIKE LOWER(?)
          )
          ORDER BY name ASC
          LIMIT 8
        `
      : `
          SELECT *
          FROM users
          WHERE id <> ?
          ORDER BY name ASC
          LIMIT 8
        `,
    trimmed ? [viewerId, `%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`] : [viewerId],
  );

  return users.map((user) => {
    const request = requests.find(
      (entry) =>
        (entry.from_user_id === viewerId && entry.to_user_id === user.id) ||
        (entry.to_user_id === viewerId && entry.from_user_id === user.id),
    );

    return {
      id: user.id,
      name: user.name || "Vault user",
      handle: buildHandle(user.name, user.email, user.id),
      avatarUrl: user.image ?? undefined,
      relationship: viewerFriendIds.includes(user.id)
        ? "friend"
        : request?.from_user_id === viewerId
          ? "outgoing"
          : request?.to_user_id === viewerId
            ? "incoming"
            : "none",
    };
  });
}

export async function sendFriendRequest(viewerId: string, targetId: string) {
  if (viewerId === targetId) return;

  const [viewer, target, viewerFriendIds, reverseRequest] = await Promise.all([
    getUserById(viewerId),
    getUserById(targetId),
    getFriendIds(viewerId),
    queryOne<FriendRequestRow>(
      `
        SELECT *
        FROM friend_requests
        WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
        LIMIT 1
      `,
      [targetId, viewerId],
    ),
  ]);

  if (!viewer || !target) {
    throw new Error("User not found.");
  }

  if (viewerFriendIds.includes(targetId)) {
    return;
  }

  if (reverseRequest) {
    await acceptFriendRequest(viewerId, targetId);
    return;
  }

  const existing = await queryOne<FriendRequestRow>(
    `
      SELECT *
      FROM friend_requests
      WHERE from_user_id = ? AND to_user_id = ?
      LIMIT 1
    `,
    [viewerId, targetId],
  );

  if (existing) {
    await execute(
      `
        UPDATE friend_requests
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [existing.id],
    );
  } else {
    await execute(
      `
        INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [uuid(), viewerId, targetId],
    );
  }

  await Promise.all([
    createNotification({
      userId: targetId,
      fromUserId: viewerId,
      type: "friend_request",
      message: `${viewer.name || "Someone"} sent you a friend request.`,
    }),
    createNotification({
      userId: viewerId,
      fromUserId: targetId,
      type: "info",
      message: `Friend request sent to ${target.name || "that user"}.`,
    }),
  ]);
}

export async function acceptFriendRequest(viewerId: string, fromUserId: string) {
  const [viewer, other] = await Promise.all([
    getUserById(viewerId),
    getUserById(fromUserId),
  ]);

  if (!viewer || !other) {
    throw new Error("User not found.");
  }

  const request = await queryOne<FriendRequestRow>(
    `
      SELECT *
      FROM friend_requests
      WHERE from_user_id = ? AND to_user_id = ?
      LIMIT 1
    `,
    [fromUserId, viewerId],
  );

  if (request) {
    await execute(
      `
        UPDATE friend_requests
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [request.id],
    );
  } else {
    await execute(
      `
        INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [uuid(), fromUserId, viewerId],
    );
  }

  await Promise.all([
    execute(
      `
        INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
      [viewerId, fromUserId],
    ),
    execute(
      `
        INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
      [fromUserId, viewerId],
    ),
    execute(
      `
        UPDATE notifications
        SET type = 'friend_accepted', message = ?, status = 'read'
        WHERE user_id = ? AND from_user_id = ? AND type = 'friend_request'
      `,
      [`You accepted ${other.name || "their"} friend request.`, viewerId, fromUserId],
    ),
  ]);

  await createNotification({
    userId: fromUserId,
    fromUserId: viewerId,
    type: "friend_accepted",
    message: `${viewer.name || "A user"} accepted your friend request.`,
  });
}

export async function sendRecommendation(viewerId: string, targetId: string, item: MediaItem) {
  if (viewerId === targetId) {
    return;
  }

  const [viewer, media, friendship, recentRecommendation] = await Promise.all([
    getUserById(viewerId),
    persistMediaItem(item),
    queryOne<{ user_id: string; friend_id: string }>(
      `SELECT user_id, friend_id FROM friendships WHERE user_id = ? AND friend_id = ? LIMIT 1`,
      [viewerId, targetId],
    ),
    queryOne<{ id: string }>(
      `
        SELECT id
        FROM notifications
        WHERE user_id = ? AND from_user_id = ? AND type = 'recommendation' AND media_id = ? AND created_at >= ?
        LIMIT 1
      `,
      [targetId, viewerId, item.id, new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()],
    ),
  ]);

  if (!viewer) {
    throw new Error("User not found.");
  }

  if (!friendship) {
    throw new Error("Recommendations are only available for friends.");
  }

  if (recentRecommendation) {
    throw new Error("You already recommended this recently. Try again later.");
  }

  const review = normalizeReviewInput({
    rating: item.userRating ?? null,
    review: item.userReview ?? null,
  });
  const message = review.rating
    ? `${viewer.name || "Someone"} watched ${item.title} and rated it ${renderStars(review.rating)}.`
    : `${viewer.name || "Someone"} recommended ${item.title} to you.`;

  await Promise.all([
    createNotification({
      userId: targetId,
      fromUserId: viewerId,
      mediaId: media.id,
      type: "recommendation",
      message,
    }),
    createNotification({
      userId: viewerId,
      fromUserId: targetId,
      mediaId: media.id,
      type: "info",
      message: `You sent ${item.title} to a friend${review.rating ? ` with ${renderStars(review.rating)}` : ""}.`,
    }),
  ]);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await execute(
    `
      UPDATE notifications
      SET status = 'read'
      WHERE id = ? AND user_id = ?
    `,
    [notificationId, userId],
  );
}

export async function dismissNotification(userId: string, notificationId: string) {
  await execute(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [notificationId, userId]);
}

export async function declineFriendRequest(viewerId: string, fromUserId: string) {
  await execute(
    `
      UPDATE friend_requests
      SET status = 'declined', updated_at = CURRENT_TIMESTAMP
      WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
    `,
    [fromUserId, viewerId],
  );

  await createNotification({
    userId: fromUserId,
    fromUserId: viewerId,
    type: "info",
    message: "Your friend request was declined.",
  });
}

export async function removeFriend(viewerId: string, friendId: string) {
  await Promise.all([
    execute(
      `
        DELETE FROM friendships
        WHERE (user_id = ? AND friend_id = ?)
           OR (user_id = ? AND friend_id = ?)
      `,
      [viewerId, friendId, friendId, viewerId],
    ),
    execute(
      `
        DELETE FROM friend_requests
        WHERE (from_user_id = ? AND to_user_id = ?)
           OR (from_user_id = ? AND to_user_id = ?)
      `,
      [viewerId, friendId, friendId, viewerId],
    ),
  ]);
}

export async function getFriendSuggestions(viewerId: string, limit = 6) {
  const friendIds = await getFriendIds(viewerId);
  if (!friendIds.length) return [];

  const rows = await queryAll<{ friend_id: string }>(
    `
      SELECT friend_id
      FROM friendships
      WHERE user_id IN (${friendIds.map(() => "?").join(",")})
        AND friend_id <> ?
        AND friend_id NOT IN (${friendIds.map(() => "?").join(",")})
      LIMIT ?
    `,
    [...friendIds, viewerId, ...friendIds, limit * 3],
  );

  const candidateIds = [...new Set(rows.map((row) => row.friend_id))];
  if (!candidateIds.length) return [];

  const users = await queryAll<UserRow>(
    `SELECT id, name, image, email FROM users WHERE id IN (${candidateIds.map(() => "?").join(",")})`,
    candidateIds,
  );

  const idToCount = new Map<string, number>();
  for (const row of rows) {
    idToCount.set(row.friend_id, (idToCount.get(row.friend_id) || 0) + 1);
  }

  return users
    .sort((a, b) => (idToCount.get(b.id) || 0) - (idToCount.get(a.id) || 0))
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      handle: u.name ?? "",
      avatarUrl: u.image ?? undefined,
      mutualCount: idToCount.get(u.id) || 0,
    }));
}

export type FriendActivityEntry = {
  id: string;
  type: "watched" | "folder";
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  media?: {
    id: string;
    title: string;
    slug: string;
    type: string;
    coverUrl?: string;
    rating?: number | null;
  };
  rating?: number | null;
  notes?: string | null;
  folderName?: string;
  folderSlug?: string;
  createdAt: Date;
};

export async function getFriendActivity(viewerId: string, limit = 30): Promise<FriendActivityEntry[]> {
  const friendIds = await getFriendIds(viewerId);
  if (!friendIds.length) return [];

  const [friends, watched, folderItems] = await Promise.all([
    queryAll<UserRow>(`SELECT id, name, image, watched_visibility FROM users WHERE id IN (${friendIds.map(() => "?").join(",")})`, friendIds),
    queryAll<WatchedRow>(
      `
        SELECT
          wi.user_id,
          wi.media_id,
          wi.watched_at,
          wi.rating,
          wi.notes,
          u.name AS user_name,
          u.email AS user_email,
          u.image AS user_image,
          u.watched_visibility,
          m.slug AS media_slug,
          m.title AS media_title,
          m.source AS media_source,
          m.source_id AS media_source_id,
          m.type AS media_type,
          m.cover_url AS media_cover_url,
          m.backdrop_url AS media_backdrop_url,
          m.rating AS media_rating,
          COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
        FROM watched_items wi
        JOIN users u ON u.id = wi.user_id
        JOIN media m ON m.id = wi.media_id
        LEFT JOIN media_genres mg ON mg.media_id = m.id
        LEFT JOIN genres g ON g.id = mg.genre_id
        WHERE wi.user_id IN (${friendIds.map(() => "?").join(",")})
        GROUP BY wi.user_id, wi.media_id
        ORDER BY wi.watched_at DESC
        LIMIT ?
      `,
      [...friendIds, limit],
    ),
    queryAll<FolderItemRow>(
      `
        SELECT
          fi.folder_id,
          fi.media_id,
          fi.created_at,
          f.user_id AS folder_user_id,
          f.name AS folder_name,
          f.slug AS folder_slug,
          f.visibility AS folder_visibility,
          m.slug AS media_slug,
          m.title AS media_title,
          m.source AS media_source,
          m.source_id AS media_source_id,
          m.type AS media_type,
          m.cover_url AS media_cover_url,
          m.backdrop_url AS media_backdrop_url,
          m.rating AS media_rating,
          COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
        FROM folder_items fi
        JOIN folders f ON f.id = fi.folder_id
        JOIN media m ON m.id = fi.media_id
        LEFT JOIN media_genres mg ON mg.media_id = m.id
        LEFT JOIN genres g ON g.id = mg.genre_id
        WHERE f.user_id IN (${friendIds.map(() => "?").join(",")}) AND f.visibility IN ('public', 'friends')
        GROUP BY fi.folder_id, fi.media_id
        ORDER BY fi.created_at DESC
        LIMIT ?
      `,
      [...friendIds, limit],
    ),
  ]);

  const friendMap = new Map(friends.map((friend) => [friend.id, friend]));

  const friendWatchedActivity = watched
    .filter((w) => {
      const friend = friendMap.get(w.user_id);
      if (!friend) return false;
      return canViewPrivacy(w.user_id, viewerId, friend.watched_visibility || "public", friendIds);
    })
    .map((w): FriendActivityEntry => {
      const friend = friendMap.get(w.user_id)!;
      return {
        id: `watched-${w.user_id}-${w.media_id}`,
        type: "watched",
        friendId: w.user_id,
        friendName: friend.name ?? "Unknown",
        friendAvatar: friend.image ?? undefined,
        media: {
          id: w.media_id,
          title: w.media_title,
          slug: w.media_slug,
          type: w.media_type,
          coverUrl: w.media_cover_url ?? undefined,
          rating: w.media_rating,
        },
        rating: w.rating,
        notes: w.notes,
        createdAt: new Date(w.watched_at),
      };
    });

  const friendFolderActivity = folderItems.map((fi): FriendActivityEntry => {
    const friend = friendMap.get(fi.folder_user_id)!;
    return {
      id: `folder-${fi.folder_id}-${fi.media_id}`,
      type: "folder",
      friendId: fi.folder_user_id,
      friendName: friend?.name ?? "Unknown",
      friendAvatar: friend?.image ?? undefined,
      media: {
        id: fi.media_id,
        title: fi.media_title,
        slug: fi.media_slug,
        type: fi.media_type,
        coverUrl: fi.media_cover_url ?? undefined,
        rating: fi.media_rating,
      },
      folderName: fi.folder_name,
      folderSlug: fi.folder_slug,
      createdAt: new Date(fi.created_at),
    };
  });

  return [...friendWatchedActivity, ...friendFolderActivity]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function getFriendProfilesWithStatus(viewerId: string) {
  const [friendIds, profiles] = await Promise.all([
    getFriendIds(viewerId),
    queryAll<UserRow>(`SELECT id, name, image, email FROM users WHERE id <> ? LIMIT 50`, [viewerId]),
  ]);

  const friendSet = new Set(friendIds);
  const suggestions = await getFriendSuggestions(viewerId, 8);

  return {
    friends: profiles
      .filter((p) => friendSet.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name ?? "Unknown",
        handle: p.name ?? "",
        avatarUrl: p.image ?? undefined,
      })),
    suggestions,
  };
}

export async function getAdminOverview() {
  const [userCountRow, mediaCountRow, settings] = await Promise.all([
    queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM users`),
    queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM media`),
    queryOne<{ id: string; hero_title: string | null; hero_subtitle: string | null }>(`SELECT * FROM site_settings WHERE id = 'global' LIMIT 1`),
  ]);

  return {
    userCount: userCountRow?.count ?? 0,
    mediaCount: mediaCountRow?.count ?? 0,
    settings: settings ?? { id: "global", hero_title: "", hero_subtitle: "" },
  };
}

export async function getAdminUsers() {
  return queryAll<UserRow>(`SELECT * FROM users ORDER BY created_at DESC`);
}

export async function toggleUserRole(userId: string) {
  const user = await getUserById(userId);
  if (!user) return;
  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  await execute(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nextRole, userId]);
}

export async function getSiteSettings() {
  const settings = await queryOne<{ id: string; hero_title: string | null; hero_subtitle: string | null }>(
    `SELECT * FROM site_settings WHERE id = 'global' LIMIT 1`,
  );
  return settings ?? { id: "global", hero_title: "", hero_subtitle: "" };
}

export async function updateSiteSettings(heroTitle: string, heroSubtitle: string) {
  await execute(
    `
      INSERT INTO site_settings (id, hero_title, hero_subtitle, updated_at)
      VALUES ('global', ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        hero_title = excluded.hero_title,
        hero_subtitle = excluded.hero_subtitle,
        updated_at = CURRENT_TIMESTAMP
    `,
    [heroTitle, heroSubtitle],
  );
}

export async function getPublicCommunityActivity(limit = 6) {
  return queryAll<WatchedRow>(
    `
      SELECT
        wi.user_id,
        wi.media_id,
        wi.watched_at,
        wi.rating,
        wi.notes,
        u.name AS user_name,
        u.image AS user_image,
        u.watched_visibility,
        m.slug AS media_slug,
        m.title AS media_title,
        m.source AS media_source,
        m.source_id AS media_source_id,
        m.type AS media_type,
        m.cover_url AS media_cover_url,
        m.backdrop_url AS media_backdrop_url,
        m.rating AS media_rating,
        COALESCE(GROUP_CONCAT(g.name, '||'), '') AS media_genre_names
      FROM watched_items wi
      JOIN users u ON u.id = wi.user_id
      JOIN media m ON m.id = wi.media_id
      LEFT JOIN media_genres mg ON mg.media_id = m.id
      LEFT JOIN genres g ON g.id = mg.genre_id
      WHERE u.watched_visibility = 'public'
      GROUP BY wi.user_id, wi.media_id
      ORDER BY wi.watched_at DESC
      LIMIT ?
    `,
    [limit],
  );
}
