"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { MobileInstallButton } from "@/components/mobile-install-button";
import { ChevronDown, LogOut, X } from "lucide-react";
import {
  acceptFriend,
  declineFriend,
  dismissInboxNotification,
  fetchFriendSuggestions,
  fetchProfilePayload,
  fetchUserSearch,
  markInboxRead,
  requestFriend,
  subscribeVaultChanges,
} from "@/lib/vault-client";
import { SocialProfile } from "@/lib/vault-types";
import { GuestAuthPrompt } from "@/components/guest-auth-prompt";
import { guestSignInHref, isGuestViewer } from "@/lib/guest";

type AppTopBarProps = {
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  initialProfile?: SocialProfile | null;
  initialFriends?: SocialProfile[];
  redirectTo?: string;
}

export const AppTopBar = memo(function AppTopBar({
  viewerId,
  viewerName,
  viewerAvatar,
  initialProfile = null,
  initialFriends = [],
  redirectTo,
}: AppTopBarProps) {
  const isGuest = isGuestViewer(viewerId);
  const pathname = usePathname();

  const currentPath = redirectTo || pathname;
  const [query, setQuery] = useState("");
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const [guestPromptCopy, setGuestPromptCopy] = useState({ title: "Sign in required", message: "Sign in to use this feature." });
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<SocialProfile | null>(initialProfile);
  const [friends, setFriends] = useState<SocialProfile[]>(initialFriends);
  const [userResults, setUserResults] = useState<Array<{ id: string; name: string; handle: string; avatarUrl?: string; relationship: string }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [hasLoadedSocial, setHasLoadedSocial] = useState(Boolean(initialProfile));
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; handle: string; avatarUrl?: string; mutualCount: number }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    setViewerProfile(initialProfile);
    setFriends(initialFriends);
    setHasLoadedSocial(Boolean(initialProfile));
  }, [initialFriends, initialProfile]);

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
    if (!initialProfile) {
      void sync();
    }

    return () => {
      unsubscribe();
    };
  }, [initialFriends, initialProfile, isGuest]);

  useEffect(() => {
    if (!query.trim() || isGuest) {
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
  }, [isGuest, query]);

  const topbarAvatar = viewerProfile?.avatarUrl || viewerAvatar;
  const topbarName = viewerProfile?.name || viewerName;
  const inbox = useMemo(() => viewerProfile?.inbox ?? [], [viewerProfile?.inbox]);
  const unreadCount = useMemo(() => inbox.filter((notification) => notification.status === "unread").length, [inbox]);

  function closeOverlays() {
    setInboxOpen(false);
    setProfileMenuOpen(false);
  }

  function openGuestPrompt(title: string, message: string) {
    setGuestPromptCopy({ title, message });
    setGuestPromptOpen(true);
    setInboxOpen(false);
    setProfileMenuOpen(false);
  }

  async function toggleInbox() {
    setProfileMenuOpen(false);

    if (isGuest) {
      openGuestPrompt("Inbox requires sign-in", "Sign in to receive recommendations, friend requests, and inbox updates.");
      return;
    }

    if (inboxOpen) {
      setInboxOpen(false);
      return;
    }

    await ensureSocialLoaded();
    setInboxOpen(true);
  }

  async function toggleProfileMenu() {
    setInboxOpen(false);

    if (isGuest) {
      openGuestPrompt("Sign in to use the vault menu", "Sign in to manage your profile, settings, and friends.");
      return;
    }

    setProfileMenuOpen(!profileMenuOpen);

    if (!profileMenuOpen && !suggestions.length && !suggestionsLoading) {
      setSuggestionsLoading(true);
      try {
        const results = await fetchFriendSuggestions();
        setSuggestions(results);
      } catch {
        // silently ignore
      } finally {
        setSuggestionsLoading(false);
      }
    }
  }

  async function ensureSocialLoaded() {
    if (isGuest || hasLoadedSocial) return;
    const payload = await fetchProfilePayload();
    setViewerProfile(payload.viewerProfile);
    setFriends(payload.friends);
    setHasLoadedSocial(true);
  }

  return (
    <section className={`app-topbar glass ${(inboxOpen || profileMenuOpen || guestPromptOpen) ? "is-layered" : ""}`}>
      <div className="app-topbar-meta">
        <p className="eyebrow">Vault hub</p>
        <p className="app-topbar-summary">Your library, inbox, and friends stay close without getting in the way.</p>
      </div>

      <div className="app-topbar-actions">
        <div className="topbar-search topbar-people-search">
          <input
            className="topbar-search-input topbar-search-input-centered"
            type="search"
            placeholder="Search people..."
            value={query}
            onFocus={() => {
              closeOverlays();
              if (isGuest) {
                openGuestPrompt("Search people after sign-in", "Sign in to find friends, send requests, and manage your network.");
              }
            }}
            onChange={(event) => setQuery(event.target.value)}
          />

          {query.trim() ? (
            <div className="topbar-panel glass topbar-search-results is-inline">
              <div className="topbar-panel-header">
                <strong>People</strong>
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
                          <img src={profile.avatarUrl} alt={profile.name} className="topbar-user-avatar" loading="lazy" decoding="async" />
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

        <div className="topbar-action-group">
          <MobileInstallButton />

          <Link href="/support" className="topbar-chip topbar-support-link">
            Support
          </Link>

          <div className="topbar-inbox-shell">
            <button type="button" className="topbar-chip" onClick={() => void toggleInbox()}>
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
                          {notification.ratingSnapshot ? <span>{`${"★".repeat(notification.ratingSnapshot)}${"☆".repeat(5 - notification.ratingSnapshot)}`}</span> : null}
                        </div>
                        <div className="topbar-inbox-actions">
                          {notification.type === "friend-request" ? (
                            <>
                              <button type="button" className="button button-primary" onClick={() => void acceptFriend(notification.fromUserId)}>
                                Accept
                              </button>
                              <button type="button" className="button button-secondary" onClick={() => void declineFriend(notification.fromUserId)}>
                                Decline
                              </button>
                            </>
                          ) : null}
                          <button type="button" className="button button-secondary" onClick={() => void markInboxRead(notification.id)}>
                            Mark read
                          </button>
                          <button type="button" className="button button-secondary" onClick={() => void dismissInboxNotification(notification.id)}>
                            Dismiss
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
              title="Open vault menu"
              onClick={() => void toggleProfileMenu()}
            >
              {topbarAvatar ? (
                <img src={topbarAvatar} alt={topbarName} className="topbar-user-avatar" decoding="async" />
              ) : (
                <span className="topbar-user-avatar topbar-user-avatar-fallback">
                  {topbarName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="topbar-user-copy">
                <strong>{topbarName}</strong>
                <span>{isGuest ? "Guest" : `@${viewerProfile?.handle ? viewerProfile.handle.replace(/^@/, '') : 'vault'}`}</span>
              </div>
              <ChevronDown size={14} style={{ color: "rgba(226, 232, 240, 0.6)", marginLeft: "0.2rem" }} />
            </button>

            {profileMenuOpen ? (
              <div className="topbar-panel glass profile-menu-panel">
                <div className="topbar-user-results" style={{ display: 'grid', gap: 10 }}>
                  <Link href="/home?tab=media" className="button button-secondary" style={{ width: '100%' }} onClick={() => setProfileMenuOpen(false)}>
                    Open Vault
                  </Link>
                  {isGuest ? (
                    <>
                      <Link href={guestSignInHref(currentPath)} className="button button-primary" style={{ width: "100%" }} onClick={() => setProfileMenuOpen(false)}>
                        Sign in
                      </Link>
                      <Link href="/browse" className="button button-secondary" style={{ width: "100%" }} onClick={() => setProfileMenuOpen(false)}>
                        Browse as guest
                      </Link>
                    </>
                  ) : (
                    <>
                      {suggestions.length > 0 ? (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, display: "grid", gap: 8 }}>
                          <p className="sort-label" style={{ margin: 0 }}>People you may know</p>
                          {suggestions.map((s) => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                              {s.avatarUrl ? (
                                <img src={s.avatarUrl} alt={s.name} style={{ width: 28, height: 28, borderRadius: "50%" }} />
                              ) : (
                                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: "0.75rem" }}>
                                  {s.name.charAt(0)}
                                </span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <strong style={{ fontSize: "0.85rem" }}>{s.name}</strong>
                                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>{s.mutualCount} mutual friend{s.mutualCount !== 1 ? "s" : ""}</span>
                              </div>
                              <button type="button" className="button button-primary" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => { void requestFriend(s.id); setSuggestions((prev) => prev.filter((x) => x.id !== s.id)); }}>
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ width: "100%", color: "#ef4444" }}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setConfirmSignOutOpen(true);
                        }}
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {confirmSignOutOpen && typeof document !== "undefined" && createPortal(
        <div className="nv-confirm-modal-overlay" onClick={() => setConfirmSignOutOpen(false)} role="dialog" aria-modal="true">
          <div className="nv-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="nv-confirm-modal-title">Sign Out</h3>
              <button
                type="button"
                className="taste-search-close"
                onClick={() => setConfirmSignOutOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="nv-confirm-modal-copy">
              Are you sure you want to sign out of your NerdVault account?
            </p>
            <div className="nv-confirm-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setConfirmSignOutOpen(false)}
              >
                Cancel
              </button>
              <form action={signOutUser} style={{ flex: 1 }}>
                <button
                  type="submit"
                  className="button button-primary"
                  style={{ width: "100%", background: "#ef4444", borderColor: "#ef4444" }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
      <GuestAuthPrompt
        isOpen={guestPromptOpen}
        title={guestPromptCopy.title}
        message={guestPromptCopy.message}
        redirectTo={currentPath}
        onClose={() => setGuestPromptOpen(false)}
      />
    </section>
  );
});


