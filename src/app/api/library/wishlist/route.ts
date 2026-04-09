import { NextRequest, NextResponse } from "next/server";
import { addToWishlist, removeFromWishlist, requireSessionUser } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { item } = await request.json();
    await addToWishlist(sessionUser.id, item);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Wishlist update failed" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    await removeFromWishlist(sessionUser.id, searchParams.get("source") || "", searchParams.get("sourceId") || "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Wishlist removal failed" }, { status: 400 });
  }
}
