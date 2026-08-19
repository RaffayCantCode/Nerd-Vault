import { auth } from "@/lib/auth";
import { searchUsers } from "@/lib/vault-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const users = await searchUsers(session.user.id, q);

  return NextResponse.json({
    ok: true,
    results: users.map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      handle: u.name ?? "",
      avatarUrl: u.avatarUrl ?? undefined,
    })),
  });
}
