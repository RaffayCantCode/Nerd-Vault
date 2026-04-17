import { signInWithCredentials, signInWithGoogle } from "@/app/sign-in/actions";
import { LandingFeatureCarousel } from "@/components/landing-feature-carousel";

export function LandingAuthCard({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    return (
      <div className="auth-card glass landing-auth-panel">
        <p className="eyebrow">You are in</p>
        <h2 className="headline">Your vault is already active.</h2>
        <p className="copy">
          You are already signed in, so this landing panel should behave like a clean checkpoint: jump back into browse or sign out.
        </p>
        <LandingFeatureCarousel isSignedIn />
      </div>
    );
  }

  return (
      <div className="auth-card glass landing-auth-panel">
        <p className="eyebrow">Pick your route</p>
        <h2 className="headline">Choose whether you want to explore first or start saving for real.</h2>
        <p className="copy">
          Guest mode is best for a quick look around. Signing in is for the full version where your avatar, folders, social inbox, and saved history actually stay with you.
        </p>
        <form action={signInWithCredentials} className="auth-form" style={{ marginTop: 20 }}>
          <input type="hidden" name="redirectTo" value="/home" />
          <div className="auth-field">
            <label htmlFor="landing-login-email">Email</label>
            <input id="landing-login-email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label htmlFor="landing-login-password">Password</label>
            <input id="landing-login-password" name="password" type="password" placeholder="Your password" required minLength={8} />
          </div>
          <div className="button-row" style={{ marginTop: 18 }}>
            <button type="submit" className="button button-primary">
              Log in from home
            </button>
          </div>
        </form>
        <form action={signInWithGoogle} style={{ marginTop: 12 }}>
          <button type="submit" className="button button-secondary">
            Continue with Google
          </button>
        </form>
        <LandingFeatureCarousel isSignedIn={false} />
      </div>
  );
}
