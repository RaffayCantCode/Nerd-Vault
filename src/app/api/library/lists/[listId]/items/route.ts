import { NextRequest, NextResponse } from "next/server";
import { addItemToList, removeItemFromList, requireSessionUser } from "@/lib/vault-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { listId } = await params;
    const { item } = await request.json();
    await addItemToList(sessionUser.id, listId, item);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "List item add failed" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { listId } = await params;
    const { searchParams } = new URL(request.url, "http://localhost");
    await removeItemFromList(
      sessionUser.id,
      listId,
      searchParams.get("source") || "",
      searchParams.get("sourceId") || "",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "List item removal failed" }, { status: 400 });
  }
}
