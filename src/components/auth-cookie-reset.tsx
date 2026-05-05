"use client";

import { useEffect } from "react";

import { ALL_AUTH_COOKIE_NAMES } from "@/lib/auth-cookies";

function expireCookie(name: string, path: string, domain?: string, secure = true) {
  const domainPart = domain ? `; domain=${domain}` : "";
  const securePart = secure ? "; secure" : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainPart}; SameSite=Lax${securePart}`;
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Aggressively clear every known auth-related cookie on the client.
 *  Use this before form submission to avoid 494 REQUEST_HEADER_TOO_LARGE. */
export function clearAllAuthCookies() {
  const hostname = window.location.hostname;
  const candidateDomains = hostname.includes(".")
    ? [hostname, `.${hostname}`]
    : [hostname];

  const isSecure = window.location.protocol === "https:";
  for (const cookieName of ALL_AUTH_COOKIE_NAMES) {
    expireCookie(cookieName, "/", undefined, isSecure);
    for (const domain of candidateDomains) {
      expireCookie(cookieName, "/", domain, isSecure);
    }
  }
}

export function AuthCookieReset() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const candidateDomains = hostname.includes(".")
      ? [hostname, `.${hostname}`]
      : [hostname];

    const isSecure = window.location.protocol === "https:";
    for (const cookieName of ALL_AUTH_COOKIE_NAMES) {
      expireCookie(cookieName, "/", undefined, isSecure);
      for (const domain of candidateDomains) {
        expireCookie(cookieName, "/", domain, isSecure);
      }
    }

    // Redirect after Google OAuth if a post-auth redirect was stashed.
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
