import { getAdminUsers, toggleUserRole } from "@/lib/vault-server";
import { revalidatePath } from "next/cache";

export default async function AdminUsers() {
  const users = await getAdminUsers().catch(() => []);

  async function toggleAdmin(userId: string) {
    "use server";
    await toggleUserRole(userId);
    revalidatePath("/admin/users");
  }

  return (
    <div className="admin-page">
      <div className="admin-page-shell">
        <header className="admin-hero">
          <p className="eyebrow">Admin users</p>
          <h1 className="headline">User Management</h1>
          <p className="copy">View and manage roles for all registered users.</p>
        </header>

        <div className="glass admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      {user.image ? (
                        <img src={user.image} alt={user.name ?? "User avatar"} className="admin-avatar" />
                      ) : (
                        <div className="admin-avatar-fallback">{user.name?.[0]}</div>
                      )}
                      {user.name}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`pill ${user.role === "ADMIN" ? "rating" : ""}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at ?? Date.now()).toLocaleDateString()}</td>
                  <td>
                    <form action={toggleAdmin.bind(null, user.id)}>
                      <button type="submit" className="button button-secondary">
                        Toggle Admin
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-action-row">
          <a href="/admin" className="button button-secondary">Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
