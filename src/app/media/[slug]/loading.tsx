import { RouteLoader } from "@/components/route-loader";

export default function MediaLoading() {
  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <aside className="sidebar sidebar-rail glass media-loading-sidebar" aria-hidden="true" />
        <main className="workspace">
          <RouteLoader label="Loading details..." />
        </main>
      </div>
    </div>
  );
}
