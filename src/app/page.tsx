import Image from "next/image";
import Link from "next/link";
import { LandingAuthCard } from "@/components/landing-auth-card";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
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
              <div className="landing-brand-badge glass">
                <span className="landing-brand-mark">NV</span>
                <div>
                  <strong>NerdVault</strong>
                  <span>The upgraded media vault</span>
                </div>
              </div>
              <p className="eyebrow">Taste-first media library</p>
              <h1 className="display">Log what hit. Save what calls next.</h1>
              <p className="copy landing-copy-body">
                NerdVault is a cinematic media vault for games, films, series, and anime with playlist-like folders, sharper detail pages, and discovery that feels curated instead of noisy.
              </p>
              <div className="button-row" style={{ marginTop: 24 }}>
                <Link href="/sign-in" className="button button-primary">
                  Build your vault
                </Link>
                <Link href="/browse" className="button button-secondary">
                  Browse as guest
                </Link>
              </div>

              <div className="landing-metrics">
                <div className="landing-metric glass">
                  <span>Catalog</span>
                  <strong>Movies, shows, anime, games</strong>
                </div>
                <div className="landing-metric glass">
                  <span>Library</span>
                  <strong>Watched, wishlist, folders</strong>
                </div>
                <div className="landing-metric glass">
                  <span>Next</span>
                  <strong>Friends, inbox, recommendations</strong>
                </div>
              </div>
            </div>

            <LandingAuthCard />
          </div>
        </section>
      </main>
    </div>
  );
}
