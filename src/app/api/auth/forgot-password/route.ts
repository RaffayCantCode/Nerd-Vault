import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "If an account with that email exists, a reset link has been sent." }, { status: 200 });
    }

    const token = randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetLink = `${process.env.AUTH_URL ?? "https://nerdvault.site"}/reset-password?token=${token}`;

    await sendPasswordResetEmail(normalizedEmail, resetLink);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("forgot-password error:", e);
    return NextResponse.json({ error: "Something went wrong. Try again later." }, { status: 500 });
  }
}
