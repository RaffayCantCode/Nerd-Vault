import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="topbar container">
      <Link href="/" className="brand">
        <span className="brand-mark">NV</span>
        <span className="brand-copy">
          <strong>NerdVault</strong>
          <span>Log what wrecked you. Save what calls next.</span>
        </span>
      </Link>

      <nav className="nav">
        <Link href="/browse" className="nav-link">
          Browse
        </Link>
        <Link href="/profile" className="nav-link">
          Profile
        </Link>
        <Link href="/sign-in" className="nav-link">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
