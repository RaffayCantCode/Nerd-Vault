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
              src="https://images.unsplash.com/photo-1520034475321-cbe63696469a?auto=format&fit=crop&w=1800&q=80"
              alt="NerdVault backdrop"
              fill
              priority
              sizes="100vw"
            />
          </div>

          <div className="landing-stage-grid">
            <div className="landing-copy">
              <p className="eyebrow">NerdVault</p>
              <h1 className="display">One vault for every world you love.</h1>
              <p className="copy landing-copy-body">
                Track games, movies, series, and anime in one glass-dark hub. Smart folders, rich detail pages, and browse that ranks by your query—not just what’s trending.
              </p>
              <div className="button-row" style={{ marginTop: 24 }}>
                {isSignedIn ? (
                  <>
                    <Link href="/home" className="button button-primary">
                      Open your home hub
                    </Link>
                    <BrowseResetLink className="button button-primary">
                      Go back to browse
                    </BrowseResetLink>
                    <Link href="/support" className="button button-secondary">
                      Support
                    </Link>
                    <form action={signOutUser}>
                      <button type="submit" className="button button-secondary">
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/home" className="button button-secondary">
                      Preview the home hub
                    </Link>
                    <Link href="/sign-in" className="button button-primary">
                      Sign in and start saving
                    </Link>
                    <BrowseResetLink className="button button-secondary">
                      Try browse first
                    </BrowseResetLink>
                    <Link href="/support" className="button button-secondary">
                      Support
                    </Link>
                  </>
                )}
              </div>

              <div className="landing-metrics">
                <div className="landing-metric glass">
                  <span>Surface</span>
                  <strong>TMDB · Jikan · IGDB-backed cards</strong>
                </div>
                <div className="landing-metric glass">
                  <span>Your lane</span>
                  <strong>Watched, wishlist, custom folders</strong>
                </div>
                <div className="landing-metric glass">
                  <span>Social layer</span>
                  <strong>Friends, inbox recs, profile hub</strong>
                </div>
              </div>
            </div>

            <LandingAuthCard isSignedIn={isSignedIn} />
          </div>
        </section>
      </main>
    </div>
  );
}
