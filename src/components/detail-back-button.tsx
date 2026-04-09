"use client";

import { useRouter } from "next/navigation";

export function DetailBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="button button-secondary detail-back-button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/browse");
      }}
    >
      Back to browse
    </button>
  );
}
