"use client";

import { useEffect } from "react";

import { LEGACY_AUTH_COOKIE_NAMES } from "@/lib/auth-cookies";

function expireCookie(name: string, path: string, domain?: string, secure = true) {
  const domainPart = domain ? `; domain=${domain}` : "";
  const securePart = secure ? "; secure" : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainPart}; SameSite=Lax${securePart}`;
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Clear only legacy NextAuth cookies and stale session chunks — not active OAuth PKCE/state cookies. */
export function clearLegacyAuthCookies() {
  const hostname = window.location.hostname;
  const candidateDomains = hostname.includes(".")
    ? [hostname, `.${hostname}`]
    : [hostname];
  const isSecure = window.location.protocol === "https:";

  for (const cookieName of LEGACY_AUTH_COOKIE_NAMES) {
    expireCookie(cookieName, "/", undefined, isSecure);
    for (const domain of candidateDomains) {
      expireCookie(cookieName, "/", domain, isSecure);
    }
  }

  const chunkedPattern = /^(?:__Secure-|__Host-)?(?:authjs|next-auth)\.session-token\.\d+$/;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name && chunkedPattern.test(name)) {
      expireCookie(name, "/", undefined, isSecure);
      for (const domain of candidateDomains) {
        expireCookie(name, "/", domain, isSecure);
      }
    }
  }
}

/** @deprecated Use clearLegacyAuthCookies — clearing OAuth cookies breaks Google callback. */
export function clearAllAuthCookies() {
  clearLegacyAuthCookies();
}

export function AuthCookieReset() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const candidateDomains = hostname.includes(".")
      ? [hostname, `.${hostname}`]
      : [hostname];

    const isSecure = window.location.protocol === "https:";
    // Redirect after Google OAuth if a post-auth redirect was stashed.
    const pathname = window.location.pathname;
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/sign-in")) {
      return;
    }

    const postAuthRedirect = readCookie("nv.redirect-to");
    if (postAuthRedirect) {
      expireCookie("nv.redirect-to", "/", undefined, isSecure);
      for (const domain of candidateDomains) {
        expireCookie("nv.redirect-to", "/", domain, isSecure);
      }
      window.location.replace(postAuthRedirect);
    }
  }, []);

  return null;
}
