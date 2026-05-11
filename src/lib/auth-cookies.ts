const LEGACY_AUTH_COOKIE_PREFIXES = [
  "next-auth.",
  "__Secure-next-auth.",
];
const CHUNKED_AUTH_SESSION_COOKIE_PATTERN = /^(?:__Secure-|__Host-)?(?:authjs|next-auth)\.session-token\.\d+$/;

export const LEGACY_AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export const OAUTH_TRANSIENT_COOKIE_NAMES = [
  "authjs.callback-url",
  "authjs.csrf-token",
  "authjs.state",
  "authjs.nonce",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.callback-url",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.state",
  "__Secure-authjs.nonce",
  "__Secure-authjs.pkce.code_verifier",
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "next-auth.state",
  "next-auth.nonce",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.callback-url",
  "__Host-next-auth.csrf-token",
  "__Secure-next-auth.state",
  "__Secure-next-auth.nonce",
  "__Secure-next-auth.pkce.code_verifier",
];

/** Every cookie that could be related to NextAuth/auth.js */
export const ALL_AUTH_COOKIE_NAMES = [
  ...LEGACY_AUTH_COOKIE_NAMES,
  ...OAUTH_TRANSIENT_COOKIE_NAMES,
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.state",
  "__Host-authjs.state",
  "authjs.state",
  "__Secure-next-auth.state",
  "__Host-next-auth.state",
  "next-auth.state",
];

export const CLIENT_AUTH_RESET_COOKIE_NAMES = [
  ...LEGACY_AUTH_COOKIE_NAMES,
  ...OAUTH_TRANSIENT_COOKIE_NAMES,
];

export function getAuthCookiesToDelete(cookieNames: Iterable<string>) {
  const deletions = new Set<string>();

  for (const cookieName of cookieNames) {
    if (CHUNKED_AUTH_SESSION_COOKIE_PATTERN.test(cookieName)) {
      deletions.add(cookieName);
      continue;
    }
    // Never auto-delete active session token cookies in middleware-level cleanup.
    // Keep cleanup focused on transient OAuth/state and broken chunked leftovers.
    if (OAUTH_TRANSIENT_COOKIE_NAMES.includes(cookieName)) {
      deletions.add(cookieName);
      continue;
    }

    if (
      LEGACY_AUTH_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix)) &&
      !cookieName.endsWith(".session-token")
    ) {
      deletions.add(cookieName);
    }
  }

  return Array.from(deletions);
}
