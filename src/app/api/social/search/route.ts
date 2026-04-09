import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, searchUsers } from "@/lib/vault-server";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const query = request.nextUrl.searchParams.get("query") || "";
    const results = await searchUsers(sessionUser.id, query);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "User search failed" }, { status: 400 });
  }
}
