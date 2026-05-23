"use client";

import { clearAllAuthCookies } from "@/components/auth-cookie-reset";

export function GoogleSignInForm({ redirectTo, disabled }: { redirectTo: string; disabled: boolean }) {
  function handleClick() {
    clearAllAuthCookies();
  }

  return (
    <form action="/api/auth/signin/google" method="POST" style={{ marginTop: 18 }}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="callbackUrl" value={redirectTo} />
      <button
        type="submit"
        className="button button-secondary auth-google-button"
        disabled={disabled}
        onClick={handleClick}
      >
        Continue with Google
      </button>
    </form>
  );
}
