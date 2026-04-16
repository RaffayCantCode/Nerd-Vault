import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { HomeWorkspace } from "@/components/home-workspace";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser } from "@/lib/vault-server";

export default async function HomeHubPage() {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  if (!session?.user?.id) {
    return (
      <div className="page-shell">
        <div className="app-shell-layout">
          <AppSidebar active="home" />
          <main className="workspace">
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
            <section className="feature-block glass">
              <p className="eyebrow">Home hub</p>
              <h1 className="headline">Sign in to unlock your personal home page.</h1>
              <p className="copy">
                Home is built around your watched list, wishlist, and folders, so it needs your vault data before it can recommend anything useful.
              </p>
              <div className="button-row" style={{ marginTop: 18 }}>
                <Link href="/sign-in" className="button button-primary">
                  Sign in
                </Link>
                <Link href="/browse" className="button button-secondary">
                  Back to browse
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const user = await ensureCurrentUserRecord();
  const library = await getLibraryStateForUser(user.id);
  const feed = await buildHomeFeed(library);

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="home" />
        <main className="workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          <HomeWorkspace viewerName={viewerName} feed={feed} />
        </main>
      </div>
    </div>
  );
}
