import { getD1Database } from "@/lib/cloudflare-env";

type Row = Record<string, unknown>;

const globalForD1 = globalThis as typeof globalThis & {
  __nerdvaultSchemaReady?: Promise<void>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? undefined : String(value);
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toBoolean(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function nowIso() {
  return new Date().toISOString();
}

export function uuid() {
  return globalThis.crypto.randomUUID();
}

async function getTableColumns(db: any, tableName: string) {
  const result = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const rows = (result.results ?? []) as Row[];
  return new Set(rows.map((row) => asString(row.name)).filter(Boolean) as string[]);
}

async function ensureUserColumns(db: any) {
  const columns = await getTableColumns(db, "users");
  const statements: string[] = [];
  const addColumn = (name: string, sqlType: string, defaultClause = "") => {
    if (!columns.has(name)) {
      statements.push(`ALTER TABLE users ADD COLUMN ${name} ${sqlType}${defaultClause}`);
    }
  };

  addColumn("bio", "TEXT");
  addColumn("password_hash", "TEXT");
  addColumn("role", "TEXT", " DEFAULT 'USER'");
  addColumn("has_seen_onboarding", "INTEGER", " DEFAULT 0");
  addColumn("watched_visibility", "TEXT", " DEFAULT 'public'");
  addColumn("wishlist_visibility", "TEXT", " DEFAULT 'friends'");
  addColumn("folders_default_visibility", "TEXT", " DEFAULT 'public'");
  addColumn("created_at", "TEXT", " DEFAULT CURRENT_TIMESTAMP");
  addColumn("updated_at", "TEXT", " DEFAULT CURRENT_TIMESTAMP");

  for (const statement of statements) {
    await db.exec(statement);
  }
}

async function ensureAppSchema(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      emailVerified TEXT,
      image TEXT,
      bio TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'USER',
      has_seen_onboarding INTEGER DEFAULT 0,
      watched_visibility TEXT DEFAULT 'public',
      wishlist_visibility TEXT DEFAULT 'friends',
      folders_default_visibility TEXT DEFAULT 'public',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, providerAccountId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      sessionToken TEXT UNIQUE NOT NULL,
      userId TEXT NOT NULL,
      expires TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TEXT NOT NULL,
      PRIMARY KEY (identifier, token)
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      hero_title TEXT,
      hero_subtitle TEXT,
      featured_media_id TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      original_title TEXT,
      overview TEXT,
      type TEXT NOT NULL,
      status TEXT,
      release_year INTEGER,
      runtime INTEGER,
      rating REAL,
      cover_url TEXT,
      backdrop_url TEXT,
      trailer_url TEXT,
      language TEXT DEFAULT 'en',
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, source_id)
    );

    CREATE TABLE IF NOT EXISTS genres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS media_genres (
      media_id TEXT NOT NULL,
      genre_id TEXT NOT NULL,
      PRIMARY KEY (media_id, genre_id),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watched_items (
      user_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      rating INTEGER,
      notes TEXT,
      PRIMARY KEY (user_id, media_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      user_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      priority INTEGER,
      PRIMARY KEY (user_id, media_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slug),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folder_items (
      folder_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (folder_id, media_id),
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friendships (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      from_user_id TEXT,
      media_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
    CREATE INDEX IF NOT EXISTS idx_media_source ON media(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_media_slug ON media(slug);
    CREATE INDEX IF NOT EXISTS idx_watched_items_user ON watched_items(user_id, watched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_watched_items_media ON watched_items(media_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON folder_items(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folder_items_media ON folder_items(media_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  await ensureUserColumns(db);
}

let isSchemaReady = false;

export async function ensureDatabaseReady() {
  if (isSchemaReady) return;
  if (!globalForD1.__nerdvaultSchemaReady) {
    globalForD1.__nerdvaultSchemaReady = (async () => {
      try {
        const db = (await getD1Database()) as any;
        if (!db) return;

        // Check if users table and password_hash column already exist
        try {
          await db.prepare("SELECT password_hash FROM users LIMIT 1").all();
          isSchemaReady = true;
          return;
        } catch {
          // Table or column is missing, run full schema initialization
        }

        await ensureAppSchema(db);
        isSchemaReady = true;
      } catch (error) {
        console.warn("[d1] Database schema check notice:", error);
      }
    })();
  }

  await globalForD1.__nerdvaultSchemaReady;
  isSchemaReady = true;
}

export async function queryAll<T = Row>(sql: string, binds: unknown[] = []) {
  try {
    await ensureDatabaseReady();
    const db = (await getD1Database()) as any;
    const result = await db.prepare(sql).bind(...binds).all();
    return (result.results ?? []) as T[];
  } catch (error) {
    console.error("[d1] queryAll error:", error);
    return [] as T[];
  }
}

export async function queryOne<T = Row>(sql: string, binds: unknown[] = []) {
  try {
    await ensureDatabaseReady();
    const db = (await getD1Database()) as any;
    const result = await db.prepare(sql).bind(...binds).first();
    return (result ?? null) as T | null;
  } catch (error) {
    console.error("[d1] queryOne error:", error);
    return null as T | null;
  }
}

export async function execute(sql: string, binds: unknown[] = []) {
  try {
    await ensureDatabaseReady();
    const db = (await getD1Database()) as any;
    return await db.prepare(sql).bind(...binds).run();
  } catch (error) {
    console.error("[d1] execute error:", error);
    return { results: [], success: false, meta: {}, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function exec(sql: string) {
  try {
    await ensureDatabaseReady();
    const db = (await getD1Database()) as any;
    return await db.exec(sql);
  } catch (error) {
    console.error("[d1] exec error:", error);
    return { count: 0, duration: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export { asNumber, asString };
