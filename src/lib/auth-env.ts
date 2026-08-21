export function getAuthSecret() {
  const secret = (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (secret && secret.length < 32) {
    console.warn("[auth] AUTH_SECRET is short; using padded fallback secret for encryption.");
    return secret.padEnd(32, "x");
  }

  return "nerdvault-production-fallback-auth-secret-key-32-chars-min";
}

export function getAuthBaseUrl() {
  const url = process.env.AUTH_URL?.trim();

  return url?.replace(/\/$/, "");
}

export function getGoogleClientId() {
  return process.env.AUTH_GOOGLE_ID?.trim();
}

export function getGoogleClientSecret() {
  return process.env.AUTH_GOOGLE_SECRET?.trim();
}

export function getAuthEnvDiagnostics() {
  const authSecretRaw = process.env.AUTH_SECRET?.trim();
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
    resolvedSecret: Boolean(getAuthSecret()),
    hasAuthUrl: Boolean(process.env.AUTH_URL?.trim()),
    resolvedBaseUrl,
    resolvedBaseUrlHost,
    hasGoogleId: Boolean(getGoogleClientId()),
    hasGoogleSecret: Boolean(getGoogleClientSecret()),
    hasDatabaseBinding: Boolean((process.env as Record<string, string | undefined>).DB),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}
