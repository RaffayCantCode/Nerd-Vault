"use client";

import { useState } from "react";
import { signInWithCredentials, signUpWithCredentials } from "@/app/sign-in/actions";
import { Loader2, ArrowRight, Lock, Mail, User } from "lucide-react";

type AuthCredentialsFormProps = {
  mode: "login" | "signup";
  redirectTo: string;
};

export function AuthCredentialsForm({ mode, redirectTo }: AuthCredentialsFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [clientError, setClientError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(formData: FormData) {
    setClientError("");

    if (mode === "signup") {
      const pwd = formData.get("password") as string;
      const confirmPwd = formData.get("confirmPassword") as string;

      if (pwd !== confirmPwd) {
        setClientError("Passwords do not match. Please re-check.");
        return;
      }

      if (pwd.length < 8) {
        setClientError("Password must be at least 8 characters.");
        return;
      }
    }

    setIsPending(true);

    try {
      if (mode === "signup") {
        await signUpWithCredentials(formData);
      } else {
        await signInWithCredentials(formData);
      }
    } catch (err: any) {
      // If error is NEXT_REDIRECT, let Next.js handle navigation
      if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setIsPending(false);
      setClientError(err?.message || "An unexpected error occurred.");
    }
  }

  return (
    <form action={handleSubmit} className="auth-form">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {clientError && (
        <div className="auth-feedback auth-feedback-error" role="alert">
          {clientError}
        </div>
      )}

      {mode === "signup" && (
        <div className="auth-field">
          <label htmlFor="signup-name">Display Name</label>
          <div className="auth-input-wrap">
            <User size={16} className="auth-field-icon" aria-hidden="true" />
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="e.g. Alex Rivera"
              required
              minLength={2}
              disabled={isPending}
              className="auth-input"
            />
          </div>
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="auth-email">Email Address</label>
        <div className="auth-input-wrap">
          <Mail size={16} className="auth-field-icon" aria-hidden="true" />
          <input
            id="auth-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
            className="auth-input"
          />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="auth-password">Password</label>
        <div className="auth-input-wrap">
          <Lock size={16} className="auth-field-icon" aria-hidden="true" />
          <input
            id="auth-password"
            name="password"
            type="password"
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            required
            minLength={8}
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
        </div>
      </div>

      {mode === "signup" && (
        <div className="auth-field">
          <label htmlFor="signup-confirm-password">Confirm Password</label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-field-icon" aria-hidden="true" />
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              required
              minLength={8}
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="button button-primary auth-submit-button"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="spinner" />
            <span>{mode === "signup" ? "Creating account..." : "Signing in..."}</span>
          </>
        ) : (
          <>
            <span>{mode === "signup" ? "Create account" : "Log in"}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
