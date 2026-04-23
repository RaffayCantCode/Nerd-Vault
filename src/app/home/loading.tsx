import { RouteLoader } from "@/components/route-loader";

export default function HomeLoading() {
  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <main className="workspace home-workspace">
          <RouteLoader label="Opening Home..." />
        </main>
      </div>
    </div>
  );
}
