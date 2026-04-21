import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { HomeWorkspace } from "@/components/home-workspace";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomeHubPage() {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  if (!session?.user?.id) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="home" />
          <main className="workspace home-workspace">
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
            <section className="auth-screen">
              <div className="auth-screen-card glass" style={{ width: "min(100%, 1040px)" }}>
                <div className="auth-screen-copy">
                  <p className="eyebrow">Home hub</p>
                  <h1 className="headline">To see Home, log in first.</h1>
                  <p className="copy">
                    Home depends on your personal vault data, so guest mode cannot open it yet.
                  </p>
                  <div className="button-row" style={{ marginTop: 18 }}>
                    <Link href="/sign-in?redirectTo=%2Fhome" className="button button-primary">
                      Go to login
                    </Link>
                  </div>
                </div>
                <div className="auth-screen-panel glass">
                  <div className="auth-panel-header">
                    <p className="eyebrow">Guest mode</p>
                    <h2 className="headline" style={{ margin: 0 }}>Browse is open, Home is locked.</h2>
                  </div>
                  <p className="copy" style={{ margin: 0 }}>
                    Log in and NerdVault will bring back your saved activity, recommendations, folders, and recent progress here.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  await ensureCurrentUserRecord();

  const [shellData, library] = await Promise.all([
    getViewerShellData(session.user.id).catch(() => ({ folders: [], viewerProfile: null, friends: [] })),
    getLibraryStateForUser(session.user.id).catch(() => ({ watched: [], wishlist: [], folders: [] }))
  ]);

  const feed = await buildHomeFeed(library);

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="home" initialFolders={shellData.folders} />
        <main className="workspace home-workspace">
          <VaultClientPrimer
            library={library}
            profile={shellData.viewerProfile ? { ...shellData, viewedProfile: shellData.viewerProfile, watched: library.watched, wishlist: library.wishlist, canSeeWatched: true, canSeeWishlist: true, viewingOwnProfile: true } : null}
          />
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData.viewerProfile}
            initialFriends={shellData.friends}
          />
          <HomeWorkspace viewerName={viewerName} feed={feed} />
        </main>
      </div>
    </div>
  );
}
