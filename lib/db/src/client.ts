import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type D1Config = {
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
};

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
 * Execute a SQL query directly against Cloudflare D1 via the Cloudflare REST API.
 */
export async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  config: D1Config = getD1Config()
): Promise<T[]> {
  const { accountId, databaseId, apiToken } = config;

  if (!accountId || !databaseId || !apiToken) {
    console.warn("Cloudflare D1 credentials missing. Using local empty query result.");
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
    throw error;
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
        return { rows: rows[0] ? Object.values(rows[0]) : undefined };
      }
      return { rows: rows.map((r) => Object.values(r)) };
    } catch (e: any) {
      console.error("Drizzle sqlite-proxy error:", e);
      return { rows: [] };
    }
  }, { schema });
}

export const db = createD1Drizzle();
