"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <section className="auth-screen-card glass" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
        <p className="eyebrow">Invalid link</p>
        <h1 className="auth-screen-title">Missing reset token.</h1>
        <p className="copy">This reset link is invalid. Request a new one.</p>
        <a href="/forgot-password" className="button button-primary" style={{ marginTop: 16, display: "inline-block" }}>
          Request new link
        </a>
      </section>
    );
  }

  if (done) {
    return (
      <section className="auth-screen-card glass" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
        <p className="eyebrow">Password updated</p>
        <h1 className="auth-screen-title">All set.</h1>
        <p className="copy">Your password has been reset. Sign in with your new password.</p>
        <a href="/sign-in" className="button button-primary" style={{ marginTop: 16, display: "inline-block" }}>
          Sign in
        </a>
      </section>
    );
  }

  return (
    <section className="auth-screen-card glass" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
      <p className="eyebrow">Reset password</p>
      <h1 className="auth-screen-title">Choose a new password.</h1>

      {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" placeholder="At least 8 characters" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="auth-field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" placeholder="Re-enter your password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit" className="button button-primary auth-submit-button">
          Reset password
        </button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
