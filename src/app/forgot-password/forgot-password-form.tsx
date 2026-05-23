"use client";

import { useState, FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <section className="auth-screen-card glass" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
        <p className="eyebrow">Email sent</p>
        <h1 className="auth-screen-title">Check your inbox.</h1>
        <p className="copy">If an account exists with that email, you'll receive a password reset link shortly.</p>
        <a href="/sign-in" className="button button-primary" style={{ marginTop: 16, display: "inline-block" }}>
          Back to sign-in
        </a>
      </section>
    );
  }

  return (
    <section className="auth-screen-card glass" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
      <p className="eyebrow">Reset password</p>
      <h1 className="auth-screen-title">Forgot your password?</h1>
      <p className="copy" style={{ marginBottom: 20 }}>
        Enter the email address linked to your account and we'll send a reset link.
      </p>

      {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="reset-email">Email</label>
          <input id="reset-email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="button button-primary auth-submit-button">
          Send reset link
        </button>
      </form>

      <a href="/sign-in" className="auth-forgot-link" style={{ marginTop: 16, display: "inline-block" }}>
        Back to sign-in
      </a>
    </section>
  );
}
