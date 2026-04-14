import { NVLoader } from "@/components/nv-loader";

export default function BrowseLoading() {
  return (
    <div className="workspace">
      <section className="route-loading glass">
        <NVLoader label="Loading browse..." />
      </section>
    </div>
  );
}
