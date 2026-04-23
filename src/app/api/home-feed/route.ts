import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, ensureUpcomingInboxNotifications, getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallelize database calls for better performance
    const [user, shellData, library] = await Promise.all([
      ensureCurrentUserRecord(),
      getViewerShellData(session.user.id).catch(() => ({ folders: [], viewerProfile: null, friends: [] })),
      getLibraryStateForUser(session.user.id).catch(() => ({ watched: [], wishlist: [], folders: [] }))
    ]);
    
    const feed = await buildHomeFeed(library);

    // Turn "coming soon" continuations into inbox notifications (deduped server-side).
    await ensureUpcomingInboxNotifications(session.user.id, feed.upcoming).catch(() => undefined);

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Error loading home feed:", error);
    return NextResponse.json(
      { error: "Failed to load home feed" },
      { status: 500 }
    );
  }
}
