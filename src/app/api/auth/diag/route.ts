import { NextResponse } from "next/server";
import { getAuthEnvDiagnostics } from "@/lib/auth-env";

export const runtime = "nodejs";

/**
 * Runtime auth env check — only when AUTH_DEBUG=true.
 * Visit /api/auth/diag after deploy to verify Netlify injected secrets.
 */
export async function GET() {
  if (process.env.AUTH_DEBUG !== "true") {
    return NextResponse.json({ ok: false, message: "Set AUTH_DEBUG=true to use this endpoint." }, { status: 404 });
  }

  const diagnostics = getAuthEnvDiagnostics();

  return NextResponse.json({
    ok: diagnostics.resolvedSecret && diagnostics.hasGoogleId && diagnostics.hasGoogleSecret,
    diagnostics,
  });
}
