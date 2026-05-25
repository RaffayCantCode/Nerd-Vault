import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid token or password." }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashResetToken(token) },
    });

    if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
    );
  } catch (e) {
    console.error("reset-password error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Try again later." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
      },
    );
  }
}
