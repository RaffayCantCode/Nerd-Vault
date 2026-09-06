import { Router } from "express";
import { catalogAggregator } from "../services/catalog-aggregator";
import { getMediaReviews } from "@workspace/db";

const router = Router();

function getReqUserId(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;
}

/**
 * GET /api/catalog/home
 */
router.get("/home", async (req, res) => {
  try {
    const feed = await catalogAggregator.getHomeFeed();
    res.json(feed);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch home feed" });
  }
});

/**
 * GET /api/catalog/discover
 */
router.get("/discover", async (req, res) => {
  try {
    const { type, genre, sort, q, search, mood, page, seed, curation } = req.query;
    const result = await catalogAggregator.discover({
      type: type as string,
      genre: genre as string,
      sort: sort as any,
      query: ((q || search) as string) || undefined,
      mood: mood as string,
      page: page ? parseInt(page as string, 10) : 1,
      seed: seed as string,
      curation: curation as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to discover media" });
  }
});

/**
 * GET /api/catalog/search
 */
router.get("/search", async (req, res) => {
  try {
    const query = ((req.query.q || req.query.search) as string) || "";
    const items = await catalogAggregator.search(query);
    res.json({ items, results: items });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

/**
 * GET /api/catalog/media/:id
 */
router.get("/media/:id", async (req, res) => {
  try {
    const item = await catalogAggregator.getMediaDetails(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Media not found" });
    }
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch media details" });
  }
});

/**
 * GET /api/catalog/media/:id/reviews
 */
router.get("/media/:id/reviews", async (req, res) => {
  try {
    const currentUserId = getReqUserId(req);
    const reviews = await getMediaReviews(req.params.id, currentUserId);
    res.json({ reviews });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch media reviews" });
  }
});

export default router;
