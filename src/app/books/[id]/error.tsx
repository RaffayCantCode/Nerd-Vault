"use client";

export default function BookDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Book page issue</p>
          <h1 className="headline">The book could not be loaded.</h1>
          <p className="copy">Try again or go back to the books page.</p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => reset()}>
              Retry
            </button>
            <button type="button" className="button button-secondary" onClick={() => (window.location.href = "/books")}>
              Back to books
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
