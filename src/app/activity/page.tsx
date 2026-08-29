import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { ActivityFeed } from "@/components/activity-feed";
import { GuestVaultShell } from "@/components/guest-shell";

export default async function ActivityPage() {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  return (
    <div className="page-shell activity-page">
      <div className="app-shell-layout activity-layout">
        <AppSidebar
          active="activity"
          redirectTo="/activity"
          userName={session?.user?.name || null}
          isSignedIn={Boolean(session?.user?.id)}
        />
        <main className="workspace activity-workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} redirectTo="/activity" />
          {!session?.user?.id ? (
            <GuestVaultShell
              redirectTo="/activity"
              eyebrow="Activity"
              title="Friend activity unlocks after sign-in."
              message="See what your friends are watching, wishlisting, and rating by signing in to your account."
            />
          ) : (
            <ActivityFeed />
          )}
        </main>
      </div>
    </div>
  );
}
