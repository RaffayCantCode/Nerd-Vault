"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  acceptFriendRequest,
  ensureViewerProfile,
  getFriends,
  markNotificationRead,
  searchProfiles,
  sendFriendRequest,
  SocialProfile,
  subscribeSocialChanges,
} from "@/lib/social-storage";

type AppTopBarProps = {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
};

export function AppTopBar({ viewerId, viewerName, viewerAvatar }: AppTopBarProps) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<SocialProfile[]>([]);

  useEffect(() => {
    function sync() {
      const profile = ensureViewerProfile(viewerId, viewerName, viewerAvatar);
      setViewerProfile(profile);
      setFriends(getFriends(viewerId));
    }

    sync();
    return subscribeSocialChanges(sync);
  }, [viewerAvatar, viewerId, viewerName]);

  const searchResults = useMemo(
    () => (query.trim() ? searchProfiles(viewerId, query).slice(0, 7) : []),
    [query, viewerId],
  );
  const inbox = viewerProfile?.inbox ?? [];
  const unreadCount = inbox.filter((notification) => notification.status === "unread").length;
  const isPanelOpen = searchOpen || inboxOpen;

  return (
    <section className={`app-topbar glass ${isPanelOpen ? "is-layered" : ""}`}>
      <div className="app-topbar-meta">
        <p className="eyebrow">Social</p>
        <p className="app-topbar-summary">People, requests, and recommendations.</p>
      </div>

      <div className="app-topbar-actions">
        <div className="topbar-search">
          <input
            className="topbar-search-input"
            type="search"
            placeholder="Search users..."
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

          {searchOpen ? (
            <div className="topbar-panel glass">
              <div className="topbar-panel-header">
                <strong>Users</strong>
                <button type="button" className="topbar-panel-close" onClick={() => setSearchOpen(false)}>
                  Close
                </button>
              </div>
              <div className="topbar-user-results">
                {searchResults.length ? (
                  searchResults.map((profile) => (
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
                      <button
                        type="button"
                        className={`button button-secondary ${friends.some((friend) => friend.id === profile.id) ? "button-accent" : ""}`}
                        onClick={() => sendFriendRequest(viewerId, profile.id)}
                      >
                        {friends.some((friend) => friend.id === profile.id) ? "Friends" : "Add"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="copy">No users found yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="topbar-inbox-shell">
          <button
            type="button"
            className="topbar-chip"
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
                  inbox.slice(0, 8).map((notification) => (
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
                            onClick={() => acceptFriendRequest(viewerId, notification.fromUserId)}
                          >
                            Accept
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => markNotificationRead(viewerId, notification.id)}
                        >
                          Mark read
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
          {viewerAvatar ? (
            <img src={viewerAvatar} alt={viewerName} className="topbar-user-avatar" />
          ) : (
            <span className="topbar-user-avatar topbar-user-avatar-fallback">
              {viewerName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="topbar-user-copy">
            <strong>{viewerName}</strong>
            <span>Profile</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
