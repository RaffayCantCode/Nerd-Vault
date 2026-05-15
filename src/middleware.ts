import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAuthCookiesToDelete } from "@/lib/auth-cookies";

/**
 * Middleware: purge stale NextAuth cookie chunks.
 *
 * When a user signs in with Google, NextAuth v5 may chunk the session JWT
 * across numbered cookies (e.g. __Secure-authjs.session-token.0 … .20).
 * Old chunks from previous sessions accumulate and are sent on every request,
 * quickly exceeding Vercel's ~8 KB header limit → 494 REQUEST_HEADER_TOO_LARGE.
 *
 * This middleware runs before every page/API request and deletes:
 *   - Any chunked session-token cookie  (*.session-token.\d+)
 *   - Stale OAuth transient cookies     (state, nonce, pkce, csrf, callback-url)
 *   - Legacy next-auth.* prefixed cookies
 *
 * It intentionally NEVER deletes the active single-cookie session token
 * (__Secure-authjs.session-token without a numeric suffix).
 */
export function middleware(request: NextRequest) {
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
      // Mirror the security flags so the browser actually accepts the deletion.
      secure: request.nextUrl.protocol === "https:",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Run on all routes except Next.js internals, static files, and the auth
  // API itself (we don't want to clobber live OAuth handshake cookies).
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)",
  ],
};
