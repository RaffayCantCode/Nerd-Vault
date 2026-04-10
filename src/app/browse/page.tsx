import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseWorkspace } from "@/components/browse-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrowsePage() {
  noStore();
  const discoverySeed = Date.now() + Math.floor(Math.random() * 10_000);
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="browse" />
        <main className="workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
          />
          <BrowseWorkspace
            catalog={[]}
            discoverySeed={discoverySeed}
            initialTotalPages={30}
          />
        </main>
      </div>
    </div>
  );
}
