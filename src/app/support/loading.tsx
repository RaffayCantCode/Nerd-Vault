import { NVLoader } from "@/components/nv-loader";

export default function SupportLoading() {
  return (
    <div className="page-shell">
      <main className="workspace">
        <section className="loading-centered">
          <NVLoader compact label="Opening support..." />
        </section>
      </main>
    </div>
  );
}
