import { Router } from "express";
import { catalogAggregator } from "../services/catalog-aggregator";
import { getMediaReviews } from "@workspace/db";
import { DEMO_USER } from "./auth";

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
    res.status(500).json({ error: error.message || "Failed to load home feed" });
  }
});

/**
 * GET /api/catalog/discover
 */
router.get("/discover", async (req, res) => {
  try {
    const { type, genre, mood, sort, search, page } = req.query;
    const results = await catalogAggregator.discover({
      type: type as any,
      genre: genre as string,
      mood: mood as string,
      sort: sort as any,
      search: search as string,
      page: page ? Number(page) : 1,
    });
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to discover media" });
  }
});

/**
 * GET /api/catalog/search
 */
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
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
    const media = await catalogAggregator.getMediaDetails(req.params.id);
    if (!media) {
      return res.status(404).json({ error: "Media item not found" });
    }
    res.json({ item: media });
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
    res.status(500).json({ error: error.message || "Failed to load reviews" });
  }
});

export default router;
