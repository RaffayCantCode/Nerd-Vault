import { NextRequest, NextResponse } from "next/server";
import { acceptFriendRequest, requireSessionUser } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { fromUserId } = await request.json();
    await acceptFriendRequest(sessionUser.id, fromUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Friend accept failed" }, { status: 400 });
  }
}
