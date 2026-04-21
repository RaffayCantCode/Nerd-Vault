"use client";

import { useEffect } from "react";
import { primeLibraryState, primeProfilePayload } from "@/lib/vault-client";
import { LibraryState, VaultProfilePayload } from "@/lib/vault-types";

export function VaultClientPrimer({
  library,
  profile,
  profileUserId,
}: {
  library?: LibraryState | null;
  profile?: VaultProfilePayload | null;
  profileUserId?: string;
}) {
  useEffect(() => {
    if (library) {
      primeLibraryState(library);
    }

    if (profile) {
      primeProfilePayload(profile, profileUserId);
    }
  }, [library, profile, profileUserId]);

  return null;
}
