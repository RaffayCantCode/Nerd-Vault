import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const userCount = await prisma.user.count();
  const mediaCount = await prisma.media.count();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "global" },
  });

  return (
    <div className="admin-dashboard container" style={{ padding: '40px 20px', minHeight: '100vh', background: '#060911', color: 'white' }}>
      <header className="admin-header" style={{ marginBottom: 40 }}>
        <h1 className="display" style={{ fontSize: '3rem', marginBottom: 10 }}>Admin Panel</h1>
        <p className="copy">Manage your vault's content and users without touching code.</p>
      </header>

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="admin-card glass" style={{ padding: 30, borderRadius: 24 }}>
          <h2 className="headline" style={{ marginBottom: 15 }}>Site Content</h2>
          <p className="copy" style={{ marginBottom: 20 }}>Edit hero text and featured sections.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <p><strong>Hero Title:</strong> {settings?.heroTitle || "Default"}</p>
            <p><strong>Hero Subtitle:</strong> {settings?.heroSubtitle || "Default"}</p>
          </div>
          <Link href="/admin/settings" className="button button-primary" style={{ marginTop: 20, width: '100%' }}>
            Edit Settings
          </Link>
        </div>

        <div className="admin-card glass" style={{ padding: 30, borderRadius: 24 }}>
          <h2 className="headline" style={{ marginBottom: 15 }}>Media Library</h2>
          <p className="copy" style={{ marginBottom: 20 }}>Manage movies, TV shows, and games.</p>
          <p><strong>Total Media:</strong> {mediaCount}</p>
          <Link href="/admin/media" className="button button-secondary" style={{ marginTop: 20, width: '100%' }}>
            Manage Media
          </Link>
        </div>

        <div className="admin-card glass" style={{ padding: 30, borderRadius: 24 }}>
          <h2 className="headline" style={{ marginBottom: 15 }}>User Management</h2>
          <p className="copy" style={{ marginBottom: 20 }}>View and manage registered users.</p>
          <p><strong>Total Users:</strong> {userCount}</p>
          <Link href="/admin/users" className="button button-secondary" style={{ marginTop: 20, width: '100%' }}>
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
}
