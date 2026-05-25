import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Matches ONLY the numbered session-token chunk cookies that NextAuth v5
 * creates when a JWT is too large to fit in a single 4 KB cookie, e.g.:
 *   __Secure-authjs.session-token.0
 *   __Secure-authjs.session-token.1
 *   …
 *   __Secure-authjs.session-token.20
 *
 * These chunks from previous/failed logins accumulate and add up to 80+ KB of
 * Cookie headers, causing REQUEST_HEADER_TOO_LARGE errors at the edge.
 *
 * NOTE: We intentionally do NOT delete transient OAuth cookies (pkce, state,
 * nonce, csrf, callback-url). Those are tiny, expire in minutes, and deleting
 * them while a Google sign-in flow is in progress causes the
 * "InvalidCheck: pkceCodeVerifier value could not be parsed" server error.
 *
 * Cleans up stale session-token chunk cookies accumulated from failed logins.
 */
const CHUNKED_SESSION_TOKEN_RE =
  /^(?:__Secure-|__Host-)?(?:authjs|next-auth)\.session-token\.\d+$/;

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Never touch cookies during the OAuth handshake.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Keep a single canonical host so AUTH_URL, cookies, and Google redirects stay aligned.
  if (hostname === "www.nerdvault.site") {
    const canonical = new URL(request.url);
    canonical.hostname = "nerdvault.site";
    return NextResponse.redirect(canonical, 308);
  }

  const chunkedCookies = request.cookies
    .getAll()
    .filter((c) => CHUNKED_SESSION_TOKEN_RE.test(c.name));

  if (chunkedCookies.length === 0) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  for (const { name } of chunkedCookies) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/",
      secure: request.nextUrl.protocol === "https:",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Never run middleware on Auth.js routes (OAuth callback + error page).
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
