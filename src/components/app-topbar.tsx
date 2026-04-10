"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import {
  acceptFriend,
  dismissInboxNotification,
  fetchProfilePayload,
  fetchUserSearch,
  markInboxRead,
  requestFriend,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { MediaType } from "@/lib/types";
import { SocialProfile } from "@/lib/vault-types";

type AppTopBarProps = {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  initialProfile?: SocialProfile | null;
  initialFriends?: SocialProfile[];
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

export function AppTopBar({
  viewerId,
  viewerName,
  viewerAvatar,
  initialProfile = null,
  initialFriends = [],
}: AppTopBarProps) {
  const router = useRouter();
  const isGuest = viewerId === "guest-vault";
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("media");
  const [mediaType, setMediaType] = useState<MediaType | "all">("all");
  const [showMediaTypes, setShowMediaTypes] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<SocialProfile | null>(initialProfile);
  const [friends, setFriends] = useState<SocialProfile[]>(initialFriends);
  const [userResults, setUserResults] = useState<Array<{ id: string; name: string; handle: string; avatarUrl?: string; relationship: string }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [hasLoadedSocial, setHasLoadedSocial] = useState(Boolean(initialProfile));

  useEffect(() => {
    if (isGuest) return;

    function sync() {
      fetchProfilePayload()
        .then((payload) => {
          setViewerProfile(payload.viewerProfile);
          setFriends(payload.friends);
          setHasLoadedSocial(true);
        })
        .catch(() => undefined);
    }

    const unsubscribe = subscribeVaultChanges(sync);
    if (initialProfile) {
      void sync();
    }

    return () => {
      unsubscribe();
    };
  }, [initialFriends, initialProfile, isGuest]);

  useEffect(() => {
    if (scope !== "users" || !query.trim() || isGuest) {
      setUserResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await fetchUserSearch(query);
        setUserResults(results);
      } finally {
        setSearchingUsers(false);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [isGuest, query, scope]);

  const topbarAvatar = viewerProfile?.avatarUrl || viewerAvatar;
  const topbarName = viewerProfile?.name || viewerName;
  const inbox = viewerProfile?.inbox ?? [];
  const unreadCount = inbox.filter((notification) => notification.status === "unread").length;
  const searchSummary = useMemo(() => {
    if (scope === "users") {
      return query.trim() ? `Search users for "${query}"` : "Search users";
    }

    return query.trim() ? `${mediaTypeLabel(mediaType)} for "${query}"` : `Search ${mediaTypeLabel(mediaType).toLowerCase()}`;
  }, [mediaType, query, scope]);

  function closeOverlays() {
    setInboxOpen(false);
    setProfileMenuOpen(false);
  }

  async function toggleInbox() {
    setProfileMenuOpen(false);

    if (inboxOpen) {
      setInboxOpen(false);
      return;
    }

    await ensureSocialLoaded();
    setInboxOpen(true);
  }

  async function toggleProfileMenu() {
    setInboxOpen(false);

    if (profileMenuOpen) {
      setProfileMenuOpen(false);
      return;
    }

    await ensureSocialLoaded();
    setProfileMenuOpen(true);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();

    if (scope === "users") {
      return;
    }

    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set("mediaType", mediaType);
    setShowMediaTypes(false);
    closeOverlays();
    router.push(`/browse?${params.toString()}`);
  }

  async function ensureSocialLoaded() {
    if (isGuest || hasLoadedSocial) return;
    const payload = await fetchProfilePayload();
    setViewerProfile(payload.viewerProfile);
    setFriends(payload.friends);
    setHasLoadedSocial(true);
  }

  return (
    <section className={`app-topbar glass ${(inboxOpen || profileMenuOpen) ? "is-layered" : ""}`}>
      <div className="app-topbar-meta">
        <p className="eyebrow">Vault search</p>
        <p className="app-topbar-summary">One place for media, people, and inbox.</p>
      </div>

      <div className="app-topbar-actions">
        <form className="topbar-search topbar-search-unified" onSubmit={submitSearch}>
          <div className={`topbar-search-stack ${scope === "media" && showMediaTypes ? "has-popout" : ""}`}>
            <div className="topbar-search-header">
              <div className="picker-grid topbar-search-scopes">
                <button
                  type="button"
                  className={`picker-chip ${scope === "media" ? "is-active" : ""}`}
                  onClick={() => {
                    setScope("media");
                    setShowMediaTypes((current) => !current);
                  }}
                >
                  {scope === "media" ? `Media: ${mediaTypeLabel(mediaType)}` : "Media"}
                </button>
                <button
                  type="button"
                  className={`picker-chip ${scope === "users" ? "is-active" : ""}`}
                  onClick={() => {
                    setScope("users");
                    setShowMediaTypes(false);
                  }}
                >
                  Users
                </button>
              </div>

              <input
                className="topbar-search-input topbar-search-input-centered"
                type="search"
                placeholder={scope === "media" ? "Search for media by title or keywords..." : "Search users..."}
                value={query}
                onFocus={() => closeOverlays()}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {scope === "media" && showMediaTypes ? (
              <div className="topbar-media-type-popout glass">
                {mediaSearchTypes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`picker-chip topbar-media-type-chip ${mediaType === option.value ? "is-active" : ""}`}
                    onClick={() => {
                      setMediaType(option.value);
                      setShowMediaTypes(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="topbar-search-footer">
              <p className="copy topbar-search-summary">{searchSummary}</p>
              {scope === "media" ? (
                <button type="submit" className="button button-primary topbar-search-submit">
                  Search {mediaType !== "all" ? mediaTypeLabel(mediaType) : ""}
                </button>
              ) : null}
            </div>

            {scope === "users" && query.trim() ? (
              <div className="topbar-panel glass topbar-search-results is-inline">
                <div className="topbar-panel-header">
                  <strong>Users</strong>
                </div>
                {isGuest ? (
                  <p className="copy">Sign in to search people, add friends, and use the inbox.</p>
                ) : searchingUsers ? (
                  <p className="copy">Searching...</p>
                ) : userResults.length ? (
                  <div className="topbar-user-results">
                    {userResults.map((profile) => (
                      <div key={profile.id} className="topbar-user-result">
                        <Link href={`/profile?user=${profile.id}`} className="topbar-user-result-main">
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
                    ))}
                  </div>
                ) : (
                  <p className="copy">No users found.</p>
                )}
              </div>
            ) : null}
          </div>
        </form>

        <div className="topbar-action-group">
          <Link href="/support" className="topbar-chip topbar-support-link">
            Support
          </Link>

          <div className="topbar-inbox-shell">
            <button
              type="button"
              className="topbar-chip"
              disabled={isGuest}
              onClick={() => void toggleInbox()}
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
                            <button type="button" className="button button-primary" onClick={() => void acceptFriend(notification.fromUserId)}>
                              Accept
                            </button>
                          ) : null}
                          <button type="button" className="button button-secondary" onClick={() => void markInboxRead(notification.id)}>
                            Mark read
                          </button>
                          <button type="button" className="button button-secondary" onClick={() => void dismissInboxNotification(notification.id)}>
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

          <div className="topbar-profile-shell">
            <button
              type="button"
              className="topbar-user topbar-user-button"
              title="Open profile menu"
              onClick={() => void toggleProfileMenu()}
            >
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
            </button>

            {profileMenuOpen ? (
              <div className="topbar-panel glass profile-menu-panel">
                <div className="topbar-user-results">
                  <Link href="/profile" className="button button-secondary">
                    Open profile
                  </Link>
                  {!isGuest ? (
                    <form action={signOutUser}>
                      <button type="submit" className="button button-primary topbar-menu-button">
                        Sign out
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
