"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NVLoader } from "@/components/nv-loader";
import { SafeImg } from "@/components/safe-img";
import { fetchFriendActivity, FriendActivityEntry } from "@/lib/vault-client";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="activity-rating" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`activity-star ${i < rating ? "filled" : ""}`}>&#9733;</span>
      ))}
    </span>
  );
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function ActivityCard({ entry }: { entry: FriendActivityEntry }) {
  const mediaLink = entry.media ? `/media/${entry.media.slug}` : "#";

  return (
    <div className="activity-card glass">
      <div className="activity-card-header">
        <Link href={`/home?user=${entry.friendId}`} className="activity-friend-link">
          {entry.friendAvatar ? (
            <img src={entry.friendAvatar} alt="" className="activity-avatar" />
          ) : (
            <div className="activity-avatar activity-avatar-placeholder">
              {entry.friendName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="activity-friend-name">{entry.friendName}</span>
        </Link>
        <span className="activity-time">{formatTimeAgo(entry.createdAt)}</span>
      </div>

      <div className="activity-card-body">
        {entry.type === "watched" ? (
          <>
            <p className="activity-action">
              {entry.rating ? "Watched and rated" : "Watched"}{" "}
              <Link href={mediaLink} className="activity-media-link">
                {entry.media?.title ?? "Unknown title"}
              </Link>
            </p>
            {entry.media?.coverUrl && (
              <Link href={mediaLink} className="activity-cover-link">
                <SafeImg
                  src={entry.media.coverUrl}
                  alt={entry.media?.title ?? ""}
                  className="activity-cover"
                />
              </Link>
            )}
            {entry.rating != null && (
              <div className="activity-rating-row">
                <StarRating rating={entry.rating} />
              </div>
            )}
            {entry.notes && (
              <p className="activity-notes">&ldquo;{entry.notes}&rdquo;</p>
            )}
          </>
        ) : (
          <>
            <p className="activity-action">
              Added{" "}
              <Link href={mediaLink} className="activity-media-link">
                {entry.media?.title ?? "Unknown title"}
              </Link>{" "}
              to folder{" "}
              <Link href={`/home?folder=${entry.folderSlug}&user=${entry.friendId}`} className="activity-folder-link">
                {entry.folderName ?? "a folder"}
              </Link>
            </p>
            {entry.media?.coverUrl && (
              <Link href={mediaLink} className="activity-cover-link">
                <SafeImg
                  src={entry.media.coverUrl}
                  alt={entry.media?.title ?? ""}
                  className="activity-cover"
                />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<FriendActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchFriendActivity()
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="activity-feed-section">
        <h1 className="activity-feed-title display">Friend Activity</h1>
        <NVLoader compact label="Loading activity..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="activity-feed-section">
        <h1 className="activity-feed-title display">Friend Activity</h1>
        <p className="activity-empty">Could not load activity. Try again later.</p>
      </section>
    );
  }

  return (
    <section className="activity-feed-section">
      <h1 className="activity-feed-title display">Friend Activity</h1>
      {entries.length === 0 ? (
        <p className="activity-empty">
          No recent activity from your friends.{" "}
          <Link href="/friends" className="activity-link">Find friends to follow</Link>
        </p>
      ) : (
        <div className="activity-feed-list">
          {entries.map((entry) => (
            <ActivityCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
