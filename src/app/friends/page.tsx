import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { FriendsPage } from "@/components/friends-page";
import { GuestVaultShell } from "@/components/guest-shell";

export default async function FriendsRoute() {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  return (
    <div className="page-shell friends-page-shell">
      <div className="app-shell-layout friends-layout">
        <AppSidebar
          active="friends"
          redirectTo="/friends"
          userName={session?.user?.name || null}
          isSignedIn={Boolean(session?.user?.id)}
        />
        <main className="workspace friends-workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} redirectTo="/friends" />
          {!session?.user?.id ? (
            <GuestVaultShell
              redirectTo="/friends"
              eyebrow="Friends"
              title="Social network unlocks after sign-in."
              message="Search for other users, send friend requests, accept recommendations, and build your circle."
            />
          ) : (
            <FriendsPage />
          )}
        </main>
      </div>
    </div>
  );
}
