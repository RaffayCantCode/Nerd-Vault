import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "@auth/core/adapters";
import { queryOne, execute, uuid } from "@/lib/d1";

export function createNerdVaultAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const id = uuid();
      await execute(
        `INSERT INTO users (
          id, name, email, emailVerified, image, role, has_seen_onboarding,
          watched_visibility, wishlist_visibility, folders_default_visibility,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'USER', 0, 'public', 'friends', 'public', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          id,
          user.name ?? null,
          user.email,
          user.emailVerified ? new Date(user.emailVerified).toISOString() : null,
          user.image ?? null,
        ],
      );
      const created = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ?`,
        [id],
      );
      if (!created) throw new Error("Failed to create user");
      return {
        ...created,
        emailVerified: created.emailVerified ? new Date(created.emailVerified) : null,
      };
    },

    async getUser(id: string) {
      const user = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ?`,
        [id],
      );
      if (!user) return null;
      return {
        ...user,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async getUserByEmail(email: string) {
      const user = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
        [email],
      );
      if (!user) return null;
      return {
        ...user,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const user = await queryOne<AdapterUser>(
        `SELECT u.id, u.name, u.email, u.emailVerified, u.image
         FROM users u
         JOIN accounts a ON a.userId = u.id
         WHERE a.provider = ? AND a.providerAccountId = ?
         LIMIT 1`,
        [provider, providerAccountId],
      );
      if (!user) return null;
      return {
        ...user,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async updateUser(user: Partial<AdapterUser> & { id: string }) {
      const existing = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ?`,
        [user.id],
      );
      if (!existing) throw new Error("User not found");
      const name = user.name !== undefined ? user.name : existing.name;
      const email = user.email !== undefined ? user.email : existing.email;
      const image = user.image !== undefined ? user.image : existing.image;
      const emailVerified =
        user.emailVerified !== undefined
          ? user.emailVerified
            ? new Date(user.emailVerified).toISOString()
            : null
          : existing.emailVerified;

      await execute(
        `UPDATE users SET name = ?, email = ?, emailVerified = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, email, emailVerified, image, user.id],
      );

      const updated = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ?`,
        [user.id],
      );
      if (!updated) throw new Error("User update failed");
      return {
        ...updated,
        emailVerified: updated.emailVerified ? new Date(updated.emailVerified) : null,
      };
    },

    async deleteUser(userId: string) {
      await execute(`DELETE FROM accounts WHERE userId = ?`, [userId]);
      await execute(`DELETE FROM sessions WHERE userId = ?`, [userId]);
      await execute(`DELETE FROM users WHERE id = ?`, [userId]);
      return null;
    },

    async linkAccount(account: AdapterAccount) {
      const id = uuid();
      await execute(
        `INSERT INTO accounts (
          id, userId, type, provider, providerAccountId, refresh_token, access_token,
          expires_at, token_type, scope, id_token, session_state, oauth_token, oauth_token_secret
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
          (account as any).oauth_token ?? null,
          (account as any).oauth_token_secret ?? null,
        ],
      );
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      await execute(`DELETE FROM accounts WHERE provider = ? AND providerAccountId = ?`, [provider, providerAccountId]);
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
      const id = uuid();
      await execute(
        `INSERT INTO sessions (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)`,
        [id, session.sessionToken, session.userId, session.expires.toISOString()],
      );
      return session;
    },

    async getSessionAndUser(sessionToken: string) {
      const session = await queryOne<{ id: string; sessionToken: string; userId: string; expires: string }>(
        `SELECT id, sessionToken, userId, expires FROM sessions WHERE sessionToken = ?`,
        [sessionToken],
      );
      if (!session) return null;
      const user = await queryOne<AdapterUser>(
        `SELECT id, name, email, emailVerified, image FROM users WHERE id = ?`,
        [session.userId],
      );
      if (!user) return null;
      return {
        session: {
          ...session,
          expires: new Date(session.expires),
        },
        user: {
          ...user,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        },
      };
    },

    async updateSession(session: Partial<AdapterSession> & { sessionToken: string }) {
      if (session.expires) {
        await execute(`UPDATE sessions SET expires = ? WHERE sessionToken = ?`, [
          session.expires.toISOString(),
          session.sessionToken,
        ]);
      }
      const updated = await queryOne<{ id: string; sessionToken: string; userId: string; expires: string }>(
        `SELECT id, sessionToken, userId, expires FROM sessions WHERE sessionToken = ?`,
        [session.sessionToken],
      );
      if (!updated) return null;
      return {
        ...updated,
        expires: new Date(updated.expires),
      };
    },

    async deleteSession(sessionToken: string) {
      await execute(`DELETE FROM sessions WHERE sessionToken = ?`, [sessionToken]);
      return null;
    },

    async createVerificationToken(token: VerificationToken) {
      await execute(
        `INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)`,
        [token.identifier, token.token, token.expires.toISOString()],
      );
      return token;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const row = await queryOne<{ identifier: string; token: string; expires: string }>(
        `SELECT identifier, token, expires FROM verification_tokens WHERE identifier = ? AND token = ?`,
        [identifier, token],
      );
      if (!row) return null;
      await execute(`DELETE FROM verification_tokens WHERE identifier = ? AND token = ?`, [identifier, token]);
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      };
    },
  };
}
