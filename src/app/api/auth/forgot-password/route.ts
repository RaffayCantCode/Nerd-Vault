import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthBaseUrl } from "@/lib/auth-env";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

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

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);

    await prisma.passwordResetToken.deleteMany({
      where: {
        email: normalizedEmail,
        OR: [{ used: false }, { expires: { lt: new Date() } }],
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: tokenHash,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const baseUrl = getAuthBaseUrl() ?? "https://nerdvault.site";
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail(normalizedEmail, resetLink);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
    );
  } catch (e) {
    console.error("forgot-password error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Try again later." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
      },
    );
  }
}
