import { NextResponse } from "next/server";

import { getAuthEnvDiagnostics } from "@/lib/auth-env";
import { getRuntimeEnv } from "@/lib/cloudflare-env";

/**
 * Runtime auth env check - only when AUTH_DEBUG=true.
 * Visit /api/auth/diag after deploy to verify Cloudflare secrets and bindings.
 */
export async function GET() {
  if (process.env.AUTH_DEBUG !== "true") {
    return NextResponse.json({ ok: false, message: "Set AUTH_DEBUG=true to use this endpoint." }, { status: 404 });
  }

  const diagnostics = getAuthEnvDiagnostics();
  const env = getRuntimeEnv();

  return NextResponse.json({
    ok: diagnostics.resolvedSecret && diagnostics.hasGoogleId && diagnostics.hasGoogleSecret,
    diagnostics,
    cloudflare: {
      hasDbBinding: Boolean(env.DB),
      hasAuthUrl: Boolean(env.AUTH_URL?.trim()),
      hasAuthSecret: Boolean(env.AUTH_SECRET?.trim()),
      hasMailFrom: Boolean(env.MAIL_FROM?.trim()),
    },
  });
}

