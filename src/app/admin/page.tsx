import Link from "next/link";
import { getAdminOverview } from "@/lib/vault-server";

export default async function AdminDashboard() {
  const { userCount, mediaCount, settings } = await getAdminOverview();

  return (
    <div className="admin-page">
      <div className="admin-page-shell">
        <header className="admin-hero">
          <p className="eyebrow">Admin</p>
          <h1 className="display">NerdVault Admin</h1>
          <p className="copy">Manage homepage messaging, media operations, and user visibility from one control surface.</p>
        </header>

        <div className="admin-grid">
          <section className="admin-card glass">
            <div className="admin-card-copy">
              <h2 className="headline">Brand Messaging</h2>
              <p className="copy">Control hero copy and primary brand voice on the landing experience.</p>
            </div>
            <div className="admin-stat-list">
              <p className="admin-stat"><strong>Hero Title</strong> <span>{settings?.hero_title || "Default"}</span></p>
              <p className="admin-stat"><strong>Hero Subtitle</strong> <span>{settings?.hero_subtitle || "Default"}</span></p>
            </div>
            <Link href="/admin/settings" className="button button-primary">
              Edit Settings
            </Link>
          </section>

          <section className="admin-card glass">
            <div className="admin-card-copy">
              <h2 className="headline">Media Operations</h2>
              <p className="copy">Monitor catalog health across movies, TV shows, anime, and games.</p>
            </div>
            <p className="admin-stat"><strong>Total Media</strong> <span>{mediaCount}</span></p>
          </section>

          <section className="admin-card glass">
            <div className="admin-card-copy">
              <h2 className="headline">User Management</h2>
              <p className="copy">Review registered users and keep account operations stable.</p>
            </div>
            <p className="admin-stat"><strong>Total Users</strong> <span>{userCount}</span></p>
            <Link href="/admin/users" className="button button-secondary">
              Manage Users
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
