import { NVLoader } from "@/components/nv-loader";

export default function ProfileLoading() {
  return (
    <div className="workspace">
      <section className="route-loading route-loading-full glass">
        <NVLoader label="Loading profile..." />
      </section>
    </div>
  );
}
