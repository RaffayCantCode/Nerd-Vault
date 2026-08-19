import { NextRequest, NextResponse } from "next/server";

import { getAuthBaseUrl } from "@/lib/auth-env";
import { execute, queryOne, uuid } from "@/lib/d1";
import { sendPasswordResetEmail } from "@/lib/email";

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashResetToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne<{ id: string }>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [normalizedEmail]);

    if (!user) {
      return NextResponse.json(
        { error: "If an account with that email exists, a reset link has been sent." },
        { status: 200 },
      );
    }

    const randomTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(randomTokenBytes);
    const token = toBase64Url(randomTokenBytes);
    const tokenHash = await hashResetToken(token);

    await execute(
      `
        DELETE FROM password_reset_tokens
        WHERE email = ? AND (used = 0 OR expires < CURRENT_TIMESTAMP)
      `,
      [normalizedEmail],
    );

    await execute(
      `
        INSERT INTO password_reset_tokens (id, email, token, expires, used, created_at)
        VALUES (?, ?, ?, datetime(CURRENT_TIMESTAMP, '+1 hour'), 0, CURRENT_TIMESTAMP)
      `,
      [uuid(), normalizedEmail, tokenHash],
    );

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

