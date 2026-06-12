import { NextRequest, NextResponse } from "next/server";
import { createList, requireSessionUser } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const body = await request.json();
    const list = await createList(sessionUser.id, body ?? {});
    return NextResponse.json({ ok: true, folder: list, list });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "List creation failed" }, { status: 400 });
  }
}
