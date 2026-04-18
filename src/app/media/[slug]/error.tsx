"use client";

import { useRouter } from "next/navigation";

export default function MediaDetailError({
  reset,
}: {
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="page-shell">
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Media load issue</p>
          <h1 className="headline">This page hit a server issue while loading the media details.</h1>
          <p className="copy">
            Try the detail request again, or go straight back to browse without losing the rest of your session.
          </p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => reset()}>
              Retry this page
            </button>
            <button type="button" className="button button-secondary" onClick={() => router.push("/browse")}>
              Back to browse
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
