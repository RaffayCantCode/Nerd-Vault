import { signInWithGoogle } from "@/app/sign-in/actions";
import { SiteHeader } from "@/components/site-header";

export default function SignInPage() {
  const googleReady = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
  );

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen">
        <section className="auth-screen-card glass">
          <div className="auth-screen-copy">
            <p className="eyebrow">Sign in</p>
            <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)" }}>
              Step into your archive.
            </h1>
            <p className="copy">
              Keep your profile, folders, and social layer attached to one identity once Google auth is live on your local setup or real domain.
            </p>
            <p className="copy" style={{ marginTop: 14 }}>
              {googleReady
                ? "Google auth env vars are present. If sign-in still fails, check your Google OAuth origin and callback settings."
                : "Google auth still needs AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET in .env.local."}
            </p>
          </div>

          <div className="auth-screen-panel glass">
            <p className="eyebrow">Continue with</p>
            <h2 className="headline">Google</h2>
            <p className="copy">
              One account for your library, your folders, and later your friends and recommendations too.
            </p>
            <form action={signInWithGoogle} style={{ marginTop: 22 }}>
              <button type="submit" className="button button-primary auth-google-button">
                Continue with Google
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
