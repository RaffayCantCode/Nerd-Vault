import Link from "next/link";
import { CommunityReviews } from "@/components/community-reviews";
import { getCommunityRatingSummary } from "@/lib/vault-server";
import { MediaItem } from "@/lib/types";

export default async function MediaReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; sourceId?: string; type?: string; title?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const source = (query.source ?? "local") as MediaItem["source"];
  const sourceId = query.sourceId ?? slug;
  const type = query.type ?? "movie";
  const summary = await getCommunityRatingSummary(source, sourceId, 24);
  const title = query.title ?? slug.replace(/-/g, " ");

  return (
    <main className="workspace">
      <section className="section-stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">All reviews</p>
            <h1 className="headline">{title}</h1>
          </div>
          <Link href={{ pathname: `/media/${slug}`, query: { source, sourceId, type } }} className="button button-secondary">
            Back to media
          </Link>
        </div>
        <CommunityReviews mediaTitle={title} mediaSlug={slug} source={source} sourceId={sourceId} type={type} summary={summary} />
      </section>
    </main>
  );
}
