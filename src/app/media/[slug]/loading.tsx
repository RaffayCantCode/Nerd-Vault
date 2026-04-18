import { NVLoader } from "@/components/nv-loader";

export default function MediaLoading() {
  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <aside className="sidebar sidebar-rail glass media-loading-sidebar" aria-hidden="true" />
        <main className="workspace">
          <section className="detail-loading-shell glass">
            <NVLoader label="Loading details..." />
          </section>
        </main>
      </div>
    </div>
  );
}
