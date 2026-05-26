import { auth } from "@/lib/auth";
import { getFriendActivity } from "@/lib/vault-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const activity = await getFriendActivity(session.user.id);
    return NextResponse.json({ ok: true, results: activity });
  } catch (e) {
    console.error("Activity feed error:", e);
    return NextResponse.json({ ok: false, results: [] });
  }
}
