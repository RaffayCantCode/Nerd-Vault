const fromAddress = process.env.MAIL_FROM ?? "noreply@nerdvault.site";

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (process.env.NODE_ENV !== "production" && !process.env.MAIL_FROM) {
    console.log("============================================");
    console.log("Password reset link for", email);
    console.log(resetLink);
    console.log("============================================");
    return;
  }

  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
        },
      ],
      from: {
        email: fromAddress,
        name: "NerdVault",
      },
      subject: "Reset your NerdVault password",
      content: [
        {
          type: "text/html",
          value: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Reset your NerdVault password</h2>
              <p>Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #69C5AC; color: #06090f; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">
                Reset password
              </a>
              <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Password reset email failed: ${response.status} ${errorText}`.trim());
  }
}

