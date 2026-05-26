"use client";

export default function SignInError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Sign-in issue</p>
          <h1 className="headline">There was a problem loading the sign-in page.</h1>
          <p className="copy">Try again or go back to browse.</p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => reset()}>
              Retry
            </button>
            <button type="button" className="button button-secondary" onClick={() => (window.location.href = "/browse")}>
              Back to browse
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
