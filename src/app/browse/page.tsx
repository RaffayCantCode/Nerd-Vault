import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseWorkspace } from "@/components/browse-workspace";
import { getViewerShellData } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrowsePage() {
  noStore();
  const discoverySeed = Date.now() + Math.floor(Math.random() * 10_000);
  const bootstrapCatalog = await getBrowseBootstrapCatalog(discoverySeed);
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const shellData = session?.user?.id ? await getViewerShellData(session.user.id) : null;

  return (
    <div className="page-shell browse-page">
      <div className="app-shell-layout browse-layout">
        <AppSidebar active="browse" initialFolders={shellData?.folders ?? []} />
        <main className="workspace browse-workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData?.viewerProfile ?? null}
            initialFriends={shellData?.friends ?? []}
          />
          <BrowseWorkspace
            catalog={bootstrapCatalog}
            discoverySeed={discoverySeed}
            initialBootstrapPageSize={bootstrapCatalog.length || 12}
            initialTotalPages={24}
          />
        </main>
      </div>
    </div>
  );
}
