import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { getViewerShellData } from "@/lib/vault-server";

export default async function SupportPage() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const shellData = session?.user?.id ? await getViewerShellData(session.user.id) : null;

  const content = (
    <section className="support-page glass">
      <div className="support-page-copy">
        <p className="eyebrow">Support</p>
        <h1 className="display support-title">Support and Product Feedback</h1>
        <p className="copy support-lead">
          NerdVault is actively being improved. If something breaks, feels confusing, or does not look right on your device, please report it and include as much context as possible.
        </p>

        <div className="support-card-grid">
          <article className="support-card glass">
            <h2 className="headline support-card-title">How this site is built</h2>
            <p className="copy">
              NerdVault is built fully with Codex, with development workflow and iteration support inside Cursor. That includes UI implementation, refactors, bug fixes, and ongoing quality improvements.
            </p>
          </article>

          <article className="support-card glass">
            <h2 className="headline support-card-title">Contact</h2>
            <p className="copy">
              For support, bugs, or feedback, email{" "}
              <a className="support-email" href="mailto:asifraffy@gmail.com">
                asifraffy@gmail.com
              </a>.
            </p>
            <p className="copy">Replies are prioritized for reproducible bugs and account-impacting issues.</p>
          </article>
        </div>

        <article className="support-guidelines glass">
          <h2 className="headline support-card-title">What to include in a good report</h2>
          <ul className="support-list">
            <li>The exact page you were on and what you clicked.</li>
            <li>What you expected to happen vs what actually happened.</li>
            <li>Your device type (desktop/mobile) and browser.</li>
            <li>A screenshot or short screen recording if available.</li>
          </ul>
        </article>

        <p className="copy">
          Thanks for helping improve NerdVault. High-quality reports directly speed up fixes and stability improvements across the app.
        </p>
      </div>
    </section>
  );

  if (!isSignedIn) {
    return (
      <div className="page-shell">
        <SiteHeader />
        <main className="container landing-shell">
          {content}
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="browse" initialFolders={shellData?.folders ?? []} />
        <main className="workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData?.viewerProfile ?? null}
            initialFriends={shellData?.friends ?? []}
          />
          {content}
        </main>
      </div>
    </div>
  );
}
