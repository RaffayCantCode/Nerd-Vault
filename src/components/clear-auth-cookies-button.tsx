"use client";

import { clearAllAuthCookies } from "@/components/auth-cookie-reset";

export function ClearAuthCookiesButton() {
  return (
    <button
      type="button"
      className="button button-ghost"
      onClick={() => {
        clearAllAuthCookies();
        window.location.reload();
      }}
    >
      Clear sign-in cookies & retry
    </button>
  );
}
