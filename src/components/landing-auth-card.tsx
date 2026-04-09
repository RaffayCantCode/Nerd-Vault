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
        <LandingFeatureCarousel isSignedIn={false} />
      </div>
  );
}
