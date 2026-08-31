import { Router } from "express";
import { getUserVaultItems, trackMediaInVault, removeMediaFromVault, calculateProfileStats } from "@workspace/db";

const router = Router();

function getReqUserId(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;
}

/**
 * GET /api/vault
 * Returns the current user's tracked vault items and stats
 */
router.get("/", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({
        items: [],
        stats: {
          totalCollected: 0,
          hoursWatched: 0,
          topGenre: "Cinema",
          topGenreCount: 0,
          averageRating: 0,
          tasteScore: 0,
          genresBreakdown: [],
        },
      });
    }

    const [items, stats] = await Promise.all([
      getUserVaultItems(userId),
      calculateProfileStats(userId),
    ]);
    res.json({ items, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load vault" });
  }
});

/**
 * POST /api/vault/track
 * Add or update an item's status, rating, or review notes
 */
router.post("/track", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { mediaId, status = "Watching", rating, notes, mediaData } = req.body;

    if (!mediaId) {
      return res.status(400).json({ error: "mediaId is required" });
    }

    await trackMediaInVault({
      userId,
      mediaId,
      status,
      rating,
      notes,
      mediaData,
    });

    const [items, stats] = await Promise.all([
      getUserVaultItems(userId),
      calculateProfileStats(userId),
    ]);

    res.json({ success: true, items, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to track media" });
  }
});

/**
 * POST /api/vault/remove
 * Remove an item from the vault
 */
router.post("/remove", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({ error: "mediaId is required" });
    }

    await removeMediaFromVault(userId, mediaId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove media" });
  }
});

export default router;
