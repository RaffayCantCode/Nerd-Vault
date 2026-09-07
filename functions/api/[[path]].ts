import { catalogAggregator } from "../../artifacts/api-server/src/services/catalog-aggregator";
import {
  setD1Binding,
  findUserById,
  findUserByEmail,
  createUser,
  getUserVaultItems,
  trackMediaItem,
  removeMediaItem,
  getUserShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  getShelfById,
  addMediaToShelf,
  removeMediaFromShelf,
  upsertMedia,
  getFriendActivityStream,
  getFriendsList,
  getSuggestedUsers,
  sendFriendRequest,
  respondFriendRequest,
  searchUsers,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getFriendRecommendations,
  sendFriendRecommendation,
  dismissFriendRecommendation,
  calculateProfileStats,
  getMediaReviews,
  updateUserProfile,
} from "../../lib/db/src";

function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

function getUserId(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace(/^Bearer\s+/i, "");
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/nv_user_id=([^;]+)/);
  return match ? match[1] : undefined;
}

export const onRequest: any = async (context: any) => {
  const { request, env } = context;

  // Set environment variables and native D1 binding
  if (env?.DB) {
    setD1Binding(env.DB);
  }
  if (env?.TMDB_API_KEY) {
    process.env.TMDB_API_KEY = env.TMDB_API_KEY;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const currentUserId = getUserId(request);

  try {
    // -------------------------------------------------------------
    // CATALOG
    // -------------------------------------------------------------
    if (path === "/api/catalog/home" && method === "GET") {
      const feed = await catalogAggregator.getHomeFeed();
      return jsonResponse(feed, 200, {
        "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1800",
      });
    }

    if (path === "/api/catalog/discover" && method === "GET") {
      const type = url.searchParams.get("type") || undefined;
      const genre = url.searchParams.get("genre") || undefined;
      const mood = url.searchParams.get("mood") || undefined;
      const sort = (url.searchParams.get("sort") as any) || undefined;
      const q = url.searchParams.get("q") || url.searchParams.get("search") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const seed = url.searchParams.get("seed") || undefined;
      const curation = url.searchParams.get("curation") || undefined;

      const result = await catalogAggregator.discover({ type, genre, mood, sort, query: q, page, seed, curation });
      const cacheHeader = q
        ? "no-store, no-cache, must-revalidate"
        : "public, max-age=60, s-maxage=600, stale-while-revalidate=1800";
      return jsonResponse(result, 200, {
        "Cache-Control": cacheHeader,
      });
    }

    if (path === "/api/catalog/search" && method === "GET") {
      const q = url.searchParams.get("q") || url.searchParams.get("search") || "";
      const type = url.searchParams.get("type") || undefined;
      const items = await catalogAggregator.search(q, type);
      return jsonResponse({ items, results: items }, 200, {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
    }

    if (path.startsWith("/api/catalog/media/") && path.endsWith("/reviews") && method === "GET") {
      const mediaId = path.replace("/api/catalog/media/", "").replace("/reviews", "");
      const reviews = await getMediaReviews(decodeURIComponent(mediaId), currentUserId);
      return jsonResponse({ reviews });
    }

    if (path.startsWith("/api/catalog/media/") && method === "GET") {
      const rawMediaId = path.replace("/api/catalog/media/", "");
      const mediaId = decodeURIComponent(rawMediaId);
      let item = await catalogAggregator.getMediaDetails(mediaId);

      if (!item) {
        // Fallback to database stored media record
        const dbMedia = await findMediaById(mediaId);
        if (dbMedia) {
          item = {
            id: dbMedia.id,
            slug: dbMedia.slug || dbMedia.id,
            title: dbMedia.title,
            originalTitle: dbMedia.originalTitle || undefined,
            type: (dbMedia.type as any) || "Movie",
            year: dbMedia.releaseYear ? String(dbMedia.releaseYear) : "2024",
            rating: dbMedia.rating ? String(dbMedia.rating) : "4.0",
            genre: "Featured",
            genres: [],
            poster: dbMedia.coverUrl || "",
            backdrop: dbMedia.backdropUrl || undefined,
            overview: dbMedia.overview || "",
            runtime: dbMedia.runtime ? `${dbMedia.runtime}m` : undefined,
            trailerUrl: dbMedia.trailerUrl || undefined,
            source: (dbMedia.source as any) || "tmdb",
            sourceId: dbMedia.sourceId || dbMedia.id,
          };
        }
      }

      if (!item) return jsonResponse({ error: "Not found" }, 404);
      return jsonResponse({ item }, 200, {
        "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1800",
      });
    }

    // -------------------------------------------------------------
    // AUTH
    // -------------------------------------------------------------
    if (path === "/api/auth/me" && method === "GET") {
      if (!currentUserId) return jsonResponse({ user: null });
      const user = await findUserById(currentUserId);
      return jsonResponse({ user: user || null });
    }

    if (path === "/api/auth/login" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required" }, 400);
      }
      const user = await findUserByEmail(email);
      if (!user) {
        return jsonResponse({ error: "Invalid email or password" }, 401);
      }
      const stored = (user as any).password_hash || (user as any).passwordHash || (user as any).password;
      if (stored && stored !== password) {
        return jsonResponse({ error: "Invalid email or password" }, 401);
      }
      return jsonResponse(
        { user: { id: user.id, name: user.name, email: user.email, image: user.image, bio: user.bio }, token: user.id },
        200,
        { "Set-Cookie": `nv_user_id=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` }
      );
    }

    if (path === "/api/auth/register" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { name, email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required" }, 400);
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        return jsonResponse({ error: "A user with this email already exists" }, 400);
      }
      const userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const user = await createUser({
        id: userId,
        name: name || email.split("@")[0],
        email,
        password,
        passwordHash: password,
      });
      return jsonResponse(
        { user: { id: user.id, name: user.name, email: user.email, image: user.image, bio: user.bio }, token: user.id },
        200,
        { "Set-Cookie": `nv_user_id=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` }
      );
    }

    if (path === "/api/auth/logout" && method === "POST") {
      return jsonResponse({ success: true }, 200, {
        "Set-Cookie": "nv_user_id=; Path=/; HttpOnly; Max-Age=0",
      });
    }

    // -------------------------------------------------------------
    // VAULT
    // -------------------------------------------------------------
    if (path === "/api/vault" && method === "GET") {
      if (!currentUserId) return jsonResponse({ items: [], stats: null });
      const items = await getUserVaultItems(currentUserId);
      const stats = await calculateProfileStats(currentUserId);
      return jsonResponse({ items, stats });
    }

    if (path === "/api/vault/track" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      const { mediaId, media, status, rating, notes, progress, isPrivate } = body;
      const item = await trackMediaItem({
        userId: currentUserId,
        mediaId,
        mediaData: media || {},
        status: status || "Watching",
        userRating: rating,
        notes,
        progress,
        isPrivate: isPrivate ?? false,
      });
      const items = await getUserVaultItems(currentUserId);
      const stats = await calculateProfileStats(currentUserId);
      return jsonResponse({ success: true, item, items, stats });
    }

    if (path === "/api/vault/remove" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      await removeMediaItem(currentUserId, body.mediaId);
      return jsonResponse({ success: true });
    }

    // -------------------------------------------------------------
    // SHELVES & CUSTOM COLLECTIONS
    // -------------------------------------------------------------
    if (path === "/api/shelves" && method === "GET") {
      if (!currentUserId) return jsonResponse({ shelves: [] });
      const shelves = await getUserShelves(currentUserId);
      return jsonResponse({ shelves });
    }

    if (path === "/api/shelves" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized. Please sign in." }, 401);
      const body = await request.json().catch(() => ({}));
      if (!body.name) return jsonResponse({ error: "Shelf name is required" }, 400);
      const shelf = await createShelf({
        userId: currentUserId,
        name: body.name,
        description: body.description,
        coverUrl: body.coverUrl,
        visibility: body.visibility || (body.isPublic ? "public" : "private"),
      });
      return jsonResponse({ shelf });
    }

    if (path.startsWith("/api/shelves/") && method === "GET" && !path.includes("/items")) {
      const shelfId = path.replace("/api/shelves/", "");
      const result = await getShelfById(shelfId, currentUserId);
      if (!result) return jsonResponse({ error: "Shelf not found" }, 404);
      return jsonResponse(result);
    }

    if (path.startsWith("/api/shelves/") && (method === "PATCH" || method === "PUT") && !path.includes("/items")) {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized. Please sign in." }, 401);
      const shelfId = path.replace("/api/shelves/", "");
      const body = await request.json().catch(() => ({}));
      const shelf = await updateShelf(shelfId, currentUserId, {
        name: body.name,
        description: body.description,
        visibility: body.visibility,
        coverUrl: body.coverUrl,
      });
      if (!shelf) return jsonResponse({ error: "Shelf not found or not permitted to edit" }, 404);
      return jsonResponse({ shelf });
    }

    if (path.startsWith("/api/shelves/") && method === "DELETE" && !path.includes("/items")) {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized. Please sign in." }, 401);
      const shelfId = path.replace("/api/shelves/", "");
      await deleteShelf(shelfId, currentUserId);
      return jsonResponse({ success: true });
    }

    if (path.startsWith("/api/shelves/") && path.endsWith("/items") && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized. Please sign in." }, 401);
      const shelfId = path.replace("/api/shelves/", "").replace("/items", "");
      const body = await request.json().catch(() => ({}));
      if (!body.mediaId) return jsonResponse({ error: "mediaId is required" }, 400);

      if (body.mediaData) {
        const rawCover = body.mediaData.poster || body.mediaData.coverUrl || body.mediaData.cover_url;
        const rawBackdrop = body.mediaData.backdrop || body.mediaData.backdropUrl || body.mediaData.backdrop_url;
        await upsertMedia({
          id: body.mediaId,
          slug: body.mediaData.slug || body.mediaId,
          title: body.mediaData.title || "Untitled",
          originalTitle: body.mediaData.originalTitle,
          overview: body.mediaData.overview,
          type: body.mediaData.type || "Movie",
          releaseYear: body.mediaData.releaseYear || body.mediaData.year ? Number(body.mediaData.releaseYear || body.mediaData.year) : undefined,
          runtime: body.mediaData.runtime ? Number(body.mediaData.runtime.toString().replace(/\D/g, "")) : undefined,
          rating: body.mediaData.rating ? Number(body.mediaData.rating) : undefined,
          coverUrl: rawCover,
          backdropUrl: rawBackdrop,
          trailerUrl: body.mediaData.trailerUrl,
          source: body.mediaData.source || "tmdb",
          sourceId: body.mediaData.sourceId || body.mediaId,
        });
      }

      await addMediaToShelf(shelfId, body.mediaId);
      return jsonResponse({ success: true });
    }

    if (path.startsWith("/api/shelves/") && path.includes("/items/") && method === "DELETE") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized. Please sign in." }, 401);
      const match = path.match(/^\/api\/shelves\/([^/]+)\/items\/([^/]+)$/);
      if (!match) return jsonResponse({ error: "Invalid path" }, 400);
      const [, shelfId, mediaId] = match;
      await removeMediaFromShelf(shelfId, mediaId);
      return jsonResponse({ success: true });
    }

    // -------------------------------------------------------------
    // SOCIAL & FRIENDS
    // -------------------------------------------------------------
    if (path === "/api/social/notifications" && method === "GET") {
      if (!currentUserId) return jsonResponse({ notifications: [] });
      const notifications = await getUserNotifications(currentUserId);
      return jsonResponse({ notifications });
    }

    if ((path === "/api/social/notifications/read" || path === "/api/social/notifications/delete") && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      if (body.notificationId) {
        await deleteNotification(body.notificationId, currentUserId);
      } else {
        await deleteAllNotifications(currentUserId);
      }
      return jsonResponse({ success: true });
    }

    if (path === "/api/social/search-users" && method === "GET") {
      const q = url.searchParams.get("q") || "";
      const users = await searchUsers(q, currentUserId);
      return jsonResponse({ users });
    }

    if (path === "/api/social/activity" && method === "GET") {
      if (!currentUserId) return jsonResponse({ activity: [] });
      const activity = await getFriendActivityStream(currentUserId);
      return jsonResponse({ activity });
    }

    if (path === "/api/social/friends" && method === "GET") {
      if (!currentUserId) return jsonResponse({ friends: [], suggested: [] });
      const [friends, suggested] = await Promise.all([
        getFriendsList(currentUserId),
        getSuggestedUsers(currentUserId),
      ]);
      return jsonResponse({ friends, suggested });
    }

    if (path === "/api/social/request" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      await sendFriendRequest(currentUserId, body.toUserId);
      return jsonResponse({ success: true });
    }

    if (path === "/api/social/respond-request" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      await respondFriendRequest(body.fromUserId, currentUserId, body.action);
      return jsonResponse({ success: true });
    }

    if (path === "/api/social/recommendations" && method === "GET") {
      if (!currentUserId) return jsonResponse({ recommendations: [] });
      const recommendations = await getFriendRecommendations(currentUserId);
      return jsonResponse({ recommendations });
    }

    if (path === "/api/social/recommend" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      await sendFriendRecommendation(currentUserId, body.toUserId, body.mediaId, body.note || "Check this out!");
      return jsonResponse({ success: true });
    }

    if (path.startsWith("/api/social/recommendations/") && path.endsWith("/dismiss") && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const id = path.replace("/api/social/recommendations/", "").replace("/dismiss", "");
      await dismissFriendRecommendation(id, currentUserId);
      return jsonResponse({ success: true });
    }

    // -------------------------------------------------------------
    // PROFILE
    // -------------------------------------------------------------
    if (path === "/api/profile" && method === "GET") {
      if (!currentUserId) return jsonResponse({ user: null, stats: null, favorites: [], logs: [], recentActivity: [] });
      const user = await findUserById(currentUserId);
      const [stats, vault] = await Promise.all([
        calculateProfileStats(currentUserId),
        getUserVaultItems(currentUserId),
      ]);
      const favorites = vault.filter((i) => i.status === "Favorite" || (i.notes && i.notes.includes("#favorite")));
      const activity = vault.slice(0, 10).map((v) => ({
        id: v.id,
        type: v.status === "Completed" ? "Completed" : "Logged",
        title: v.title,
        mediaType: v.type,
        time: "Recently",
        rating: v.userRating,
      }));
      return jsonResponse({ user, stats, favorites, logs: vault, recentActivity: activity, isOwner: true });
    }

    if (path.startsWith("/api/profile/") && method === "GET") {
      const targetUserId = path.replace("/api/profile/", "");
      const user = await findUserById(targetUserId);
      if (!user) return jsonResponse({ error: "User not found" }, 404);
      const [stats, vault] = await Promise.all([
        calculateProfileStats(targetUserId),
        getUserVaultItems(targetUserId),
      ]);
      const favorites = vault.filter((i) => i.status === "Favorite" || (i.notes && i.notes.includes("#favorite")));
      const activity = vault.slice(0, 10).map((v) => ({
        id: v.id,
        type: v.status === "Completed" ? "Completed" : "Logged",
        title: v.title,
        mediaType: v.type,
        time: "Recently",
        rating: v.userRating,
      }));
      return jsonResponse({ user, stats, favorites, logs: vault, recentActivity: activity, isOwner: currentUserId === targetUserId });
    }

    if (path === "/api/profile" && method === "PUT") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      const updated = await updateUserProfile(currentUserId, body);
      return jsonResponse({ user: updated });
    }

    return jsonResponse({ error: `Not found: ${path}` }, 404);
  } catch (err: any) {
    console.error("Cloudflare Pages Function Error:", err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
};
