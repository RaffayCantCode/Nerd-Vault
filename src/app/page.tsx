import Image from "next/image";
import Link from "next/link";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { LandingAuthCard } from "@/components/landing-auth-card";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="container landing-shell">
        <section className="landing-stage glass">
          <div className="landing-stage-media">
            <Image
              src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1800&q=80"
              alt="NerdVault backdrop - Entertainment collection"
              fill
              priority
              sizes="100vw"
            />
          </div>

          <div className="landing-stage-grid">
            <div className="landing-copy">
              <div className="landing-brand">
                <p className="eyebrow">Welcome to</p>
                <h1 className="display">NerdVault</h1>
              </div>
              
              <p className="copy landing-tagline">
                Your personal universe of entertainment. Track, discover, and share everything you love.
              </p>
              
              <p className="copy landing-description">
                Unify your movie, TV show, anime, and game collections in one beautiful hub. Smart folders, detailed insights, and intelligent recommendations powered by TMDB, Jikan, and IGDB.
              </p>

              <div className="landing-cta-section">
                {isSignedIn ? (
                  <div className="landing-cta-signed-in">
                    <h2 className="landing-welcome-back">Welcome back!</h2>
                    <p className="copy landing-user-message">Continue your entertainment journey</p>
                    <div className="button-row landing-primary-actions">
                      <Link href="/home" className="button button-primary landing-cta-primary">
                        Open Your Vault
                      </Link>
                      <BrowseResetLink className="button button-secondary landing-cta-secondary">
                        Discover New Content
                      </BrowseResetLink>
                    </div>
                    <div className="landing-secondary-actions">
                      <Link href="/profile" className="button button-ghost">
                        Your Profile
                      </Link>
                      <Link href="/support" className="button button-ghost">
                        Help & Support
                      </Link>
                      <form action={signOutUser}>
                        <button type="submit" className="button button-ghost">
                          Sign Out
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="landing-cta-guest">
                    <div className="button-row landing-primary-actions">
                      <Link href="/sign-in" className="button button-primary landing-cta-primary">
                        Start Your Collection
                      </Link>
                      <BrowseResetLink className="button button-secondary landing-cta-secondary">
                        Browse Without Account
                      </BrowseResetLink>
                    </div>
                    <div className="landing-secondary-actions">
                      <Link href="/home" className="button button-ghost">
                        Preview Features
                      </Link>
                      <Link href="/support" className="button button-ghost">
                        Learn More
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="landing-features">
                <div className="landing-feature">
                  <div className="landing-feature-icon"> films</div>
                  <h3 className="landing-feature-title">Rich Media Database</h3>
                  <p className="copy landing-feature-desc">Powered by TMDB, Jikan, and IGDB for comprehensive coverage</p>
                </div>
                <div className="landing-feature">
                  <div className="landing-feature-icon"> folders</div>
                  <h3 className="landing-feature-title">Smart Organization</h3>
                  <p className="copy landing-feature-desc">Custom folders, watched lists, and wishlist management</p>
                </div>
                <div className="landing-feature">
                  <div className="landing-feature-icon"> users</div>
                  <h3 className="landing-feature-title">Social Discovery</h3>
                  <p className="copy landing-feature-desc">Connect with friends, share recommendations, and explore collections</p>
                </div>
              </div>
            </div>

            <LandingAuthCard isSignedIn={isSignedIn} />
          </div>
        </section>

        <section className="landing-info-section">
          <div className="landing-info-grid">
            <div className="landing-info-card glass">
              <h3 className="landing-info-title">For Movie & TV Fans</h3>
              <p className="copy">Track your watch history, create custom lists, and discover new shows with intelligent recommendations.</p>
            </div>
            <div className="landing-info-card glass">
              <h3 className="landing-info-title">For Anime Enthusiasts</h3>
              <p className="copy">Organize your anime collection, follow series progress, and connect with fellow anime fans.</p>
            </div>
            <div className="landing-info-card glass">
              <h3 className="landing-info-title">For Gamers</h3>
              <p className="copy">Log your gaming journey, manage your backlog, and discover new games across all platforms.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
