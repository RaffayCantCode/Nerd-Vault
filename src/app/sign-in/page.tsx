import { signInWithCredentials, signInWithGoogle, signUpWithCredentials } from "@/app/sign-in/actions";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";

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

function getMessageCopy(success?: string, error?: string) {
  if (error) {
    return {
      tone: "error",
      text: error,
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
  const googleReady = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
  );
  const redirectTo =
    resolveSafeRedirectPath(params.redirectTo) ??
    resolveSafeRedirectPath(headerList.get("referer")) ??
    "/";

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen auth-screen-signin">
        <section className="auth-screen-card auth-screen-card-signin glass">
          <div className="auth-screen-copy auth-screen-copy-signin">
            <p className="eyebrow">Account access</p>
            <h1 className="auth-screen-title">
              Step into your archive.
            </h1>
            <p className="copy">
              Create your own NerdVault account with email and password, or use Google when you want the faster route in.
            </p>
            <p className="copy" style={{ marginTop: 14 }}>
              {googleReady
                ? "Google sign-in is available. If it fails on Vercel, the Google OAuth app likely needs the correct production callback URL."
                : "Google sign-in still needs AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET configured."}
            </p>
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

            {feedback ? (
              <p className={`auth-feedback auth-feedback-${feedback.tone}`}>{feedback.text}</p>
            ) : null}

            {mode === "signup" ? (
              <form action={signUpWithCredentials} className="auth-form">
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <div className="auth-field">
                  <label htmlFor="name">Display name</label>
                  <input id="name" name="name" type="text" placeholder="Raffay" required minLength={2} />
                </div>
                <div className="auth-field">
                  <label htmlFor="signup-email">Email</label>
                  <input id="signup-email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="auth-field">
                  <label htmlFor="signup-password">Password</label>
                  <input id="signup-password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
                </div>
                <button type="submit" className="button button-primary auth-submit-button">
                  Create account
                </button>
              </form>
            ) : (
              <form action={signInWithCredentials} className="auth-form">
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <div className="auth-field">
                  <label htmlFor="login-email">Email</label>
                  <input id="login-email" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <input id="login-password" name="password" type="password" placeholder="Your password" required minLength={8} />
                </div>
                <button type="submit" className="button button-primary auth-submit-button">
                  Log in
                </button>
              </form>
            )}

            <div className="auth-divider">
              <span>or</span>
            </div>

            <p className="copy">
              Use Google if you want the one-click route and already have your OAuth keys connected in Vercel.
            </p>
            <form action={signInWithGoogle} style={{ marginTop: 18 }}>
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button
                type="submit"
                className="button button-secondary auth-google-button"
                disabled={!googleReady}
              >
                Continue with Google
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
