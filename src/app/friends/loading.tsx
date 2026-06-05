import { NVLoader } from "@/components/nv-loader";

export default function FriendsLoading() {
  return (
    <div className="page-shell">
      <main className="workspace">
        <section className="loading-centered">
          <NVLoader compact label="Loading friends..." />
        </section>
      </main>
    </div>
  );
}
