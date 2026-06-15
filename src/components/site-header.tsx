import Link from "next/link";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";

export async function SiteHeader() {
  const session = await auth().catch((error) => {
    console.error("Auth session failed to load in site header:", error);
    return null;
  });
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <header className="topbar container">
      <Link href="/" className="brand">
        <BrandLogo className="brand-mark brand-mark-logo" priority />
        <span className="brand-copy">
          <strong>NerdVault</strong>
          <span>{isSignedIn ? "Pick up where you left off." : "Log what hit. Queue what calls next."}</span>
        </span>
      </Link>

      <input type="checkbox" id="nav-toggle" className="nav-toggle-checkbox" style={{ display: 'none' }} />
      <label htmlFor="nav-toggle" className="nav-toggle-label">
        <svg className="icon-menu" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
        <svg className="icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
      </label>

      <nav className="nav">
        {isSignedIn ? (
          <>
            <BrowseResetLink className="nav-link">
              Back to browse
            </BrowseResetLink>
            <Link href="/support" className="nav-link">
              Support
            </Link>
            <Link href="/home?tab=media" className="nav-link">
              Vault
            </Link>
            <form action={signOutUser}>
              <button type="submit" className="nav-link nav-link-button">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <BrowseResetLink className="nav-link">
              Browse
            </BrowseResetLink>
            <Link href="/support" className="nav-link">
              Support
            </Link>
            <Link href="/home?tab=media" className="nav-link">
              Vault
            </Link>
            <Link href="/sign-in" className="nav-link">
              Sign in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

