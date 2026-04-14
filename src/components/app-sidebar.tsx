import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarFolders } from "@/components/sidebar-folders";
import { BrowseResetLink } from "@/components/browse-reset-link";

type AppSidebarProps = {
  active: "browse" | "profile";
};

export async function AppSidebar({ active }: AppSidebarProps) {
  const session = await auth();
  const userName = session?.user?.name || null;
  const shouldShowSignOut = Boolean(userName);

  return (
    <aside className="sidebar sidebar-rail glass">
      <Link href="/" className="brand brand-rail" aria-label="NerdVault home" title="NerdVault">
        <BrandLogo className="brand-mark brand-mark-logo" />
      </Link>

      <nav className="sidebar-rail-nav" aria-label="Primary navigation">
        <Link
          href="/profile"
          className={`sidebar-nav-button ${active === "profile" ? "is-active" : ""}`}
          aria-label="Profile"
          title="Profile"
        >
          <strong className="sidebar-nav-glyph">P</strong>
          <span className="sidebar-nav-label">Profile</span>
        </Link>
        <BrowseResetLink
          className={`sidebar-nav-button ${active === "browse" ? "is-active" : ""}`}
          aria-label="Browse"
          title="Browse"
        >
          <strong className="sidebar-nav-glyph">B</strong>
          <span className="sidebar-nav-label">Browse</span>
        </BrowseResetLink>
      </nav>

      <div className="sidebar-rail-divider" />

      <div className="sidebar-rail-stack" aria-label="Folders">
        {shouldShowSignOut ? (
          <SidebarFolders />
        ) : (
          <Link
            href="/sign-in"
            className="sidebar-nav-button"
            aria-label="Sign in to save"
            title="Sign in to save"
          >
            <strong className="sidebar-nav-glyph">S</strong>
            <span className="sidebar-nav-label">Sign in</span>
          </Link>
        )}
      </div>

      {shouldShowSignOut ? (
        <form action={signOutUser} className="sidebar-signout-form">
          <button className="sidebar-nav-button sidebar-signout-button" type="submit" aria-label="Sign out" title="Sign out">
            <strong className="sidebar-nav-glyph">X</strong>
            <span className="sidebar-nav-label">Sign out</span>
          </button>
        </form>
      ) : null}
    </aside>
  );
}
