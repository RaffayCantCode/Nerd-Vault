import { NextResponse } from "next/server";
import { declineFriendRequest } from "@/lib/vault-server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
  }

  const { fromUserId } = await request.json();
  if (!fromUserId) {
    return NextResponse.json({ ok: false, message: "Missing fromUserId" }, { status: 400 });
  }

  await declineFriendRequest(session.user.id, fromUserId);
  return NextResponse.json({ ok: true });
}
