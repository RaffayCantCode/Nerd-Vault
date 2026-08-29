import { NextResponse } from "next/server";

import { getAuthEnvDiagnostics, getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";
import { getD1Database, getRuntimeEnv } from "@/lib/cloudflare-env";
import { queryOne } from "@/lib/d1";

/**
 * Runtime auth & database connectivity check endpoint.
 */
export async function GET() {
  const env = getRuntimeEnv();
  const diagnostics = getAuthEnvDiagnostics();

  let dbMode = "local_sqlite_fallback";
  if (env.DB) {
    dbMode = "native_cloudflare_d1_binding";
  } else if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    dbMode = "remote_cloudflare_d1_http_api";
  }

  let dbTestResult: { ok: boolean; userCount?: number; error?: string } = { ok: false };
  try {
    const row = await queryOne<{ count: number }>("SELECT count(*) as count FROM users");
    dbTestResult = { ok: true, userCount: row?.count ?? 0 };
  } catch (err) {
    dbTestResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    status: dbTestResult.ok ? "healthy" : "degraded",
    database: {
      mode: dbMode,
      targetDatabaseId: "c7431d01-8a49-4655-8e8b-ea8ef044fd41",
      testQueryResult: dbTestResult,
    },
    auth: {
      hasSecret: Boolean(getAuthSecret()),
      googleConfigured: Boolean(getGoogleClientId() && getGoogleClientSecret()),
      hasAuthUrl: Boolean(env.AUTH_URL),
    },
  });
}

