import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getListById } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id ?? "";
    const { id } = await params;
    const list = await getListById(id, viewerId);
    if (!list) {
      return NextResponse.json({ ok: false, message: "List not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, list });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Failed to load list" }, { status: 500 });
  }
}
