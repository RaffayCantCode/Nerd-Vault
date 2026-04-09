import { NextResponse } from "next/server";
import { getLibraryStateForUser, requireSessionUser } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    const library = await getLibraryStateForUser(sessionUser.id);
    return NextResponse.json({ ok: true, ...library });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Library load failed" }, { status: 401 });
  }
}
