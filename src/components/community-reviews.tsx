"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { CommunityRatingSummary } from "@/lib/vault-types";

type VoteState = Record<string, "like" | "dislike" | undefined>;

function renderStars(rating: number | null) {
  if (!rating) return "Unrated";
  return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}`;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function reviewPreview(text?: string) {
  if (!text) return "Logged without a written review.";
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
}

export function CommunityReviews({
  mediaTitle,
  mediaSlug,
  source,
  sourceId,
  type,
  summary,
}: {
  mediaTitle: string;
  mediaSlug: string;
  source: string;
  sourceId: string;
  type: string;
  summary: CommunityRatingSummary;
}) {
  const storageKey = `nerdvault-review-votes:${mediaSlug}`;
  const [votes, setVotes] = useState<VoteState>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setVotes(stored ? JSON.parse(stored) as VoteState : {});
    } catch {
      setVotes({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(votes));
    } catch {
      return;
    }
  }, [storageKey, votes]);

  const communityScore = summary.average ? summary.average.toFixed(1) : "NR";
  const topReviews = useMemo(() => summary.reviews.slice(0, 3), [summary.reviews]);

  function vote(reviewId: string, nextVote: "like" | "dislike") {
    setVotes((current) => ({
      ...current,
      [reviewId]: current[reviewId] === nextVote ? undefined : nextVote,
    }));
  }

  return (
    <section id="detail-reviews" className="section-stack" style={{ paddingTop: 0 }}>
      <div className="community-reviews-shell glass">
        <div className="community-reviews-head">
          <div>
            <p className="eyebrow">NerdVault Community Rating</p>
            <h2 className="headline">{communityScore}{summary.average ? " / 5" : ""}</h2>
            <p className="copy">
              {summary.count
                ? `${summary.count} community rating${summary.count === 1 ? "" : "s"} for ${mediaTitle}.`
                : "Ratings from NerdVault members will appear here once people log this title."}
            </p>
          </div>
          <Link href={{ pathname: `/media/${mediaSlug}/reviews`, query: { source, sourceId, type } }} className="button button-secondary">
            View More Reviews
          </Link>
        </div>

        {topReviews.length ? (
          <div className="community-review-list">
            {topReviews.map((review) => {
              const currentVote = votes[review.id];
              const likeCount = review.likeCount + (currentVote === "like" ? 1 : 0);
              const dislikeCount = review.dislikeCount + (currentVote === "dislike" ? 1 : 0);

              return (
                <article key={review.id} className="community-review-card">
                  <div className="community-review-meta">
                    {review.userAvatarUrl ? (
                      <img src={review.userAvatarUrl} alt={review.username} className="folder-row-avatar" />
                    ) : (
                      <span className="folder-row-avatar folder-row-avatar-fallback">{review.username.charAt(0).toUpperCase()}</span>
                    )}
                    <div>
                      <strong>{review.username}</strong>
                      <span>{review.userHandle} · {formatDate(review.datePosted)}</span>
                    </div>
                    <span className="community-review-rating">{renderStars(review.rating)}</span>
                  </div>
                  {review.title ? <h3>{review.title}</h3> : null}
                  <p className="copy">{reviewPreview(review.text)}</p>
                  <div className="community-review-actions">
                    <button type="button" className={`icon-chip ${currentVote === "like" ? "is-active" : ""}`} onClick={() => vote(review.id, "like")}>
                      <ThumbsUp size={15} />
                      {likeCount}
                    </button>
                    <button type="button" className={`icon-chip ${currentVote === "dislike" ? "is-active" : ""}`} onClick={() => vote(review.id, "dislike")}>
                      <ThumbsDown size={15} />
                      {dislikeCount}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="folder-empty">
            <p className="headline">No community reviews yet.</p>
            <p className="copy">Be the first to log it with a rating or review.</p>
          </div>
        )}
      </div>
    </section>
  );
}
