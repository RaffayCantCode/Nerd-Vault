import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { GuestVaultShell } from "@/components/guest-shell";
import { VaultWorkspace } from "@/components/vault-workspace";
import { HomeScrollReset } from "@/components/home-scroll-reset";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser, getVaultProfilePayload, getViewerShellData } from "@/lib/vault-server";

// Allow Netlify/CDN to cache the guest shell; signed-in sections still refresh per request via auth().
export const revalidate = 60;

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
            <GuestVaultShell redirectTo="/home" />
          </main>
        </div>
      </div>
    );
  }

  await ensureCurrentUserRecord().catch(() => undefined);

  const [shellData, library] = await Promise.all([
    getViewerShellData(session.user.id).catch(() => ({ folders: [], viewerProfile: null, friends: [] })),
    getLibraryStateForUser(session.user.id).catch(() => ({ watched: [], wishlist: [], folders: [] }))
  ]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedUser = typeof resolvedSearchParams?.user === "string" ? resolvedSearchParams.user : undefined;
  const initialTab = resolvedSearchParams?.tab === "media" ? "your-media" : "for-you";
  const profilePayload = await getVaultProfilePayload(session.user.id, requestedUser ?? session.user.id).catch(() => undefined);

  const feed = await buildHomeFeed(library).catch(() => ({ greeting: "Welcome back! Start building your collection.", sections: { movie: [], show: [], anime: [], anime_movie: [], game: [], all: [] }, upcoming: [], watchedCounts: { movie: 0, show: 0, anime: 0, anime_movie: 0, game: 0, all: 0 } }));

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
