import Link from "next/link";

export function LandingAuthCard() {
  return (
    <div className="auth-card glass landing-auth-panel">
      <p className="eyebrow">Pick your route</p>
      <h2 className="headline">Browse the vault now, then claim your own corner of it.</h2>
      <p className="copy">
        Guest mode lets you explore the catalog fast. Signing in turns that same space into a persistent personal vault with profile identity, folders, friends, inbox, and saved media history.
      </p>
      <div className="button-row" style={{ marginTop: 18 }}>
        <Link href="/sign-in" className="button button-primary">
          Start your vault
        </Link>
        <Link href="/browse" className="button button-secondary">
          Explore as guest
        </Link>
      </div>
    </div>
  );
}
