"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="headline">The page could not be loaded right now.</h1>
          <p className="copy">
            There was a server or data error. You can retry the page or head back to browse.
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => reset()}>
              Retry this page
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
