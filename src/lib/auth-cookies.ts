const LEGACY_AUTH_COOKIE_PREFIXES = [
  "next-auth.",
  "__Secure-next-auth.",
];

const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token.",
  "__Secure-authjs.session-token.",
  "next-auth.session-token.",
  "__Secure-next-auth.session-token.",
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

export function getAuthCookiesToDelete(cookieNames: Iterable<string>) {
  const deletions = new Set<string>();

  for (const cookieName of cookieNames) {
    if (LEGACY_AUTH_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix))) {
      deletions.add(cookieName);
      continue;
    }

    if (SESSION_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix))) {
      deletions.add(cookieName);
    }
  }

  return Array.from(deletions);
}
