import { RouteLoader } from "@/components/route-loader";

export default function MediaLoading() {
  return (
    <div className="page-shell">
      <div className="app-shell-layout media-loading-shell">
        <main className="workspace media-loading-workspace">
          <RouteLoader label="Loading details..." className="media-loading-route-loader" />
        </main>
      </div>
    </div>
  );
}
