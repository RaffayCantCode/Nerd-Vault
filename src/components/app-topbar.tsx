"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { MediaItem, MediaType } from "@/lib/types";
import {
  acceptFriend,
  dismissInboxNotification,
  fetchProfilePayload,
  fetchUserSearch,
  markInboxRead,
  requestFriend,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { SocialProfile } from "@/lib/vault-types";

type AppTopBarProps = {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
};

type SearchScope = "media" | "users";

const mediaSearchTypes: Array<{ value: MediaType | "all"; label: string }> = [
  { value: "all", label: "All media" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "Shows" },
  { value: "anime", label: "Anime" },
  { value: "game", label: "Games" },
];

function mediaTypeLabel(value: MediaType | "all") {
  return mediaSearchTypes.find((option) => option.value === value)?.label ?? "All media";
}

export function AppTopBar({ viewerId, viewerName, viewerAvatar }: AppTopBarProps) {
  const router = useRouter();
  const isGuest = viewerId === "guest-vault";
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("media");
  const [mediaType, setMediaType] = useState<MediaType | "all">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [userResults, setUserResults] = useState<Array<{ id: string; name: string; handle: string; avatarUrl?: string; relationship: string }>>([]);
  const [mediaResults, setMediaResults] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setViewerProfile(null);
      setFriends([]);
      return;
    }

    function sync() {
      fetchProfilePayload()
        .then((payload) => {
          setViewerProfile(payload.viewerProfile);
          setFriends(payload.friends);
        })
        .catch(() => {
          setViewerProfile(null);
          setFriends([]);
        });
    }

    sync();
    return subscribeVaultChanges(sync);
  }, [isGuest]);

  useEffect(() => {
    if (!searchOpen || !query.trim()) {
      setUserResults([]);
      setMediaResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (scope === "users") {
          if (isGuest) {
            setUserResults([]);
            return;
          }
          const results = await fetchUserSearch(query);
          if (!controller.signal.aborted) {
            setUserResults(results);
            setMediaResults([]);
          }
          return;
        }

        const params = new URLSearchParams({
          query: query.trim(),
          type: mediaType,
          page: "1",
          sort: "rating",
          seed: "1",
        });
        const response = await fetch(`/api/catalog/browse?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!controller.signal.aborted) {
          setMediaResults(Array.isArray(payload.items) ? payload.items.slice(0, 6) : []);
          setUserResults([]);
        }
      } catch {
        if (!controller.signal.aborted) {
          setUserResults([]);
          setMediaResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isGuest, mediaType, query, scope, searchOpen]);

  const inbox = viewerProfile?.inbox ?? [];
  const unreadCount = inbox.filter((notification) => notification.status === "unread").length;
  const topbarAvatar = viewerProfile?.avatarUrl || viewerAvatar;
  const topbarName = viewerProfile?.name || viewerName;
  const searchResultsTitle = useMemo(() => {
    if (!query.trim()) {
      return scope === "media" ? "Search media" : "Search users";
    }

    return scope === "media" ? `Media results for "${query}"` : `Users for "${query}"`;
  }, [query, scope]);

  function submitMediaSearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set("mediaType", mediaType);
    setSearchOpen(false);
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <section className={`app-topbar glass ${searchOpen || inboxOpen ? "is-layered" : ""}`}>
      <div className="app-topbar-meta">
        <p className="eyebrow">Vault search</p>
        <p className="app-topbar-summary">One place for media, people, and inbox.</p>
      </div>

      <div className="app-topbar-actions">
        <form className="topbar-search topbar-search-unified" onSubmit={submitMediaSearch}>
          <div className="topbar-search-shell">
            <div className="picker-grid topbar-search-scopes">
              <button
                type="button"
                className={`picker-chip ${scope === "media" ? "is-active" : ""}`}
                onClick={() => setScope("media")}
              >
                Media
              </button>
              <button
                type="button"
                className={`picker-chip ${scope === "users" ? "is-active" : ""}`}
                onClick={() => setScope("users")}
              >
                Users
              </button>
            </div>

            {scope === "media" ? (
              <div className="topbar-media-type-row" aria-label="Media type">
                {mediaSearchTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`picker-chip topbar-media-type-chip ${mediaType === option.value ? "is-active" : ""}`}
                    onClick={() => setMediaType(option.value)}
                    title={option.label}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <input
              className="topbar-search-input topbar-search-input-centered"
              type="search"
              placeholder={scope === "media" ? "Search for media by title or keywords..." : "Search users..."}
              value={query}
              onFocus={() => {
                setSearchOpen(true);
                setInboxOpen(false);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
                setInboxOpen(false);
              }}
            />

            {scope === "media" ? (
              <button type="submit" className="button button-primary">
                Search {mediaType !== "all" ? mediaTypeLabel(mediaType) : ""}
              </button>
            ) : null}
          </div>

          {searchOpen ? (
            <div className="topbar-panel glass topbar-search-results">
              <div className="topbar-panel-header">
                <strong>{searchResultsTitle}</strong>
                <button type="button" className="topbar-panel-close" onClick={() => setSearchOpen(false)}>
                  Close
                </button>
              </div>

              {!query.trim() ? (
                <p className="copy">Choose a scope, type what you want, and results will show here.</p>
              ) : isGuest && scope === "users" ? (
                <p className="copy">Sign in to search people, add friends, and use the inbox.</p>
              ) : searching ? (
                <p className="copy">Searching...</p>
              ) : scope === "users" ? (
                <div className="topbar-user-results">
                  {userResults.length ? (
                    userResults.map((profile) => (
                      <div key={profile.id} className="topbar-user-result">
                        <Link href={`/profile?user=${profile.id}`} className="topbar-user-result-main" onClick={() => setSearchOpen(false)}>
                          {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.name} className="topbar-user-avatar" />
                          ) : (
                            <span className="topbar-user-avatar topbar-user-avatar-fallback">
                              {profile.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="topbar-user-copy">
                            <strong>{profile.name}</strong>
                            <span>{profile.handle}</span>
                          </div>
                        </Link>
                        {profile.relationship === "friend" ? (
                          <button type="button" className="button button-secondary button-accent" disabled>
                            Friends
                          </button>
                        ) : profile.relationship === "outgoing" ? (
                          <button type="button" className="button button-secondary" disabled>
                            Sent
                          </button>
                        ) : profile.relationship === "incoming" ? (
                          <button type="button" className="button button-primary" onClick={() => void acceptFriend(profile.id)}>
                            Accept
                          </button>
                        ) : (
                          <button type="button" className="button button-secondary" onClick={() => void requestFriend(profile.id)}>
                            Add
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="copy">No users found.</p>
                  )}
                </div>
              ) : (
                <div className="catalog-grid topbar-media-grid">
                  {mediaResults.length ? (
                    mediaResults.map((item) => <CatalogCard key={item.id} item={item} />)
                  ) : (
                    <p className="copy">No media matched that search strongly enough. Try different keywords.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </form>

        <div className="topbar-inbox-shell">
          <button
            type="button"
            className="topbar-chip"
            disabled={isGuest}
            onClick={() => {
              setInboxOpen((current) => !current);
              setSearchOpen(false);
            }}
          >
            Inbox {unreadCount ? `(${unreadCount})` : ""}
          </button>

          {inboxOpen ? (
            <div className="topbar-panel glass inbox-panel">
              <div className="topbar-panel-header">
                <strong>Inbox</strong>
                <button type="button" className="topbar-panel-close" onClick={() => setInboxOpen(false)}>
                  Close
                </button>
              </div>
              <div className="topbar-inbox-list">
                {inbox.length ? (
                  inbox.slice(0, 12).map((notification) => (
                    <div key={notification.id} className="topbar-inbox-item">
                      <div className="topbar-inbox-copy">
                        <strong>{notification.message}</strong>
                        {notification.media ? <span>{notification.media.title}</span> : <span>{notification.type}</span>}
                      </div>
                      <div className="topbar-inbox-actions">
                        {notification.type === "friend-request" ? (
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => void acceptFriend(notification.fromUserId)}
                          >
                            Accept
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => void markInboxRead(notification.id)}
                        >
                          Mark read
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          aria-label="Dismiss notification"
                          onClick={() => void dismissInboxNotification(notification.id)}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="copy">Nothing new yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Link href="/profile" className="topbar-user" title="Open profile">
          {topbarAvatar ? (
            <img src={topbarAvatar} alt={topbarName} className="topbar-user-avatar" />
          ) : (
            <span className="topbar-user-avatar topbar-user-avatar-fallback">
              {topbarName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="topbar-user-copy">
            <strong>{topbarName}</strong>
            <span>{isGuest ? "Guest mode" : `${friends.length} friends`}</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
