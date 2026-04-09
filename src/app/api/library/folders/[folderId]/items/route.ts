import { NextRequest, NextResponse } from "next/server";
import { addItemToFolder, removeItemFromFolder, requireSessionUser } from "@/lib/vault-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { folderId } = await params;
    const { item } = await request.json();
    await addItemToFolder(sessionUser.id, folderId, item);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Folder item add failed" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { folderId } = await params;
    const { searchParams } = new URL(request.url);
    await removeItemFromFolder(
      sessionUser.id,
      folderId,
      searchParams.get("source") || "",
      searchParams.get("sourceId") || "",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Folder item removal failed" }, { status: 400 });
  }
}
