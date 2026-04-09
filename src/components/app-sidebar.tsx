import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutUser } from "@/app/sign-in/sign-out-action";
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
        <span className="brand-mark">NV</span>
      </Link>

      <nav className="sidebar-rail-nav" aria-label="Primary navigation">
        <Link
          href="/profile"
          className={`sidebar-nav-button ${active === "profile" ? "is-active" : ""}`}
          aria-label="Profile"
          title="Profile"
        >
          <span>Profile</span>
        </Link>
        <BrowseResetLink
          className={`sidebar-nav-button ${active === "browse" ? "is-active" : ""}`}
          aria-label="Browse"
          title="Browse"
        >
          <span>Browse</span>
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
            <span>Sign in</span>
          </Link>
        )}
      </div>

      {shouldShowSignOut ? (
        <form action={signOutUser}>
          <button className="sidebar-nav-button sidebar-signout-button" type="submit" aria-label="Sign out" title="Sign out">
            <span>Sign out</span>
          </button>
        </form>
      ) : null}
    </aside>
  );
}
