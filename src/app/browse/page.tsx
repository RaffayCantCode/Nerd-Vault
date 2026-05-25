import { auth } from "@/lib/auth";
import { getBrowseBootstrapCatalog, getBrowseDiscoverySeed } from "@/lib/browse-bootstrap";
import { AppSidebar } from "@/components/app-sidebar";
import { BrowseWorkspace } from "@/components/browse-workspace";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";

const INITIAL_BROWSE_TOTAL_PAGES = 50;

export const revalidate = 300;

export default async function BrowsePage() {
  const discoverySeed = getBrowseDiscoverySeed();
  const [bootstrapCatalog, session] = await Promise.all([
    getBrowseBootstrapCatalog(discoverySeed),
    auth(),
  ]);
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
          <BrowseWorkspace
            catalog={bootstrapCatalog.catalog}
            surfacingCatalog={bootstrapCatalog.surfacing}
            discoverySeed={discoverySeed}
            initialBootstrapPageSize={bootstrapCatalog.catalog.length || 12}
            initialTotalPages={INITIAL_BROWSE_TOTAL_PAGES}
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData?.viewerProfile ?? null}
            initialFriends={shellData?.friends ?? []}
          />
        </main>
      </div>
    </div>
  );
}
