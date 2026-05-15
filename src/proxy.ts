import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthCookiesToDelete } from "@/lib/auth-cookies";

/**
 * Proxy (middleware): purge stale NextAuth cookie chunks.
 *
 * Google OAuth + NextAuth v5 can chunk an oversized JWT across 20+ numbered
 * cookies (e.g. __Secure-authjs.session-token.0 … .20, each ~4 KB), which
 * causes Vercel's 494 REQUEST_HEADER_TOO_LARGE error on every subsequent
 * request. Old chunks from previous sessions also accumulate without being
 * cleaned up automatically.
 *
 * On every non-auth, non-static request this function deletes:
 *   - Chunked session-token cookies  (*.session-token.\d+)
 *   - Stale OAuth transient cookies  (state, nonce, pkce, csrf, callback-url)
 *   - Legacy next-auth.* prefixed cookies
 *
 * It intentionally NEVER deletes the active unchunked session token
 * (__Secure-authjs.session-token without a numeric suffix).
 */
export function proxy(request: NextRequest) {
  // Skip cleanup during the OAuth handshake so we don't clobber live state/
  // nonce/pkce cookies that NextAuth needs to complete the Google sign-in flow.
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const cookieNames = request.cookies.getAll().map((c) => c.name);
  const toDelete = getAuthCookiesToDelete(cookieNames);

  if (toDelete.length === 0) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  for (const name of toDelete) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
