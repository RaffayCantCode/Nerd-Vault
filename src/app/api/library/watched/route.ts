import { NextRequest, NextResponse } from "next/server";
import { addToWatched, removeFromWatched, requireSessionUser } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { item, review } = await request.json();
    await addToWatched(sessionUser.id, item, review);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Watched update failed" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    await removeFromWatched(sessionUser.id, searchParams.get("source") || "", searchParams.get("sourceId") || "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Watched removal failed" }, { status: 400 });
  }
}
