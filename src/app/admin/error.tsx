"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Admin issue</p>
          <h1 className="headline">The admin page could not be loaded.</h1>
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
