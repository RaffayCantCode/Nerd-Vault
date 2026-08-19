export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
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
