import Image from "next/image";
import Link from "next/link";
import { EnhancedLink } from "@/components/enhanced-link";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { LandingAuthCard } from "@/components/landing-auth-card";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <div className="page-shell landing-page">
      <SiteHeader />

      <main className="landing-main">
        {/* Hero Section with Premium Design */}
        <section className="landing-hero">
          <div className="landing-hero-background">
            <div className="landing-hero-gradient" />
            <div className="landing-hero-pattern" />
          </div>
          
          <div className="landing-hero-content">
            <div className="landing-hero-text">
              <div className="landing-hero-badge">
                <span className="landing-badge-text">NV</span>
                <span className="landing-badge-label">NerdVault</span>
              </div>
              
              <h1 className="landing-hero-title">
                Your Universe of
                <span className="landing-hero-accent">Entertainment</span>
              </h1>
              
              <p className="landing-hero-subtitle">
                The ultimate platform for tracking, discovering, and sharing everything you love. 
                Movies, TV shows, anime, and games - all in one beautifully crafted vault.
              </p>
              
              <div className="landing-hero-stats">
                <div className="landing-stat">
                  <span className="landing-stat-number">3</span>
                  <span className="landing-stat-label">Media Sources</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat-number">4</span>
                  <span className="landing-stat-label">Content Types</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat-number">1</span>
                  <span className="landing-stat-label">Unified Experience</span>
                </div>
              </div>
              
              <div className="landing-hero-actions">
                {isSignedIn ? (
                  <div className="landing-actions-authenticated">
                    <Link href="/home" className="landing-cta landing-cta-primary">
                      Open Your Vault
                    </Link>
                    <BrowseResetLink className="landing-cta landing-cta-secondary">
                      Discover
                    </BrowseResetLink>
                  </div>
                ) : (
                  <div className="landing-actions-guest">
                    <Link href="/sign-in" className="landing-cta landing-cta-primary">
                      Start Your Collection
                    </Link>
                    <BrowseResetLink className="landing-cta landing-cta-secondary">
                      Browse Free
                    </BrowseResetLink>
                  </div>
                )}
              </div>
            </div>
            
            <div className="landing-hero-visual">
              <div className="landing-vault-icon">
                <div className="vault-ring vault-ring-outer" />
                <div className="vault-ring vault-ring-middle" />
                <div className="vault-ring vault-ring-inner" />
                <div className="vault-core">
                  <span className="vault-text">NV</span>
                </div>
              </div>
              <div className="landing-particles">
                <div className="particle particle-1" />
                <div className="particle particle-2" />
                <div className="particle particle-3" />
                <div className="particle particle-4" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-features">
          <div className="landing-features-container">
            <div className="landing-features-header">
              <h2 className="landing-features-title">Everything You Need in One Place</h2>
              <p className="landing-features-subtitle">
                Powerful features designed for entertainment enthusiasts who demand the best
              </p>
            </div>
            
            <div className="landing-features-grid">
              <div className="landing-feature-card">
                <div className="feature-icon feature-icon-database">
                  <div className="feature-icon-bg" />
                  <span className="feature-icon-symbol">Database</span>
                </div>
                <h3 className="feature-title">Rich Media Database</h3>
                <p className="feature-description">
                  Powered by TMDB, Jikan, and IGDB for comprehensive coverage across movies, shows, anime, and games
                </p>
                <div className="feature-tech">
                  <span className="tech-badge">TMDB</span>
                  <span className="tech-badge">Jikan</span>
                  <span className="tech-badge">IGDB</span>
                </div>
              </div>
              
              <div className="landing-feature-card">
                <div className="feature-icon feature-icon-organization">
                  <div className="feature-icon-bg" />
                  <span className="feature-icon-symbol">Folders</span>
                </div>
                <h3 className="feature-title">Smart Organization</h3>
                <p className="feature-description">
                  Custom folders, watched lists, and wishlist management that adapts to your preferences
                </p>
                <div className="feature-tech">
                  <span className="tech-badge">Custom</span>
                  <span className="tech-badge">Smart</span>
                  <span className="tech-badge">Flexible</span>
                </div>
              </div>
              
              <div className="landing-feature-card">
                <div className="feature-icon feature-icon-social">
                  <div className="feature-icon-bg" />
                  <span className="feature-icon-symbol">Social</span>
                </div>
                <h3 className="feature-title">Social Discovery</h3>
                <p className="feature-description">
                  Connect with friends, share recommendations, and explore collections from like-minded users
                </p>
                <div className="feature-tech">
                  <span className="tech-badge">Friends</span>
                  <span className="tech-badge">Share</span>
                  <span className="tech-badge">Discover</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TV Shows Section */}
        <section className="landing-tv-shows">
          <div className="landing-tv-shows-container">
            <div className="tv-shows-header">
              <h2 className="tv-shows-title">Your TV Show Hub</h2>
              <p className="tv-shows-subtitle">
                Track every episode, manage multiple series, and never lose your place in your favorite shows
              </p>
            </div>
            
            <div className="tv-shows-grid">
              <div className="tv-show-card tv-shows-tracking">
                <div className="tv-show-icon">
                  <div className="tv-show-icon-bg" />
                  <span className="tv-show-icon-symbol">Track</span>
                </div>
                <h3 className="tv-show-title">Episode Tracking</h3>
                <p className="tv-show-description">
                  Keep perfect track of where you are in every series with automatic progress tracking and season management
                </p>
                <div className="tv-show-features">
                  <span className="tv-show-feature">Season Progress</span>
                  <span className="tv-show-feature">Episode History</span>
                  <span className="tv-show-feature">Watch Status</span>
                </div>
              </div>
              
              <div className="tv-show-card tv-shows-discovery">
                <div className="tv-show-icon">
                  <div className="tv-show-icon-bg" />
                  <span className="tv-show-icon-symbol">Discover</span>
                </div>
                <h3 className="tv-show-title">Smart Discovery</h3>
                <p className="tv-show-description">
                  Find your next binge with AI-powered recommendations based on your viewing history and preferences
                </p>
                <div className="tv-show-features">
                  <span className="tv-show-feature">Personalized</span>
                  <span className="tv-show-feature">Trending Shows</span>
                  <span className="tv-show-feature">Genre Matching</span>
                </div>
              </div>
              
              <div className="tv-show-card tv-shows-management">
                <div className="tv-show-icon">
                  <div className="tv-show-icon-bg" />
                  <span className="tv-show-icon-symbol">Manage</span>
                </div>
                <h3 className="tv-show-title">Series Management</h3>
                <p className="tv-show-description">
                  Organize your shows with custom lists, watch queues, and smart folders for perfect content curation
                </p>
                <div className="tv-show-features">
                  <span className="tv-show-feature">Custom Lists</span>
                  <span className="tv-show-feature">Watch Queue</span>
                  <span className="tv-show-feature">Smart Folders</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Section */}
        <section className="landing-platforms">
          <div className="landing-platforms-container">
            <div className="platforms-header">
              <h2 className="platforms-title">For Every Type of Fan</h2>
              <p className="platforms-subtitle">
                Tailored experiences for different entertainment preferences
              </p>
            </div>
            
            <div className="platforms-grid">
              <div className="platform-card platform-movies">
                <div className="platform-icon">films</div>
                <h3 className="platform-title">Movie & TV Fans</h3>
                <p className="platform-description">
                  Track your watch history, create custom lists, and discover new shows with intelligent recommendations
                </p>
                <div className="platform-features">
                  <span className="platform-feature">Watch Tracking</span>
                  <span className="platform-feature">Smart Lists</span>
                  <span className="platform-feature">AI Recommendations</span>
                </div>
              </div>
              
              <div className="platform-card platform-anime">
                <div className="platform-icon">anime</div>
                <h3 className="platform-title">Anime Enthusiasts</h3>
                <p className="platform-description">
                  Organize your anime collection, follow series progress, and connect with fellow anime fans
                </p>
                <div className="platform-features">
                  <span className="platform-feature">Series Tracking</span>
                  <span className="platform-feature">Episode Progress</span>
                  <span className="platform-feature">Community</span>
                </div>
              </div>
              
              <div className="platform-card platform-games">
                <div className="platform-icon">games</div>
                <h3 className="platform-title">Gamers</h3>
                <p className="platform-description">
                  Log your gaming journey, manage your backlog, and discover new games across all platforms
                </p>
                <div className="platform-features">
                  <span className="platform-feature">Game Library</span>
                  <span className="platform-feature">Backlog Management</span>
                  <span className="platform-feature">Cross-Platform</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-cta">
          <div className="landing-cta-container">
            <div className="cta-content">
              <h2 className="cta-title">Ready to Build Your Collection?</h2>
              <p className="cta-subtitle">
                Join thousands of entertainment enthusiasts who've already discovered the better way to track their media
              </p>
              
              <div className="cta-actions">
                {isSignedIn ? (
                  <div className="cta-authenticated">
                    <Link href="/home" className="cta-button cta-primary">
                      Open Your Vault
                    </Link>
                    <Link href="/profile" className="cta-button cta-secondary">
                      View Profile
                    </Link>
                  </div>
                ) : (
                  <div className="cta-guest">
                    <Link href="/sign-in" className="cta-button cta-primary">
                      Get Started Free
                    </Link>
                    <BrowseResetLink className="cta-button cta-secondary">
                      Try Demo
                    </BrowseResetLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-footer-container">
            <div className="landing-footer-brand">
              <span className="landing-footer-logo">NV</span>
              <span className="landing-footer-name">NerdVault</span>
            </div>
            <p className="landing-footer-copy">
              Your universe of entertainment. Movies, TV shows, anime, and games — all in one vault.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
