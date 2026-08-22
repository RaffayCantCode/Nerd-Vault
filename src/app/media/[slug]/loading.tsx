import { RouteLoader } from "@/components/route-loader";
import { BrandLogo } from "@/components/brand-logo";

export default function MediaLoading() {
  return (
    <div className="page-shell">
      <div className="app-shell-layout media-loading-shell">
        <div className="sidebar-shell nv-sidebar-shell">
          <div className="sidebar sidebar-rail nv-sidebar-panel glass sidebar-skeleton" style={{ opacity: 0.35, pointerEvents: "none" }}>
            <div className="brand brand-rail">
              <BrandLogo className="brand-mark brand-mark-logo" />
            </div>
          </div>
        </div>
        <main className="workspace media-loading-workspace">
          <RouteLoader label="Loading page..." type="media" className="media-loading-route-loader" />
        </main>
      </div>
    </div>
  );
}

