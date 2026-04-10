"use client";

import { useEffect } from "react";

import { CLIENT_AUTH_RESET_COOKIE_NAMES } from "@/lib/auth-cookies";

function expireCookie(name: string, path: string, domain?: string) {
  const domainPart = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainPart}; SameSite=Lax`;
}

export function AuthCookieReset() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const candidateDomains = hostname.includes(".")
      ? [hostname, `.${hostname}`]
      : [hostname];

    for (const cookieName of CLIENT_AUTH_RESET_COOKIE_NAMES) {
      expireCookie(cookieName, "/");

      for (const domain of candidateDomains) {
        expireCookie(cookieName, "/", domain);
      }
    }
  }, []);

  return null;
}
