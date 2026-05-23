import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

const transporter = createTransporter();
const fromAddress = process.env.SMTP_FROM ?? "noreply@nerdvault.site";

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  if (transporter) {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Reset your NerdVault password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Reset your NerdVault password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #03fcbe; color: #06090f; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">
            Reset password
          </a>
          <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    return;
  }

  console.log("============================================");
  console.log("Password reset link for", email);
  console.log(resetLink);
  console.log("============================================");
}
