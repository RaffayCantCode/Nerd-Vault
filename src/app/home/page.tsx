import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { VaultWorkspace } from "@/components/vault-workspace";
import { HomeScrollReset } from "@/components/home-scroll-reset";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser, getVaultProfilePayload, getViewerShellData } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomeHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  if (!session?.user?.id) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="vault" />
          <main className="workspace home-workspace">
          <HomeScrollReset />
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
            <section className="auth-screen">
              <div className="auth-screen-card glass" style={{ width: "min(100%, 760px)", gridTemplateColumns: "1fr" }}>
                <div className="auth-screen-copy" style={{ justifyItems: "start" }}>
                  <p className="eyebrow">Home hub</p>
                  <h1 className="headline">You must be logged in to see this page.</h1>
                  <p className="copy">Sign in with the website account flow and then come back to your Vault.</p>
                  <div className="button-row" style={{ marginTop: 18 }}>
                    <Link href="/sign-in?redirectTo=/home" className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', padding: '0 24px' }}>
                      Sign in
                    </Link>
                  </div>
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

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedUser = typeof resolvedSearchParams?.user === "string" ? resolvedSearchParams.user : undefined;
  const initialTab = resolvedSearchParams?.tab === "media" ? "your-media" : "for-you";
  const profilePayload = await getVaultProfilePayload(session.user.id, requestedUser ?? session.user.id).catch(() => undefined);

  const feed = await buildHomeFeed(library);

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="vault" initialFolders={shellData.folders} />
        <main className="workspace home-workspace">
          <HomeScrollReset />
          <VaultClientPrimer
            library={library}
            profile={profilePayload ?? (shellData.viewerProfile ? { ...shellData, viewedProfile: shellData.viewerProfile, watched: library.watched, wishlist: library.wishlist, canSeeWatched: true, canSeeWishlist: true, viewingOwnProfile: true } : null)}
            profileUserId={requestedUser}
          />
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData.viewerProfile}
            initialFriends={shellData.friends}
          />
          <VaultWorkspace
            viewerName={viewerName}
            viewerId={viewerId}
            viewerAvatar={viewerAvatar}
            isDemo={false}
            feed={feed}
            initialProfilePayload={profilePayload}
            initialTab={initialTab}
          />
        </main>
      </div>
    </div>
  );
}
