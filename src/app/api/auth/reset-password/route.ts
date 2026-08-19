import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { execute, queryOne } from "@/lib/d1";

async function hashResetToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid token or password." }, { status: 400 });
    }

    const resetToken = await queryOne<{
      id: string;
      email: string;
      used: number;
      expires: string;
    }>(`SELECT * FROM password_reset_tokens WHERE token = ? LIMIT 1`, [await hashResetToken(token)]);

    if (!resetToken || resetToken.used || new Date(resetToken.expires) < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await execute(
      `
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `,
      [passwordHash, resetToken.email],
    );

    await execute(
      `
        UPDATE password_reset_tokens
        SET used = 1
        WHERE id = ?
      `,
      [resetToken.id],
    );

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

