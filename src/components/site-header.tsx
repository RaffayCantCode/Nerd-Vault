import Link from "next/link";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);
  const homeHref = isSignedIn ? "/browse" : "/";

  return (
    <header className="topbar container">
      <Link href={homeHref} className="brand">
        <span className="brand-mark">NV</span>
        <span className="brand-copy">
          <strong>NerdVault</strong>
          <span>{isSignedIn ? "Back to browsing your vault." : "Log what wrecked you. Save what calls next."}</span>
        </span>
      </Link>

      <nav className="nav">
        {isSignedIn ? (
          <>
            <Link href="/browse" className="nav-link">
              Back to browse
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
            <Link href="/browse" className="nav-link">
              Browse
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
