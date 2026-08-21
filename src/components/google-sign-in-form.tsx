"use client";

import { signInWithGoogle } from "@/app/sign-in/actions";

export function GoogleSignInForm({ redirectTo, disabled }: { redirectTo: string; disabled: boolean }) {
  async function handleSubmit(formData: FormData) {
    await signInWithGoogle(formData);
  }

  return (
    <form action={handleSubmit} className="auth-google-form" style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 16 }}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className="button button-secondary auth-google-button"
        style={{ width: "100%", justifyContent: "center", textAlign: "center" }}
        disabled={disabled}
      >
        Continue with Google
      </button>
    </form>
  );
}
