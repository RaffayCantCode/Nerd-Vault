import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, sendRecommendation } from "@/lib/vault-server";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { targetIds, item } = await request.json();
    const uniqueTargetIds = Array.from(
      new Set((Array.isArray(targetIds) ? targetIds : []).filter((value): value is string => typeof value === "string" && value.trim().length > 0)),
    );

    if (!uniqueTargetIds.length) {
      throw new Error("Choose at least one friend.");
    }

    await Promise.all(uniqueTargetIds.map((targetId) => sendRecommendation(sessionUser.id, targetId, item)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Recommendation failed" }, { status: 400 });
  }
}
