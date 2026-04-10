import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthCookiesToDelete } from "@/lib/auth-cookies";

export function proxy(request: NextRequest) {
  const deletions = getAuthCookiesToDelete(request.cookies.getAll().map((cookie) => cookie.name));

  if (deletions.length === 0) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  for (const cookieName of deletions) {
    response.cookies.delete(cookieName);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
