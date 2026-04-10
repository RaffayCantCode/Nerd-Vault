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
      <div className="support-page-copy">
        <p className="eyebrow">Support</p>
        <h1 className="display support-title">Help Us Improve NerdVault</h1>
        <p className="copy support-lead">
          NerdVault is still in beta and is not yet an official final release. Some areas may feel rough, features can misbehave, and you may run into bugs while browsing.
        </p>
        <p className="copy">
          If something breaks, looks wrong, loads badly, or feels confusing, please report it to{" "}
          <a className="support-email" href="mailto:supportraffy@gmail.com">
            supportraffy@gmail.com
          </a>.
        </p>
        <p className="copy">
          When possible, include what page you were on, what you clicked, and what happened instead of what you expected. That helps track issues down much faster.
        </p>
        <p className="copy">
          Thank you for trying the website, being patient with the beta state, and enjoying what you can while we keep improving it.
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
        <AppSidebar active="browse" />
        <main className="workspace">
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          {content}
        </main>
      </div>
    </div>
  );
}
