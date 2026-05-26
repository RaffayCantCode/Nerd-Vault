import { auth } from "@/lib/auth";
import { getFriendProfilesWithStatus } from "@/lib/vault-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await getFriendProfilesWithStatus(session.user.id);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("Friends data error:", e);
    return NextResponse.json({ ok: false, friends: [], suggestions: [] });
  }
}
