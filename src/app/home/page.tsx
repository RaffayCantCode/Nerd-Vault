import Link from "next/link";
import { signInWithCredentials, signInWithGoogle } from "@/app/sign-in/actions";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { HomeWorkspace } from "@/components/home-workspace";
import { auth } from "@/lib/auth";
import { buildHomeFeed } from "@/lib/home-feed";
import { ensureCurrentUserRecord, getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";

export default async function HomeHubPage() {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  if (!session?.user?.id) {
    const googleReady = Boolean(
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
    );

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
                  <h1 className="headline">You can only open Home when you are logged in.</h1>
                  <p className="copy">
                    Guest mode can browse the catalog, but Home depends on your watched list, wishlist, folders, and profile data.
                  </p>
                  <p className="copy">
                    Log in below to unlock your personal upcoming lane, recommendations, and saved vault activity.
                  </p>
                  <div className="button-row" style={{ marginTop: 18 }}>
                    <Link href="/browse" className="button button-secondary">
                      Back to browse
                    </Link>
                    <Link href="/sign-in?mode=signup" className="button button-primary">
                      Create account
                    </Link>
                  </div>
                </div>
                <div className="auth-screen-panel glass">
                  <div className="auth-panel-header">
                    <p className="eyebrow">Log in</p>
                    <h2 className="headline" style={{ margin: 0 }}>Open your vault</h2>
                  </div>
                  <form action={signInWithCredentials} className="auth-form">
                    <input type="hidden" name="redirectTo" value="/home" />
                    <div className="auth-field">
                      <label htmlFor="home-login-email">Email</label>
                      <input id="home-login-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
                    </div>
                    <div className="auth-field">
                      <label htmlFor="home-login-password">Password</label>
                      <input id="home-login-password" name="password" type="password" placeholder="Your password" required minLength={8} autoComplete="current-password" />
                    </div>
                    <button type="submit" className="button button-primary auth-submit-button">
                      Log in to your vault
                    </button>
                  </form>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                  <form action={signInWithGoogle}>
                    <input type="hidden" name="redirectTo" value="/home" />
                    <button type="submit" className="button button-secondary auth-google-button" disabled={!googleReady}>
                      {googleReady ? "Continue with Google" : "Google sign-in not available"}
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Parallelize database calls for better performance
  const [user, shellData, library] = await Promise.all([
    ensureCurrentUserRecord(),
    getViewerShellData(session.user.id).catch(() => ({ folders: [], viewerProfile: null, friends: [] })),
    getLibraryStateForUser(session.user.id).catch(() => ({ watched: [], wishlist: [], folders: [] }))
  ]);
  
  const feed = await buildHomeFeed(library);

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="home" initialFolders={shellData.folders} />
        <main className="workspace home-workspace">
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
