import { Router } from "express";
import {
  getUserShelves,
  createShelf,
  updateShelf,
  deleteShelf,
  getShelfById,
  addMediaToShelf,
  removeMediaFromShelf,
  upsertMedia,
} from "@workspace/db";

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
 * GET /api/shelves/:id
 * Retrieve shelf details and its items
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    const result = await getShelfById(req.params.id, userId);
    if (!result) {
      return res.status(404).json({ error: "Shelf not found" });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load shelf" });
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
 * PATCH /api/shelves/:id
 * Update an existing shelf (name, description, visibility, coverUrl)
 */
router.patch("/:id", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { name, description, visibility, coverUrl } = req.body;
    const shelf = await updateShelf(req.params.id, userId, {
      name,
      description,
      visibility,
      coverUrl,
    });

    if (!shelf) {
      return res.status(404).json({ error: "Shelf not found or not permitted to edit" });
    }

    res.json({ shelf });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update shelf" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { name, description, visibility, coverUrl } = req.body;
    const shelf = await updateShelf(req.params.id, userId, {
      name,
      description,
      visibility,
      coverUrl,
    });

    if (!shelf) {
      return res.status(404).json({ error: "Shelf not found or not permitted to edit" });
    }

    res.json({ shelf });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update shelf" });
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

    const { mediaId, mediaData } = req.body;
    if (!mediaId) {
      return res.status(400).json({ error: "mediaId is required" });
    }

    if (mediaData) {
      const rawCover = mediaData.poster || mediaData.coverUrl || mediaData.cover_url;
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
