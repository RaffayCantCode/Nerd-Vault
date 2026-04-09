import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, sendRecommendation } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { targetId, item } = await request.json();
    await sendRecommendation(sessionUser.id, targetId, item);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Recommendation failed" }, { status: 400 });
  }
}
