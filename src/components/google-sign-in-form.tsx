"use client";

import { clearLegacyAuthCookies } from "@/components/auth-cookie-reset";
import { signInWithGoogle } from "@/app/sign-in/actions";

export function GoogleSignInForm({ redirectTo, disabled }: { redirectTo: string; disabled: boolean }) {
  async function handleSubmit(formData: FormData) {
    clearLegacyAuthCookies();
    await signInWithGoogle(formData);
  }

  return (
    <form action={handleSubmit} style={{ marginTop: 18 }}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="button button-secondary auth-google-button"
        disabled={disabled}
      >
        Continue with Google
      </button>
    </form>
  );
}
