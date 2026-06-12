import { RouteLoader } from "@/components/route-loader";
import { BrandLogo } from "@/components/brand-logo";

export default function HomeLoading() {
  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <div className="sidebar-shell nv-sidebar-shell">
          <div className="sidebar sidebar-rail nv-sidebar-panel glass sidebar-skeleton" style={{ opacity: 0.35, pointerEvents: "none" }}>
            <div className="brand brand-rail">
              <BrandLogo className="brand-mark brand-mark-logo" />
            </div>
          </div>
        </div>
        <main className="workspace home-workspace">
          <RouteLoader label="Opening Home..." />
        </main>
      </div>
    </div>
  );
}

