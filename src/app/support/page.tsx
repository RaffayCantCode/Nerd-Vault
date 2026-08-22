import Link from "next/link";
import { Mail, Bug, Sparkles, ShieldCheck, CheckCircle2, Terminal, Clock, LifeBuoy, Zap } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { auth } from "@/lib/auth";
import { guestSignInHref } from "@/lib/guest";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await auth().catch(() => null);
  const isSignedIn = Boolean(session?.user?.id);
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  const content = (
    <section className="support-page">
      <div className="support-shell">
        <header className="support-hero glass">
          <p className="eyebrow">Direct Desk · Help &amp; Assistance</p>
          <h1 className="support-title">NerdVault Support Hub</h1>
          <p className="support-lead">
            The fastest path for reporting bugs, UX suggestions, and platform questions. Clear reports directly improve each release.
          </p>
          <div className="support-action-row">
            <a className="button button-primary" href="mailto:asifraffy@gmail.com?subject=NerdVault%20Support%20Request">
              <Mail size={16} />
              <span>Send support email</span>
            </a>
            <a className="button button-secondary" href="mailto:asifraffy@gmail.com?subject=NerdVault%20Bug%20Report">
              <Bug size={16} />
              <span>Report a bug</span>
            </a>
          </div>
        </header>

        <div className="support-badge-row">
          <span className="support-badge">
            <ShieldCheck size={14} style={{ color: "var(--accent)" }} />
            <span>Active Release Queue</span>
          </span>
          <span className="support-badge">
            <Zap size={14} style={{ color: "#f7ce55" }} />
            <span>Fast Turnaround</span>
          </span>
          <span className="support-badge">
            <Sparkles size={14} style={{ color: "#38bdf8" }} />
            <span>Cinema · TV · Anime · Games</span>
          </span>
          <span className="support-badge">
            <LifeBuoy size={14} style={{ color: "var(--accent)" }} />
            <span>24/7 Monitored</span>
          </span>
        </div>

        <section className="support-highlights">
          <article className="support-highlight-card glass">
            <p className="eyebrow">Priority lane</p>
            <h3 className="support-card-title">Critical issues first</h3>
            <p className="copy">Account sign-in failures, broken navigation links, and collection sync anomalies are addressed immediately.</p>
          </article>
          <article className="support-highlight-card glass">
            <p className="eyebrow">Best reports</p>
            <h3 className="support-card-title">Repro steps win</h3>
            <p className="copy">Providing the exact steps, error messages, and browser/device details significantly cuts turnaround time.</p>
          </article>
          <article className="support-highlight-card glass">
            <p className="eyebrow">Release model</p>
            <h3 className="support-card-title">Iterative shipping</h3>
            <p className="copy">Fixes and performance upgrades are delivered continuously so stability remains rock-solid.</p>
          </article>
        </section>

        <div className="support-main-grid">
          <article className="support-card glass">
            <h2 className="support-card-title">How NerdVault delivers updates</h2>
            <p className="copy">
              NerdVault operates in focused cadence: platform reliability and authentication stability first, followed by rich UX polish and discoverability features.
            </p>
            <p className="copy">
              Feedback from active vault users directly shapes upcoming catalog integrations, social features, and offline caching.
            </p>
          </article>

          <article className="support-card glass">
            <h2 className="support-card-title">Direct Contact</h2>
            <p className="copy">
              For account support or feature requests, reach out directly at{" "}
              <a className="support-email" href="mailto:asifraffy@gmail.com">
                asifraffy@gmail.com
              </a>.
            </p>
            <div className="support-template">
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Terminal size={13} /> Quick issue template
              </p>
              <pre>{`Page:
Device + Browser:
Steps:
Expected:
Actual:`}</pre>
            </div>
          </article>

          <article className="support-guidelines glass">
            <h2 className="support-card-title">What to include in a good report</h2>
            <ul className="support-list">
              <li>The exact page URL and action sequence that triggered the issue.</li>
              <li>What you expected to happen vs what actually occurred.</li>
              <li>Your device type, browser name, and operating system.</li>
              <li>Screenshot or short screen capture if visual or layout-related.</li>
            </ul>
          </article>

          <article className="support-guidelines glass">
            <h2 className="support-card-title">Response &amp; Resolution</h2>
            <ul className="support-list">
              <li>Critical bugs affecting core vault data are prioritized for same-day triage.</li>
              <li>Visual refinements and feature suggestions are scheduled into weekly updates.</li>
              <li>Detailed reports receive confirmation emails upon deployment.</li>
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
