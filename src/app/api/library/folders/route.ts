import { NextRequest, NextResponse } from "next/server";
import { createFolder, requireSessionUser } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const body = await request.json();
    const folder = await createFolder(sessionUser.id, body ?? {});
    return NextResponse.json({ ok: true, folder });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Folder creation failed" }, { status: 400 });
  }
}
