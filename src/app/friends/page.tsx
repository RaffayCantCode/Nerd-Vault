import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { FriendsPage } from "@/components/friends-page";
import { guestSignInHref } from "@/lib/guest";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FriendsRoute() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(guestSignInHref());
  }

  const viewerName = session.user.name || "Guest vault";
  const viewerId = session.user.id;
  const viewerAvatar = session.user.image || undefined;

  return (
    <div className="page-shell friends-page-shell">
      <div className="app-shell-layout friends-layout">
        <AppSidebar active="friends" />
        <main className="workspace friends-workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          <FriendsPage />
        </main>
      </div>
    </div>
  );
}
