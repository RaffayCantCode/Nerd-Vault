import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { ActivityFeed } from "@/components/activity-feed";
import { guestSignInHref } from "@/lib/guest";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(guestSignInHref());
  }

  const viewerName = session.user.name || "Guest vault";
  const viewerId = session.user.id;
  const viewerAvatar = session.user.image || undefined;

  return (
    <div className="page-shell activity-page">
      <div className="app-shell-layout activity-layout">
        <AppSidebar active="activity" />
        <main className="workspace activity-workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          <ActivityFeed />
        </main>
      </div>
    </div>
  );
}
