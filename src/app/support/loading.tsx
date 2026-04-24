import { NVLoader } from "@/components/nv-loader";

export default function SupportLoading() {
  return (
    <div className="page-shell">
      <main className="workspace">
        <section className="support-page glass">
          <div className="support-page-copy">
            <NVLoader compact label="Opening support..." />
          </div>
        </section>
      </main>
    </div>
  );
}
