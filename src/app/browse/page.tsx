import { auth } from "@/lib/auth";
import { getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseWorkspace } from "@/components/browse-workspace";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrowsePage() {
  const discoverySeed = Date.now() + Math.floor(Math.random() * 10_000);
  const bootstrapCatalog = await getBrowseBootstrapCatalog(discoverySeed);
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const [shellData, library] = session?.user?.id
    ? await Promise.all([
        getViewerShellData(session.user.id),
        getLibraryStateForUser(session.user.id),
      ])
    : [null, null];

  return (
    <div className="page-shell browse-page">
      <div className="app-shell-layout browse-layout">
        <AppSidebar active="browse" initialFolders={shellData?.folders ?? []} />
        <main className="workspace browse-workspace">
          <VaultClientPrimer
            library={library}
            profile={shellData ? { ...shellData, viewedProfile: shellData.viewerProfile, watched: [], wishlist: [], canSeeWatched: true, canSeeWishlist: true, viewingOwnProfile: true } : null}
          />
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
