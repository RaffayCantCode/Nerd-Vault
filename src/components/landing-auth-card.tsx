import { signOutUser } from "@/app/sign-in/sign-out-action";
import Link from "next/link";

export function LandingAuthCard({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    return (
      <div className="auth-card glass landing-auth-panel">
        <p className="eyebrow">You are in</p>
        <h2 className="headline">Your vault is already active.</h2>
        <p className="copy">
          You are already signed in, so this landing panel should behave like a clean checkpoint: jump back into browse or sign out.
        </p>
        <div className="button-row" style={{ marginTop: 18 }}>
          <Link href="/browse" className="button button-primary">
            Go back to browse
          </Link>
          <form action={signOutUser}>
            <button type="submit" className="button button-secondary">
              Sign out
            </button>
          </form>
        </div>
        <div className="landing-auth-details">
          <div className="landing-auth-detail">
            <strong>Everything stays saved</strong>
            <span>Your profile image, folders, inbox, and media history are attached to the account you are in now.</span>
          </div>
          <div className="landing-auth-detail">
            <strong>Ready to continue</strong>
            <span>Browse takes you right back into surfacing, search, folders, and the rest of your vault without resetting your setup.</span>
          </div>
        </div>
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
      <div className="landing-auth-details">
        <div className="landing-auth-detail">
          <strong>Sign in for persistence</strong>
          <span>Your avatar, folders, inbox, and friends stay attached to your real account instead of disappearing with the browser session.</span>
        </div>
        <div className="landing-auth-detail">
          <strong>Guest mode for speed</strong>
          <span>Jump into browse instantly if you only want to test the catalog and search before committing to an account.</span>
        </div>
        <div className="landing-auth-detail">
          <strong>One vault for everything</strong>
          <span>Movies, shows, anime, and games all live in one cleaner space instead of feeling split across different tools.</span>
        </div>
      </div>
    </div>
  );
}
