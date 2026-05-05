import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CLIENT_AUTH_RESET_COOKIE_NAMES } from "@/lib/auth-cookies";

const CLEANUP_MARKER = "authjs.cookies-cleaned";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.cookies.get(CLEANUP_MARKER)) {
    return response;
  }

  for (const name of CLIENT_AUTH_RESET_COOKIE_NAMES) {
    if (request.cookies.get(name)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  response.cookies.set(CLEANUP_MARKER, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax" });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
