import { RouteLoader } from "@/components/route-loader";
import { BrandLogo } from "@/components/brand-logo";

export default function FriendsLoading() {
  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <div className="sidebar-shell nv-sidebar-shell">
          <div className="sidebar sidebar-rail nv-sidebar-panel glass sidebar-skeleton" style={{ opacity: 0.35, pointerEvents: "none" }}>
            <div className="brand brand-rail">
              <BrandLogo className="brand-mark brand-mark-logo" />
            </div>
          </div>
        </div>
        <main className="workspace">
          <RouteLoader label="Loading friends..." />
        </main>
      </div>
    </div>
  );
}

