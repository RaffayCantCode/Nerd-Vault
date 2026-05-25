export const GUEST_VIEWER_ID = "guest-vault";

export function isGuestViewer(viewerId: string) {
  return viewerId === GUEST_VIEWER_ID;
}

export function guestSignInHref(redirectTo?: string) {
  const path = redirectTo?.startsWith("/") ? redirectTo : "/home";
  return `/sign-in?redirectTo=${encodeURIComponent(path)}`;
}
