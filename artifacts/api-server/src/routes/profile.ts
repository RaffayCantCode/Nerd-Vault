import { Router } from "express";
import { findUserById, updateUserProfile, calculateProfileStats, getUserVaultItems } from "@workspace/db";

const router = Router();

function getReqUserId(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;
}

async function handleGetProfile(targetId: string | undefined, currentUserId: string | undefined, res: any) {
  if (!targetId) {
    return res.json({
      user: null,
      isOwner: false,
      stats: {
        totalCollected: 0,
        hoursWatched: 0,
        topGenre: "Cinema",
        topGenreCount: 0,
        averageRating: 0,
        tasteScore: 0,
        genresBreakdown: [],
      },
      favorites: [],
      logs: [],
      recentActivity: [],
    });
  }

  const user = await findUserById(targetId);
  if (!user) {
    return res.json({
      user: null,
      isOwner: false,
      stats: {
        totalCollected: 0,
        hoursWatched: 0,
        topGenre: "Cinema",
        topGenreCount: 0,
        averageRating: 0,
        tasteScore: 0,
        genresBreakdown: [],
      },
      favorites: [],
      logs: [],
      recentActivity: [],
    });
  }

  const [stats, vaultItems] = await Promise.all([
    calculateProfileStats(user.id),
    getUserVaultItems(user.id),
  ]);

  const favorites = vaultItems.filter((i) => {
    const r = i.userRating || i.rating;
    return i.status === "Favorite" || (r && r >= 4.5);
  });

  const recentActivity = vaultItems.slice(0, 10).map((i) => ({
    id: i.id,
    type: i.status === "Completed" ? "Completed" : i.status === "Favorite" ? "Favorited" : i.status || "Tracked",
    mediaType: i.type,
    title: i.title,
    time: "Recently",
    rating: i.userRating ? (i.userRating > 5 ? (i.userRating / 2).toFixed(1) : i.userRating.toFixed(1)) : (i.rating ? (i.rating > 5 ? (i.rating / 2).toFixed(1) : i.rating.toFixed(1)) : undefined),
    poster: i.coverUrl,
    notes: i.notes,
  }));

  const isOwner = user.id === currentUserId;

  res.json({
    user,
    isOwner,
    stats,
    favorites,
    logs: vaultItems,
    recentActivity,
  });
}

/**
 * GET /api/profile
 */
router.get("/", async (req, res) => {
  try {
    const currentUserId = getReqUserId(req);
    await handleGetProfile(currentUserId, currentUserId, res);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load profile" });
  }
});

/**
 * GET /api/profile/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const currentUserId = getReqUserId(req);
    const targetId = req.params.id || currentUserId;
    await handleGetProfile(targetId, currentUserId, res);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load profile" });
  }
});

/**
 * PUT /api/profile
 */
router.put("/", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, bio, image, watchedVisibility, wishlistVisibility } = req.body;

    const updated = await updateUserProfile(userId, {
      name,
      bio,
      image,
      watchedVisibility,
      wishlistVisibility,
    });

    res.json({ user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});

export default router;
