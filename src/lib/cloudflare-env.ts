import { getRequestContext } from "@cloudflare/next-on-pages";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type D1QueryResult<T = unknown> = {
  results?: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
  error?: string;
};

export type D1PreparedStatement = {
  all: <T = Record<string, unknown>>() => Promise<D1QueryResult<T>>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<D1QueryResult>;
  bind: (...binds: unknown[]) => D1PreparedStatement;
};

export type D1DatabaseLike = {
  prepare: (sql: string) => D1PreparedStatement;
  exec: (sql: string) => Promise<unknown>;
  batch?: (statements: D1PreparedStatement[]) => Promise<unknown[]>;
};

type CloudflareBindingBag = {
  DB?: D1DatabaseLike;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_D1_DATABASE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  AUTH_SECRET?: string;
  AUTH_URL?: string;
  AUTH_TRUST_HOST?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TMDB_API_KEY?: string;
  RAWG_API_KEY?: string;
  IGDB_CLIENT_ID?: string;
  IGDB_CLIENT_SECRET?: string;
  TWITCH_APP_ACCESS_TOKEN?: string;
  MAIL_FROM?: string;
} & Record<string, unknown>;

let localDatabaseBundle: { db: D1DatabaseLike } | null = null;
let d1HttpClient: D1DatabaseLike | null = null;

function readCloudflareBindings(): CloudflareBindingBag {
  try {
    const context = getRequestContext();
    return (context?.env ?? {}) as CloudflareBindingBag;
  } catch {
    return (process.env as unknown as CloudflareBindingBag) ?? {};
  }
}

export function getRuntimeEnv() {
  return readCloudflareBindings();
}

/**
 * Cloudflare D1 HTTP REST API Client
 * Allows querying Cloudflare D1 remotely over HTTPS from Node.js, local development, or scripts.
 */
function createD1HttpClient(accountId: string, databaseId: string, apiToken: string): D1DatabaseLike {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function executeRemoteSql(sql: string, params: unknown[] = []) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare D1 HTTP API error (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as {
      result?: Array<{
        results?: unknown[];
        success?: boolean;
        meta?: Record<string, unknown>;
      }>;
      errors?: Array<{ message: string }>;
      success?: boolean;
    };

    if (!payload.success || (payload.errors && payload.errors.length > 0)) {
      const msg = payload.errors?.map((e) => e.message).join("; ") || "D1 API Query Failed";
      throw new Error(msg);
    }

    const firstResult = payload.result?.[0];
    return {
      results: firstResult?.results ?? [],
      success: firstResult?.success ?? true,
      meta: firstResult?.meta,
    };
  }

  return {
    prepare(sql: string) {
      let boundParams: unknown[] = [];
      const statement: D1PreparedStatement = {
        bind(...binds: unknown[]) {
          boundParams = binds;
          return statement;
        },
        async all<T = Record<string, unknown>>() {
          const res = await executeRemoteSql(sql, boundParams);
          return { results: res.results as T[], success: res.success, meta: res.meta };
        },
        async first<T = Record<string, unknown>>() {
          const res = await executeRemoteSql(sql, boundParams);
          const list = res.results as T[];
          return list.length > 0 ? list[0] : null;
        },
        async run() {
          const res = await executeRemoteSql(sql, boundParams);
          return { results: res.results, success: res.success, meta: res.meta };
        },
      };
      return statement;
    },
    async exec(sql: string) {
      // Split multi-statement scripts if needed
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await executeRemoteSql(statement);
      }
      return { count: statements.length, duration: 0 };
    },
  };
}

async function getLocalSqliteDatabase(): Promise<D1DatabaseLike> {
  if (!localDatabaseBundle) {
    const { DatabaseSync } = await import("node:sqlite");
    const rootDir = join(process.cwd(), ".data");
    if (!existsSync(rootDir)) {
      mkdirSync(rootDir, { recursive: true });
    }

    const path = join(rootDir, "nerdvault-dev.sqlite");
    const database = new DatabaseSync(path);

    localDatabaseBundle = {
      db: {
        async exec(sql: string) {
          database.exec(sql);
          return { count: 1, duration: 0 };
        },
        prepare(sql: string) {
          const statement = database.prepare(sql);
          let boundParams: unknown[] = [];

          const wrap = () => ({
            bind(...binds: unknown[]) {
              boundParams = binds;
              return wrap();
            },
            async all<T = Record<string, unknown>>() {
              return { results: statement.all(...(boundParams as never[])) as T[] };
            },
            async first<T = Record<string, unknown>>() {
              const res = statement.get(...(boundParams as never[]));
              return (res ?? null) as T | null;
            },
            async run() {
              const res = statement.run(...(boundParams as never[]));
              return { results: [], success: true, meta: res as unknown as Record<string, unknown> };
            },
          });

          return wrap();
        },
      },
    };
  }

  return localDatabaseBundle.db;
}

/**
 * Returns the active Cloudflare D1 database:
 * 1. Native Cloudflare Edge binding (`env.DB`) in production / Pages.
 * 2. Remote Cloudflare D1 HTTP client if Cloudflare credentials are configured.
 * 3. Local SQLite database for offline dev.
 */
export async function getD1Database(): Promise<D1DatabaseLike> {
  const env = getRuntimeEnv();

  // 1. Native Cloudflare Pages / Worker D1 Binding
  if (env.DB) {
    return env.DB;
  }

  // 2. Cloudflare D1 Remote HTTP REST API
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID) as string | undefined;
  const databaseId = (process.env.CLOUDFLARE_D1_DATABASE_ID || env.CLOUDFLARE_D1_DATABASE_ID) as string | undefined;
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN) as string | undefined;

  if (accountId && databaseId && apiToken) {
    if (!d1HttpClient) {
      d1HttpClient = createD1HttpClient(accountId, databaseId, apiToken);
    }
    return d1HttpClient;
  }

  // 3. Local SQLite fallback for offline development
  if (process.env.NODE_ENV !== "production") {
    return getLocalSqliteDatabase();
  }

  throw new Error(
    "Cloudflare D1 binding 'DB' is missing. Please bind your D1 database in the Cloudflare Pages dashboard or provide CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN.",
  );
}
