import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUserRecord, getVaultProfilePayload, requireSessionUser, updateProfile } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    await ensureCurrentUserRecord();
    const viewedUserId = request.nextUrl.searchParams.get("user") || sessionUser.id;
    const payload = await getVaultProfilePayload(sessionUser.id, viewedUserId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Profile load failed" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const body = await request.json();
    await updateProfile(sessionUser.id, body ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Profile update failed" }, { status: 400 });
  }
}
