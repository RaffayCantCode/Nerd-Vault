import { NextResponse } from "next/server";
import { removeFriend } from "@/lib/vault-server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
  }

  const { friendId } = await request.json();
  if (!friendId) {
    return NextResponse.json({ ok: false, message: "Missing friendId" }, { status: 400 });
  }

  await removeFriend(session.user.id, friendId);
  return NextResponse.json({ ok: true });
}
