import { NextRequest, NextResponse } from "next/server";
import { dismissNotification, markNotificationRead, requireSessionUser } from "@/lib/vault-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { notificationId } = await params;
    await markNotificationRead(sessionUser.id, notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Notification update failed" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const sessionUser = await requireSessionUser();
    const { notificationId } = await params;
    await dismissNotification(sessionUser.id, notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Notification delete failed" }, { status: 400 });
  }
}
