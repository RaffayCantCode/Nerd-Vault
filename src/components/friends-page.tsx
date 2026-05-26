"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { NVLoader } from "@/components/nv-loader";
import {
  fetchFriendsData,
  requestFriend,
  removeFriend,
  fetchFriendSuggestions,
} from "@/lib/vault-client";

type FriendProfile = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
};

type Suggestion = FriendProfile & { mutualCount: number };

export function FriendsPage() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([fetchFriendsData(), fetchFriendSuggestions()])
      .then(([data, sug]) => {
        if (!cancelled) {
          setFriends(data.friends);
          setSuggestions(data.suggestions.length > 0 ? data.suggestions : sug);
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

  async function handleUnfriend(friendId: string) {
    try {
      await removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch {}
  }

  async function handleAddFriend(targetId: string) {
    try {
      await requestFriend(targetId);
      setSuggestions((prev) => prev.filter((s) => s.id !== targetId));
    } catch {}
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <section className="friends-page">
      <h1 className="display friends-title">Friends</h1>

      <form className="friends-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          className="friends-search-input"
          placeholder="Search users by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="button button-secondary friends-search-btn" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="friends-search-results glass">
          <h2 className="friends-subtitle">Search Results</h2>
          <div className="friends-grid">
            {searchResults.map((user) => (
              <div key={user.id} className="friend-card glass">
                <Link href={`/home?user=${user.id}`} className="friend-card-link">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="friend-avatar" />
                  ) : (
                    <div className="friend-avatar friend-avatar-placeholder">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="friend-name">{user.name}</span>
                </Link>
                {friendIds.has(user.id) ? (
                  <span className="friend-status-badge">Friend</span>
                ) : (
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => handleAddFriend(user.id)}
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="friends-sections">
        <div className="friends-section">
          <h2 className="friends-subtitle">
            Your Friends ({friends.length})
          </h2>
          {loading ? (
            <NVLoader compact label="Loading friends..." />
          ) : error ? (
            <p className="friends-empty">Could not load friends.</p>
          ) : friends.length === 0 ? (
            <p className="friends-empty">
              You haven&apos;t added any friends yet. Search for users above or check suggestions below.
            </p>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-card glass">
                  <Link href={`/home?user=${friend.id}`} className="friend-card-link">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="friend-avatar" />
                    ) : (
                      <div className="friend-avatar friend-avatar-placeholder">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="friend-name">{friend.name}</span>
                  </Link>
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={() => handleUnfriend(friend.id)}
                  >
                    Unfriend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="friends-section">
          <h2 className="friends-subtitle">People You May Know</h2>
          {suggestions.length === 0 ? (
            <p className="friends-empty">No suggestions right now. Invite more friends!</p>
          ) : (
            <div className="friends-grid">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="friend-card glass">
                  <Link href={`/home?user=${suggestion.id}`} className="friend-card-link">
                    {suggestion.avatarUrl ? (
                      <img src={suggestion.avatarUrl} alt="" className="friend-avatar" />
                    ) : (
                      <div className="friend-avatar friend-avatar-placeholder">
                        {suggestion.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="friend-name">{suggestion.name}</span>
                    {suggestion.mutualCount > 0 && (
                      <span className="friend-mutual">{suggestion.mutualCount} mutual friend{suggestion.mutualCount !== 1 ? "s" : ""}</span>
                    )}
                  </Link>
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => handleAddFriend(suggestion.id)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
