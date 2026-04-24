import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export default async function SupportPage() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  const content = (
    <section className="support-page glass">
      <div className="support-shell">
        <header className="support-hero">
          <p className="eyebrow">Support</p>
          <h1 className="display support-title">NerdVault Support Center</h1>
          <p className="copy support-lead">
            This page is the fastest path for reporting bugs, UX issues, and reliability problems. Clear reports directly improve release quality.
          </p>
        </header>

        <div className="support-badge-row">
          <span className="support-badge">Built with Codex</span>
          <span className="support-badge">Developed in Cursor</span>
          <span className="support-badge">Solo developer: Raffay</span>
          <span className="support-badge">Active beta</span>
        </div>

        <div className="support-main-grid">
          <article className="support-card glass">
            <h2 className="headline support-card-title">How NerdVault is built</h2>
            <p className="copy">
              NerdVault is developed fully with Codex, with workflow, iteration, and debugging support from Cursor. Core page architecture, UI changes, and bug-fix cycles are all handled through that build process.
            </p>
            <p className="copy">
              The project is maintained by one developer, Raffay, so feedback quality and reproducible reports make a huge difference in turnaround speed.
            </p>
          </article>

          <article className="support-card glass">
            <h2 className="headline support-card-title">Contact</h2>
            <p className="copy">
              For support requests or feedback, email{" "}
              <a className="support-email" href="mailto:asifraffy@gmail.com">
                asifraffy@gmail.com
              </a>.
            </p>
            <p className="copy">Reports with steps to reproduce and device/browser details are prioritized first.</p>
          </article>

          <article className="support-guidelines glass">
            <h2 className="headline support-card-title">What to include in a good report</h2>
            <ul className="support-list">
              <li>The exact page and action sequence that triggered the issue.</li>
              <li>Expected result vs actual result.</li>
              <li>Device type and browser version.</li>
              <li>Screenshot or short recording if possible.</li>
            </ul>
          </article>

          <article className="support-guidelines glass">
            <h2 className="headline support-card-title">Response expectations</h2>
            <ul className="support-list">
              <li>Critical breakage issues are reviewed first.</li>
              <li>UI polish requests are grouped into scheduled refinement passes.</li>
              <li>Feedback quality affects turnaround speed.</li>
            </ul>
          </article>
        </div>
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
        <AppSidebar active="browse" initialFolders={[]} />
        <main className="workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={null}
            initialFriends={[]}
          />
          {content}
        </main>
      </div>
    </div>
  );
}
