import { NextRequest, NextResponse } from "next/server";
import { deleteList, requireSessionUser, updateList } from "@/lib/vault-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { listId } = await params;
    const body = await request.json();
    await updateList(sessionUser.id, listId, body ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "List update failed" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { listId } = await params;
    await deleteList(sessionUser.id, listId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "List delete failed" }, { status: 400 });
  }
}
