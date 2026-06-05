import { NVLoader } from "@/components/nv-loader";

export default function ActivityLoading() {
  return (
    <div className="page-shell">
      <main className="workspace">
        <section className="loading-centered">
          <NVLoader compact label="Loading activity..." />
        </section>
      </main>
    </div>
  );
}
