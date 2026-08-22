import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { GuestVaultShell } from "@/components/guest-shell";
import { VaultWorkspace } from "@/components/vault-workspace";
import { HomeScrollReset } from "@/components/home-scroll-reset";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser, getVaultProfilePayload, getViewerShellData } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

export default async function HomeHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth().catch(() => null);
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const asQuery = new URLSearchParams();
  if (resolvedSearchParams) {
    Object.entries(resolvedSearchParams).forEach(([key, val]) => {
      if (typeof val === "string") {
        asQuery.set(key, val);
      }
    });
  }
  const currentRedirectPath = `/home${asQuery.toString() ? `?${asQuery.toString()}` : ""}`;

  if (!session?.user?.id) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="vault" redirectTo={currentRedirectPath} />
          <main className="workspace home-workspace">
          <HomeScrollReset />
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} redirectTo={currentRedirectPath} />
            <GuestVaultShell redirectTo={currentRedirectPath} />
          </main>
        </div>
      </div>
    );
  }

  await ensureCurrentUserRecord().catch(() => undefined);

  const requestedUser = typeof resolvedSearchParams?.user === "string" ? resolvedSearchParams.user : undefined;
  const initialTab = resolvedSearchParams?.tab === "media" ? "your-media" : "for-you";

  // Run all three data fetches in parallel — eliminates the sequential waterfall
  const [shellData, library, profilePayload] = await Promise.all([
    getViewerShellData(session.user.id).catch(() => ({ folders: [], lists: [], viewerProfile: null, friends: [] })),
    getLibraryStateForUser(session.user.id).catch(() => ({ watched: [], wishlist: [], lists: [], folders: [] })),
    getVaultProfilePayload(session.user.id, requestedUser ?? session.user.id).catch(() => undefined),
  ]);

  // Build feed after library resolves (needs library data), but cached so usually near-instant
  const feed = await buildHomeFeed(library).catch(() => ({ greeting: "Welcome back! Start building your collection.", sections: { movie: [], show: [], anime: [], anime_movie: [], game: [], all: [] }, upcoming: [], watchedCounts: { movie: 0, show: 0, anime: 0, anime_movie: 0, game: 0, all: 0 } }));

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="vault" />
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
