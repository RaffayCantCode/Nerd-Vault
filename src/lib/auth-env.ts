/**
 * Auth.js reads AUTH_* vars; older setups still use NEXTAUTH_*.
 * Netlify must expose the same values under both names at runtime.
 */
export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    return undefined;
  }

  // Auth.js requires a reasonably long secret for cookie/JWT encryption.
  if (secret.length < 32) {
    console.error("[auth] AUTH_SECRET is too short (need at least 32 characters).");
    return undefined;
  }

  return secret;
}

export function getAuthBaseUrl() {
  const url =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.URL ? `${process.env.URL.replace(/\/$/, "")}` : undefined) ||
    (process.env.DEPLOY_PRIME_URL ? process.env.DEPLOY_PRIME_URL.replace(/\/$/, "") : undefined);

  return url?.replace(/\/$/, "");
}

export function getAuthEnvDiagnostics() {
  return {
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET?.trim()),
    resolvedSecret: Boolean(getAuthSecret()),
    hasAuthUrl: Boolean(process.env.AUTH_URL?.trim()),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL?.trim()),
    resolvedBaseUrl: getAuthBaseUrl() ?? null,
    hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID?.trim()),
    hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}
