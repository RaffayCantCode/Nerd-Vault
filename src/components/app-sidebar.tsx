import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarFolders } from "@/components/sidebar-folders";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { SidebarShell } from "@/components/sidebar-shell";
import { StoredFolder } from "@/lib/vault-types";

function IconHome() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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

function IconUser() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M6 19.5c.9-3.2 3.4-5 6-5s5.1 1.8 6 5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
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

function IconDoor() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M10 4h7v16h-7" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M7 8v8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <circle cx="14.5" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconLeave() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M9 4.75H6.75A1.75 1.75 0 0 0 5 6.5v11a1.75 1.75 0 0 0 1.75 1.75H9" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M13.25 8.25 18 12l-4.75 3.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.75 12H9.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

type AppSidebarProps = {
  active: "home" | "browse" | "profile";
  initialFolders?: StoredFolder[];
};

export async function AppSidebar({ active, initialFolders = [] }: AppSidebarProps) {
  const session = await auth();
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
            className={`sidebar-nav-button ${active === "home" ? "is-active" : ""}`}
            aria-label="Home"
            title="Home"
          >
            <IconHome />
            <span className="sidebar-nav-label">Home</span>
          </Link>
          <Link
            href="/profile"
            className={`sidebar-nav-button ${active === "profile" ? "is-active" : ""}`}
            aria-label="Profile"
            title="Profile"
          >
            <IconUser />
            <span className="sidebar-nav-label">Profile</span>
          </Link>
          <BrowseResetLink
            className={`sidebar-nav-button ${active === "browse" ? "is-active" : ""}`}
            aria-label="Browse catalog"
            title="Browse catalog"
          >
            <IconCompass />
            <span className="sidebar-nav-label">Browse</span>
          </BrowseResetLink>
        </nav>

        <div className="sidebar-rail-divider" />

        <div className="sidebar-rail-stack" aria-label="Folders">
          {shouldShowSignOut ? (
            <SidebarFolders initialFolders={initialFolders} />
          ) : (
            <Link
              href="/sign-in"
              className="sidebar-nav-button"
              aria-label="Sign in to save"
              title="Sign in to save"
            >
              <IconDoor />
              <span className="sidebar-nav-label">Sign in</span>
            </Link>
          )}
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
