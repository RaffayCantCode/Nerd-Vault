import { Router } from "express";
import {
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
} from "@workspace/db";

const router = Router();

function getReqUserId(req: any): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.replace(/^Bearer\s+/i, "") || req.cookies?.nv_user_id;
}

/**
 * GET /api/social/notifications
 */
router.get("/notifications", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({ notifications: [] });
    }
    const notifications = await getUserNotifications(userId);
    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load notifications" });
  }
});

/**
 * POST /api/social/notifications/read
 */
router.post("/notifications/read", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { notificationId } = req.body;
    if (notificationId) {
      await markNotificationAsRead(notificationId, userId);
    } else {
      await markAllNotificationsAsRead(userId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark notifications read" });
  }
});

/**
 * GET /api/social/search-users
 */
router.get("/search-users", async (req, res) => {
  try {
    const currentUserId = getReqUserId(req);
    const query = (req.query.q as string) || "";
    const users = await searchUsers(query, currentUserId);
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to search users" });
  }
});

/**
 * GET /api/social/activity
 */
router.get("/activity", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({ activity: [] });
    }
    const activity = await getFriendActivityStream(userId);
    res.json({ activity });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load activity stream" });
  }
});

/**
 * GET /api/social/friends
 */
router.get("/friends", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({ friends: [], suggested: [] });
    }
    const [friends, suggested] = await Promise.all([
      getFriendsList(userId),
      getSuggestedUsers(userId),
    ]);
    res.json({ friends, suggested });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load friends" });
  }
});

/**
 * POST /api/social/request
 */
router.post("/request", async (req, res) => {
  try {
    const fromUserId = getReqUserId(req);
    if (!fromUserId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { toUserId } = req.body;
    if (!toUserId) {
      return res.status(400).json({ error: "toUserId is required" });
    }

    await sendFriendRequest(fromUserId, toUserId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send friend request" });
  }
});

/**
 * POST /api/social/respond-request
 */
router.post("/respond-request", async (req, res) => {
  try {
    const toUserId = getReqUserId(req);
    if (!toUserId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { fromUserId, action } = req.body;
    if (!fromUserId || !action) {
      return res.status(400).json({ error: "fromUserId and action are required" });
    }

    await respondFriendRequest(fromUserId, toUserId, action as any);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to respond to friend request" });
  }
});

/**
 * GET /api/social/recommendations
 */
router.get("/recommendations", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.json({ recommendations: [] });
    }
    const recommendations = await getFriendRecommendations(userId);
    res.json({ recommendations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load recommendations" });
  }
});

/**
 * POST /api/social/recommend
 */
router.post("/recommend", async (req, res) => {
  try {
    const fromUserId = getReqUserId(req);
    if (!fromUserId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }

    const { toUserId, mediaId, note = "Check this out on NerdVault!" } = req.body;
    if (!toUserId || !mediaId) {
      return res.status(400).json({ error: "toUserId and mediaId are required" });
    }

    await sendFriendRecommendation(fromUserId, toUserId, mediaId, note);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send recommendation" });
  }
});

/**
 * POST /api/social/recommendations/:id/dismiss
 */
router.post("/recommendations/:id/dismiss", async (req, res) => {
  try {
    const userId = getReqUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please sign in." });
    }
    await dismissFriendRecommendation(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to dismiss recommendation" });
  }
});

export default router;
