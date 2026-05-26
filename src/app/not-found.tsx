import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="workspace detail-error-shell">
        <section className="feature-block glass detail-error-card">
          <p className="eyebrow">Page not found</p>
          <h1 className="headline">Nothing lives here.</h1>
          <p className="copy">
            The URL you followed does not match any page on NerdVault. Check the address or head back to browse.
          </p>
          <div className="button-row">
            <Link href="/browse" className="button button-primary">
              Back to browse
            </Link>
            <Link href="/" className="button button-secondary">
              Visit home page
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
