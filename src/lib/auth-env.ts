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
  const url = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  return url?.replace(/\/$/, "");
}

export function getGoogleClientId() {
  return process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
}

export function getGoogleClientSecret() {
  return process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();
}

export function getAuthEnvDiagnostics() {
  const authSecretRaw = process.env.AUTH_SECRET?.trim();
  const nextAuthSecretRaw = process.env.NEXTAUTH_SECRET?.trim();
  const resolvedBaseUrl = getAuthBaseUrl() ?? null;
  let resolvedBaseUrlHost: string | null = null;
  if (resolvedBaseUrl) {
    try {
      resolvedBaseUrlHost = new URL(resolvedBaseUrl).host;
    } catch {
      resolvedBaseUrlHost = "invalid-url";
    }
  }

  return {
    hasAuthSecret: Boolean(authSecretRaw),
    hasNextAuthSecret: Boolean(nextAuthSecretRaw),
    authSecretsMatch:
      authSecretRaw && nextAuthSecretRaw ? authSecretRaw === nextAuthSecretRaw : true,
    resolvedSecret: Boolean(getAuthSecret()),
    hasAuthUrl: Boolean(process.env.AUTH_URL?.trim()),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL?.trim()),
    resolvedBaseUrl,
    resolvedBaseUrlHost,
    hasGoogleId: Boolean(getGoogleClientId()),
    hasGoogleSecret: Boolean(getGoogleClientSecret()),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}
