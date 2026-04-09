import { NextRequest, NextResponse } from "next/server";
import { deleteFolder, requireSessionUser, updateFolder } from "@/lib/vault-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { folderId } = await params;
    const body = await request.json();
    await updateFolder(sessionUser.id, folderId, body ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Folder update failed" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { folderId } = await params;
    await deleteFolder(sessionUser.id, folderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Folder delete failed" }, { status: 400 });
  }
}
