import Link from "next/link";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { auth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";

export async function SiteHeader() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <header className="topbar container">
      <Link href="/" className="brand">
        <BrandLogo className="brand-mark brand-mark-logo" priority />
        <span className="brand-copy">
          <strong>NerdVault</strong>
          <span>{isSignedIn ? "Back to browsing your vault." : "Log what wrecked you. Save what calls next."}</span>
        </span>
      </Link>

      <nav className="nav">
        {isSignedIn ? (
          <>
            <BrowseResetLink className="nav-link">
              Back to browse
            </BrowseResetLink>
            <Link href="/support" className="nav-link">
              Support
            </Link>
            <Link href="/profile" className="nav-link">
              Profile
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
            <Link href="/profile" className="nav-link">
              Profile
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
