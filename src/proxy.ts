import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthCookiesToDelete } from "@/lib/auth-cookies";

const CLEANUP_MARKER = "authjs.cookies-cleaned";

export function proxy(request: NextRequest) {
  if (request.cookies.get(CLEANUP_MARKER)) {
    return NextResponse.next();
  }

  const deletions = getAuthCookiesToDelete(request.cookies.getAll().map((cookie) => cookie.name));

  const response = NextResponse.next();

  for (const cookieName of deletions) {
    response.cookies.delete(cookieName);
  }

  response.cookies.set(CLEANUP_MARKER, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax" });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
