import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  async function toggleAdmin(userId: string, currentRole: string) {
    "use server";
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });
    revalidatePath("/admin/users");
  }

  return (
    <div className="admin-users container" style={{ padding: '40px 20px' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 className="headline">User Management</h1>
        <p className="copy">View and manage roles for all registered users.</p>
      </header>

      <div className="glass" style={{ borderRadius: 24, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px' }}>User</th>
              <th style={{ padding: '20px' }}>Email</th>
              <th style={{ padding: '20px' }}>Role</th>
              <th style={{ padding: '20px' }}>Joined</th>
              <th style={{ padding: '20px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {user.image ? <img src={user.image} style={{ width: 32, height: 32, borderRadius: '50%' }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#03fcbe', color: '#000', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>{user.name?.[0]}</div>}
                    {user.name}
                  </div>
                </td>
                <td style={{ padding: '20px', color: 'rgba(255,255,255,0.6)' }}>{user.email}</td>
                <td style={{ padding: '20px' }}>
                  <span className={`pill ${user.role === 'ADMIN' ? 'rating' : ''}`} style={{ fontSize: '0.7rem' }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '20px', color: 'rgba(255,255,255,0.6)' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '20px' }}>
                  <form action={toggleAdmin.bind(null, user.id, user.role)}>
                    <button type="submit" className="button button-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      Toggle Admin
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: 20 }}>
        <a href="/admin" className="button button-secondary">Back to Dashboard</a>
      </div>
    </div>
  );
}
