import { NVLoader } from "@/components/nv-loader";

export default function MediaLoading() {
  return (
    <div className="workspace">
      <section className="detail-loading-shell glass">
        <NVLoader label="Loading details..." />
      </section>
    </div>
  );
}
