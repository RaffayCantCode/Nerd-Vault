import { NVLoader } from "@/components/nv-loader";

export default function HomeLoading() {
  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <main className="workspace home-workspace">
          <section className="route-loading route-loading-full glass">
            <NVLoader label="Opening Home..." />
          </section>
        </main>
      </div>
    </div>
  );
}
