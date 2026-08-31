import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type D1Config = {
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
};

let nativeD1Binding: any = null;
let schemaInitialized = false;

export async function ensureD1Schema(d1: any): Promise<void> {
  if (schemaInitialized || !d1) return;
  try {
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      `CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        original_title TEXT,
        overview TEXT,
        release_year INTEGER,
        runtime INTEGER,
        rating REAL,
        cover_url TEXT,
        backdrop_url TEXT,
        trailer_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source, source_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_vault_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Watching',
        user_rating REAL,
        notes TEXT,
        progress INTEGER DEFAULT 0,
        is_private INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, media_id)
      )`,
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        cover_url TEXT,
        visibility TEXT NOT NULL DEFAULT 'public',
        is_smart INTEGER DEFAULT 0,
        smart_rules TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS folder_items (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        media_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(folder_id, media_id)
      )`,
      `CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        friend_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACCEPTED',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )`,
      `CREATE TABLE IF NOT EXISTS media_reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_id TEXT NOT NULL,
        rating REAL,
        content TEXT,
        is_private INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS friend_recommendations (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        media_id TEXT NOT NULL,
        note TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data TEXT,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const stmt of tableStatements) {
      await d1.prepare(stmt).run().catch(() => {});
    }
    schemaInitialized = true;
  } catch (err) {
    console.warn("Auto D1 schema initialization notice:", err);
  }
}

export function setD1Binding(d1: any) {
  nativeD1Binding = d1;
  if (d1 && !schemaInitialized) {
    ensureD1Schema(d1);
  }
}

function getD1Config(): D1Config {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || "",
    apiToken: process.env.CLOUDFLARE_API_TOKEN || "",
  };
}

export type D1Response<T = Record<string, unknown>> = {
  result?: Array<{
    results?: T[];
    success?: boolean;
    meta?: Record<string, unknown>;
  }>;
  errors?: Array<{ message: string; code?: number }>;
  messages?: unknown[];
  success?: boolean;
};

/**
 * Execute a SQL query directly against Cloudflare D1 via native binding or REST API fallback.
 */
export async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  config: D1Config = getD1Config()
): Promise<T[]> {
  if (nativeD1Binding) {
    try {
      if (!schemaInitialized) {
        await ensureD1Schema(nativeD1Binding);
      }
      const stmt = nativeD1Binding.prepare(sql).bind(...params);
      const res = await stmt.all();
      return (res.results || []) as T[];
    } catch (err) {
      console.error("Native D1 Query error:", err, "SQL was:", sql);
      return [];
    }
  }

  const { accountId, databaseId, apiToken } = config;

  if (!accountId || !databaseId || !apiToken) {
    return [];
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`D1 API error (${res.status}): ${errText}`);
    }

    const payload = (await res.json()) as D1Response<T>;

    if (!payload.success || (payload.errors && payload.errors.length > 0)) {
      const msg = payload.errors?.map((e) => e.message).join("; ") || "D1 API Query Failed";
      throw new Error(msg);
    }

    return payload.result?.[0]?.results ?? [];
  } catch (error) {
    console.error("D1 Query execution error:", error, "SQL was:", sql);
    return [];
  }
}

/**
 * Execute raw batch statements against Cloudflare D1.
 */
export async function execD1(sql: string, config: D1Config = getD1Config()): Promise<void> {
  await queryD1(sql, [], config);
}

/**
 * Initialize Drizzle ORM sqlite-proxy adapter for Cloudflare D1
 */
export function createD1Drizzle(config: D1Config = getD1Config()) {
  return drizzle(async (sql, params, method) => {
    try {
      const rows = await queryD1<Record<string, unknown>>(sql, params, config);
      if (method === "get") {
        return { rows: rows[0] ? Object.values(rows[0]) : [] };
      }
      return { rows: rows.map((r) => Object.values(r)) };
    } catch (e: any) {
      console.error("Drizzle sqlite-proxy error:", e);
      return { rows: [] };
    }
  }, { schema });
}

export const db = createD1Drizzle();
