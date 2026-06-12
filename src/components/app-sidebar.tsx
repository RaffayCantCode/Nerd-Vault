import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { SidebarShell } from "@/components/sidebar-shell";

function IconHome() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M9.5 20.5v-7h5v7" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconLanding() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M8.5 20.5v-5.75h7v5.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="m13.2 10.8 3.3-6-6 3.3-3.3 6 6-3.3Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 4.5h14v15H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 4.5v6.2l2.5-1.6L14 10.7V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h4l3 8 4-16 3 8h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="17" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.65" />
      <path d="M3 19.5c0-3.5 2.5-6 6-6s6 2.5 6 6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M15 18c0-2.5 2-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 4h7v16h-7" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M7 8v8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <circle cx="14.5" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconLeave() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4.75H6.75A1.75 1.75 0 0 0 5 6.5v11a1.75 1.75 0 0 0 1.75 1.75H9" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M13.25 8.25 18 12l-4.75 3.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.75 12H9.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

type AppSidebarProps = {
  active: "vault" | "browse" | "books" | "activity" | "friends";
  redirectTo?: string;
};

export async function AppSidebar({ active, redirectTo = "/home" }: AppSidebarProps) {
  const session = await auth().catch((error) => {
    console.error("Auth session failed to load in app sidebar:", error);
    return null;
  });
  const userName = session?.user?.name || null;
  const shouldShowSignOut = Boolean(userName);

  return (
    <SidebarShell>
      <aside className="sidebar sidebar-rail nv-sidebar-panel glass">
        <Link href="/" className="brand brand-rail" aria-label="NerdVault home" title="NerdVault">
          <BrandLogo className="brand-mark brand-mark-logo" />
        </Link>

        <nav className="sidebar-rail-nav" aria-label="Primary navigation">
          <Link href="/" className="sidebar-nav-button" aria-label="Landing page" title="Landing page">
            <IconLanding />
            <span className="sidebar-nav-label">Landing</span>
          </Link>
          <Link
            href="/home"
            className={`sidebar-nav-button ${active === "vault" ? "is-active" : ""}`}
            aria-label="Vault"
            title="Vault"
          >
            <IconHome />
            <span className="sidebar-nav-label">Vault</span>
          </Link>
          <BrowseResetLink
            className={`sidebar-nav-button ${active === "browse" ? "is-active" : ""}`}
            aria-label="Browse catalog"
            title="Browse catalog"
          >
            <IconCompass />
            <span className="sidebar-nav-label">Browse</span>
          </BrowseResetLink>
          <Link
            href="/books"
            className={`sidebar-nav-button ${active === "books" ? "is-active" : ""}`}
            aria-label="Books"
            title="Books"
          >
            <IconBook />
            <span className="sidebar-nav-label">Books</span>
          </Link>
          <Link
            href="/activity"
            className={`sidebar-nav-button ${active === "activity" ? "is-active" : ""}`}
            aria-label="Friend Activity"
            title="Friend Activity"
          >
            <IconActivity />
            <span className="sidebar-nav-label">Activity</span>
          </Link>
          <Link
            href="/friends"
            className={`sidebar-nav-button ${active === "friends" ? "is-active" : ""}`}
            aria-label="Friends"
            title="Friends"
          >
            <IconPeople />
            <span className="sidebar-nav-label">Friends</span>
          </Link>

        </nav>

        <div className="sidebar-rail-divider" />

        <div className="sidebar-rail-stack" aria-label="Sign in">
          {!shouldShowSignOut ? (
            <Link
              href={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="sidebar-nav-button"
              aria-label="Sign in to save"
              title="Sign in to save"
              style={{ cursor: 'pointer', zIndex: 10 }}
            >
              <IconDoor />
              <span className="sidebar-nav-label">Sign in</span>
            </Link>
          ) : null}
        </div>

        {shouldShowSignOut ? (
          <form action={signOutUser} className="sidebar-signout-form">
            <button className="sidebar-nav-button sidebar-signout-button" type="submit" aria-label="Sign out" title="Sign out">
              <IconLeave />
              <span className="sidebar-nav-label">Sign out</span>
            </button>
          </form>
        ) : null}
      </aside>
    </SidebarShell>
  );
}
