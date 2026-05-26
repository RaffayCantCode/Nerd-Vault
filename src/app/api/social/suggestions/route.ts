import { NextResponse } from "next/server";
import { getFriendSuggestions } from "@/lib/vault-server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const results = await getFriendSuggestions(session.user.id);
  return NextResponse.json({ ok: true, results });
}
