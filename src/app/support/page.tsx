import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { auth } from "@/lib/auth";
import { guestSignInHref } from "@/lib/guest";

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
          <div className="support-action-row">
            <a className="button button-primary" href="mailto:asifraffy@gmail.com?subject=NerdVault%20Support%20Request">
              Send support email
            </a>
            <a className="button button-secondary" href="mailto:asifraffy@gmail.com?subject=NerdVault%20Bug%20Report">
              Report a bug
            </a>
          </div>
        </header>

        <div className="support-badge-row">
          <span className="support-badge">Brand system live</span>
          <span className="support-badge">Universe discovery updates</span>
          <span className="support-badge">Solo developer: Raffay</span>
          <span className="support-badge">Active support queue</span>
        </div>

        <section className="support-highlights">
          <article className="support-highlight-card glass">
            <p className="eyebrow">Fast lane</p>
            <h3 className="headline support-card-title">Critical issues first</h3>
            <p className="copy">Auth failures, broken navigation, and data-loss bugs are reviewed first.</p>
          </article>
          <article className="support-highlight-card glass">
            <p className="eyebrow">Best reports</p>
            <h3 className="headline support-card-title">Repro steps win</h3>
            <p className="copy">Clear steps and screenshots significantly reduce fix time.</p>
          </article>
          <article className="support-highlight-card glass">
            <p className="eyebrow">Build model</p>
            <h3 className="headline support-card-title">Iterative shipping</h3>
            <p className="copy">Fixes are shipped in focused passes so quality stays high and regressions stay low.</p>
          </article>
        </section>

        <div className="support-main-grid">
          <article className="support-card glass">
            <h2 className="headline support-card-title">How NerdVault ships updates</h2>
            <p className="copy">
              NerdVault ships in focused passes: reliability first, then UX polish, then discoverability upgrades across movies, shows, anime, and games.
            </p>
            <p className="copy">
              The project is maintained by one developer, so clear reproducible reports significantly improve turnaround speed.
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
            <div className="support-template">
              <p className="eyebrow">Quick template</p>
              <pre>{`Page:
Device + Browser:
Steps:
Expected:
Actual:`}</pre>
            </div>
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

  return (
    <div className="page-shell support-page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="vault" />
        <main className="workspace support-workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={null}
            initialFriends={[]}
          />
          {!isSignedIn ? (
            <div className="guest-support-banner glass">
              <p className="copy">Browsing as a guest. Sign in to sync vault data and get faster support follow-up.</p>
              <Link href={guestSignInHref("/support")} className="button button-primary">
                Sign in
              </Link>
            </div>
          ) : null}
          {content}
        </main>
      </div>
    </div>
  );
}
