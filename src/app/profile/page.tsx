import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();
  const userName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.email || session?.user?.name || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const isDemo = !session?.user;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="profile" />
        <main className="workspace">
          <AppTopBar viewerId={viewerId} viewerName={userName} viewerAvatar={viewerAvatar} />
          <ProfileWorkspace userName={userName} viewerId={viewerId} viewerAvatar={viewerAvatar} isDemo={isDemo} />
        </main>
      </div>
    </div>
  );
}
