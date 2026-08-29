import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { GoogleSignInForm } from "@/components/google-sign-in-form";
import { AuthCredentialsForm } from "@/components/auth-credentials-form";
import { getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";

type SignInPageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
    success?: string;
    redirectTo?: string;
  }>;
};

function resolveSafeRedirectPath(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/sign-in")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const pathnameWithSearch = `${parsed.pathname}${parsed.search}`;
    if (pathnameWithSearch.startsWith("/") && !pathnameWithSearch.startsWith("/sign-in")) {
      return pathnameWithSearch;
    }
  } catch {
    return null;
  }

  return null;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Auth is misconfigured on the server. Check AUTH_SECRET, AUTH_URL, and the Cloudflare DB binding.",
  AccessDenied: "Google sign-in was cancelled or denied.",
  OAuthAccountNotLinked:
    "This email already has an account. Sign in with email/password first, or use the same Google account you registered with.",
  OAuthSignin: "Google sign-in could not start. Try again in a private window.",
  OAuthCallback: "Google callback failed. This is usually a database or redirect URI issue - check Cloudflare logs.",
  OAuthCreateAccount: "Could not create your account in the database. Verify the Cloudflare DB binding and D1 schema.",
  CallbackRouteError: "Auth callback crashed on the server. Check Cloudflare logs for auth or database errors.",
  InvalidCheck: "OAuth security check failed (PKCE/state). Clear cookies for nerdvault.site and try again.",
  "google-not-configured": "Google sign-in is not configured in environment variables.",
  "google-sign-in-failed": "Google sign-in failed before redirecting to Google.",
};

function getMessageCopy(success?: string, error?: string) {
  if (error) {
    const decoded = decodeURIComponent(error.replace(/\+/g, " "));
    return {
      tone: "error",
      text: AUTH_ERROR_MESSAGES[decoded] ?? decoded,
    };
  }

  if (success === "account-created") {
    return {
      tone: "success",
      text: "Account created. Log in with your email and password.",
    };
  }

  return null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const headerList = await headers();
  const mode = params.mode === "signup" ? "signup" : "login";
  const feedback = getMessageCopy(params.success, params.error);
  const googleReady = Boolean(getGoogleClientId() && getGoogleClientSecret() && getAuthSecret());
  const redirectTo =
    resolveSafeRedirectPath(params.redirectTo) ??
    resolveSafeRedirectPath(headerList.get("referer")) ??
    "/home";

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen auth-screen-signin">
        <section className="auth-screen-card auth-screen-card-signin glass">
          <div className="auth-screen-copy auth-screen-copy-signin">
            <p className="eyebrow">Account access</p>
            <h1 className="auth-screen-title">Sign in or create an account.</h1>
          </div>

          <div className="auth-screen-panel auth-screen-panel-signin glass">
            <div className="auth-panel-header">
              <p className="eyebrow">Choose a route</p>
              <div className="auth-mode-row">
                <a
                  href={`/sign-in?mode=login&redirectTo=${encodeURIComponent(redirectTo)}`}
                  className={`auth-mode-chip ${mode === "login" ? "is-active" : ""}`}
                >
                  Log in
                </a>
                <a
                  href={`/sign-in?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`}
                  className={`auth-mode-chip ${mode === "signup" ? "is-active" : ""}`}
                >
                  Create account
                </a>
              </div>
            </div>

            {feedback ? <p className={`auth-feedback auth-feedback-${feedback.tone}`}>{feedback.text}</p> : null}

            <AuthCredentialsForm mode={mode} redirectTo={redirectTo} />

            <div className="auth-divider">
              <span>or</span>
            </div>

            <GoogleSignInForm redirectTo={redirectTo} disabled={!googleReady} />

            <div className="auth-alt-actions">
              <a href="/forgot-password" className="auth-forgot-link">
                Forgot password?
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

