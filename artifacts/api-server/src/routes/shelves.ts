import { Router } from "express";
import { getUserShelves, createShelf, deleteShelf, addMediaToShelf, removeMediaFromShelf } from "@workspace/db";

const router = Router();

function getReqUserId(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;
}

/**
 * GET /api/shelves
 * List user's custom shelves
 */
router.get("/", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({ shelves: [] });
    }
    const shelves = await getUserShelves(userId);
    res.json({ shelves });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load shelves" });
  }
});

/**
 * POST /api/shelves
 * Create a new custom shelf
 */
router.post("/", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { name, description, visibility, coverUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Shelf name is required" });
    }

    const shelf = await createShelf({
      userId,
      name,
      description,
      visibility,
      coverUrl,
    });

    res.json({ shelf });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create shelf" });
  }
});

/**
 * DELETE /api/shelves/:id
 * Delete a shelf
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }
    await deleteShelf(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete shelf" });
  }
});

/**
 * POST /api/shelves/:id/items
 * Add media item to shelf
 */
router.post("/:id/items", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { mediaId } = req.body;
    if (!mediaId) {
      return res.status(400).json({ error: "mediaId is required" });
    }

    await addMediaToShelf(req.params.id, mediaId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add item to shelf" });
  }
});

/**
 * DELETE /api/shelves/:id/items/:mediaId
 * Remove media item from shelf
 */
router.delete("/:id/items/:mediaId", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }
    await removeMediaFromShelf(req.params.id, req.params.mediaId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove item from shelf" });
  }
});

export default router;
