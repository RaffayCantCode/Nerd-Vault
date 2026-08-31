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
  deleteShelf,
  addMediaToShelf,
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
      return jsonResponse(feed);
    }

    if (path === "/api/catalog/discover" && method === "GET") {
      const type = url.searchParams.get("type") || undefined;
      const genre = url.searchParams.get("genre") || undefined;
      const mood = url.searchParams.get("mood") || undefined;
      const sort = (url.searchParams.get("sort") as any) || undefined;
      const q = url.searchParams.get("q") || url.searchParams.get("search") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);

      const result = await catalogAggregator.discover({ type, genre, mood, sort, query: q, page });
      return jsonResponse(result);
    }

    if (path === "/api/catalog/search" && method === "GET") {
      const q = url.searchParams.get("q") || "";
      const items = await catalogAggregator.search(q);
      return jsonResponse({ items, results: items });
    }

    if (path.startsWith("/api/catalog/media/") && path.endsWith("/reviews") && method === "GET") {
      const mediaId = path.replace("/api/catalog/media/", "").replace("/reviews", "");
      const reviews = await getMediaReviews(decodeURIComponent(mediaId), currentUserId);
      return jsonResponse({ reviews });
    }

    if (path.startsWith("/api/catalog/media/") && method === "GET") {
      const mediaId = path.replace("/api/catalog/media/", "");
      const item = await catalogAggregator.getMediaDetails(decodeURIComponent(mediaId));
      if (!item) return jsonResponse({ error: "Not found" }, 404);
      return jsonResponse({ item });
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
    // SHELVES
    // -------------------------------------------------------------
    if (path === "/api/shelves" && method === "GET") {
      if (!currentUserId) return jsonResponse({ shelves: [] });
      const shelves = await getUserShelves(currentUserId);
      return jsonResponse({ shelves });
    }

    if (path === "/api/shelves" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      const shelf = await createShelf({
        userId: currentUserId,
        name: body.name,
        description: body.description,
        coverUrl: body.coverUrl,
        visibility: body.visibility || (body.isPublic ? "public" : "private"),
      });
      return jsonResponse({ shelf });
    }

    if (path.startsWith("/api/shelves/") && method === "DELETE") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const shelfId = path.replace("/api/shelves/", "");
      await deleteShelf(shelfId, currentUserId);
      return jsonResponse({ success: true });
    }

    if (path.startsWith("/api/shelves/") && path.endsWith("/items") && method === "POST") {
      const shelfId = path.replace("/api/shelves/", "").replace("/items", "");
      const body = await request.json().catch(() => ({}));
      await addMediaToShelf(shelfId, body.mediaId);
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

    if (path === "/api/social/notifications/read" && method === "POST") {
      if (!currentUserId) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json().catch(() => ({}));
      if (body.notificationId) {
        await markNotificationAsRead(body.notificationId, currentUserId);
      } else {
        await markAllNotificationsAsRead(currentUserId);
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
      const favorites = vault.filter((i) => i.status === "Favorite" || (i.userRating && i.userRating >= 4.5));
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
      const favorites = vault.filter((i) => i.status === "Favorite" || (i.userRating && i.userRating >= 4.5));
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
