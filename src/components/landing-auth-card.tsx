import Link from "next/link";

export function LandingAuthCard() {
  return (
    <div className="auth-card glass landing-auth-panel">
      <p className="eyebrow">Start here</p>
      <h2 className="headline">Use the site now, sync it properly next.</h2>
      <p className="copy">
        Browse works as a guest, your local library already saves in the browser, and the real account-backed version is ready to sit on top of this shell.
      </p>
      <div className="button-row" style={{ marginTop: 18 }}>
        <Link href="/sign-in" className="button button-primary">
          Sign in
        </Link>
        <Link href="/browse" className="button button-secondary">
          Enter browse
        </Link>
      </div>
    </div>
  );
}
