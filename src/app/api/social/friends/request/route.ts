import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, sendFriendRequest } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { targetId } = await request.json();
    await sendFriendRequest(sessionUser.id, targetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Friend request failed" }, { status: 400 });
  }
}
