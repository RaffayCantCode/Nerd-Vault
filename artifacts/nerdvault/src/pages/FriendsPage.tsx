import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Heart, Check, Users, Sparkles, UserPlus, Search, UserCheck, Loader2, ArrowRight } from "lucide-react";
import { api, FriendRecommendation, UserProfile } from "../lib/api";
import { Avatar } from "../components/common/Avatar";
import { SectionHeading } from "../components/common/SectionHeading";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";

export default function FriendsPage() {
  const { user, openAuthModal } = useAuth();
  const { notify, trackMedia } = useVault();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [activity, setActivity] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<FriendRecommendation[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
  const [inviteCopied, setInviteCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSocialActivity().then((res) => setActivity(res?.activity || [])).catch(() => {}),
      api.getRecommendations().then((res) => setRecommendations(res?.recommendations || [])).catch(() => {}),
      api.getFriends().then((res) => {
        if (res?.friends) setFriends(res.friends);
        if (res?.suggested) setSuggestedUsers(res.suggested);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  // Live user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      api.searchUsers(searchQuery.trim())
        .then((res) => {
          setSearchResults(res?.users || []);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendFriendRequest = (targetUserId: string, name: string) => {
    if (!user) {
      openAuthModal();
      return;
    }

    api.sendFriendRequest(targetUserId)
      .then(() => {
        setFriendStatuses((prev) => ({ ...prev, [targetUserId]: "pending_sent" }));
        notify(`Friend request sent to ${name}!`);
      })
      .catch(() => {
        setFriendStatuses((prev) => ({ ...prev, [targetUserId]: "pending_sent" }));
        notify(`Friend request sent to ${name}!`);
      });
  };

  const handleAcceptRec = (rec: FriendRecommendation) => {
    if (!user) {
      openAuthModal();
      return;
    }

    trackMedia(
      {
        id: rec.mediaId,
        slug: rec.mediaId,
        title: rec.mediaTitle,
        type: (rec.mediaType as any) || "Movie",
        year: "2024",
        rating: "4.5",
        genre: "Recommended",
        genres: ["Recommended"],
        poster: rec.mediaPoster || "",
        overview: "Friend recommended title",
        source: "local" as const,
        sourceId: rec.mediaId,
      },
      "Wishlist"
    );
    api.dismissRecommendation(rec.id).catch(() => {});
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
    notify(`Saved ${rec.mediaTitle} to your Wishlist`);
  };

  const handleDismissRec = (id: string) => {
    api.dismissRecommendation(id).catch(() => {});
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    notify("Recommendation dismissed");
  };

  const handleInvite = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.origin + "/discover");
      setInviteCopied(true);
      notify("Invite link copied to clipboard");
      setTimeout(() => setInviteCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="nv-reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))] font-bold">
            Your circle
          </p>
          <h2 className="font-display mt-1 text-3xl sm:text-4xl font-bold tracking-[-.06em] text-white">
            Find collectors & friends.
          </h2>
          <p className="mt-1.5 text-[12px] text-slate-400 max-w-[520px]">
            Search collectors across NerdVault, compare signature tastes, share recommendations, and follow activity.
          </p>
        </div>
        <button
          onClick={handleInvite}
          data-testid="button-invite-friend"
          className="nv-button flex items-center gap-2 self-start rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-md"
        >
          {inviteCopied ? <Check size={15} /> : <Plus size={15} />}
          {inviteCopied ? "Link Copied!" : "Invite friends"}
        </button>
      </div>

      {/* User Search Bar Card */}
      <div className="nv-card rounded-3xl p-5 border border-white/[.1] bg-[#10161b] shadow-xl">
        <label className="relative block">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collectors by name or handle..."
            className="h-12 w-full rounded-2xl border border-white/[.1] bg-black/40 pl-11 pr-4 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-[rgba(55,218,178,.55)] shadow-inner"
          />
        </label>

        {/* Live Search Results */}
        {searchQuery.trim() && (
          <div className="mt-4 pt-4 border-t border-white/[.08]">
            <p className="font-mono-ui text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
              Search Results
            </p>
            {searching ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-[12px]">
                <Loader2 size={16} className="animate-spin text-[hsl(var(--primary))]" />
                <span>Searching collectors...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((person) => {
                  const status = friendStatuses[person.id] || person.friendStatus;
                  const initials = person.name ? person.name.slice(0, 2).toUpperCase() : "NV";

                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-3.5 hover:border-[rgba(55,218,178,.3)] transition"
                    >
                      <Link href={`/profile/${person.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#3b9f8b] to-[#1e585b] text-[12px] font-bold text-[#09201c] shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-white group-hover:text-[hsl(var(--primary))] truncate">
                            {person.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {person.bio || `${person.totalVaultItems || 0} titles in vault`}
                          </p>
                        </div>
                      </Link>

                      {status === "friend" ? (
                        <span className="flex items-center gap-1 rounded-lg bg-[hsl(var(--primary))]/15 px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 shrink-0">
                          <UserCheck size={12} /> Friends
                        </span>
                      ) : status === "pending_sent" ? (
                        <span className="rounded-lg bg-white/[.06] px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-white/[.08] shrink-0">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(person.id, person.name)}
                          className="nv-button flex items-center gap-1 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7] shrink-0 shadow-sm"
                        >
                          <UserPlus size={13} /> Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-[12px]">
                No collectors found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Friends & Activity Columns */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* Live Activity Stream */}
        <section className="nv-card rounded-3xl p-6 border border-white/[.08] space-y-4">
          <SectionHeading
            eyebrow="Live from your circle"
            title="Recent activity"
            action="Refresh"
            onAction={() => {
              api.getSocialActivity().then((res) => setActivity(res?.activity || [])).catch(() => {});
              notify("Activity feed refreshed");
            }}
          />
          {activity.length > 0 ? (
            <div className="divide-y divide-white/[.06]">
              {activity.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0"
                >
                  <Avatar
                    initials={act.userName ? act.userName.slice(0, 2).toUpperCase() : "NV"}
                    tone="teal"
                    image={act.userAvatar}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-5 text-slate-300">
                      <strong className="text-white font-bold">{act.userName}</strong>{" "}
                      <span className="text-[hsl(var(--primary))] font-semibold">{act.action}</span>{" "}
                      <strong className="text-white">{act.mediaTitle}</strong>
                    </p>
                    {act.detail && (
                      <p className="mt-0.5 text-[11px] italic text-slate-400 line-clamp-1">
                        {act.detail}
                      </p>
                    )}
                    <span className="mt-1 font-mono-ui text-[9px] uppercase tracking-wider text-slate-500 block">
                      {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
                    </span>
                  </div>
                  {act.mediaPoster && (
                    <img
                      src={act.mediaPoster}
                      alt=""
                      className="h-12 w-9 rounded-lg object-cover border border-white/[.08] shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
              <Users size={24} className="text-slate-600 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">No friend activity yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                Search for collectors above or add friends to see live tracking updates.
              </p>
            </div>
          )}
        </section>

        {/* Friend Recommendations Inbox */}
        <section className="nv-card rounded-3xl p-6 border border-white/[.08] space-y-4">
          <SectionHeading
            eyebrow="Recommendations Inbox"
            title="Picks for you"
            action={recommendations.length > 0 ? "Dismiss all" : undefined}
            onAction={() => {
              setRecommendations([]);
              notify("All recommendations cleared");
            }}
          />
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex gap-3 rounded-2xl border border-white/[.08] bg-white/[.02] p-3"
                >
                  {rec.mediaPoster && (
                    <img
                      src={rec.mediaPoster}
                      alt=""
                      className="h-16 w-11 rounded-xl object-cover border border-white/[.1] shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-slate-100">
                      {rec.mediaTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 italic line-clamp-2">
                      From {rec.fromUserName}: “{rec.note || "You will love this!"}”
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRec(rec)}
                        className="nv-button flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--primary))] hover:underline"
                      >
                        <Heart size={12} fill="currentColor" /> Save to Wishlist
                      </button>
                      <button
                        onClick={() => handleDismissRec(rec.id)}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
              <Sparkles size={22} className="text-slate-600 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">Inbox is all caught up</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                When friends recommend titles on detail pages, they will appear here with personal notes.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Suggested Users Directory */}
      {suggestedUsers.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            eyebrow="Community"
            title="Collectors on NerdVault"
          />
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {suggestedUsers.map((person) => {
              const isRequested = friendStatuses[person.id] === "pending_sent";
              const initials = person.name ? person.name.slice(0, 2).toUpperCase() : "NV";

              return (
                <div key={person.id} className="nv-card rounded-2xl p-4 border border-white/[.08] flex flex-col justify-between">
                  <div>
                    <Link href={`/profile/${person.id}`} className="block group">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#65d4bd] to-[#286d70] text-sm font-extrabold text-[#09201c] group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                      <p className="mt-3 text-[13px] font-bold text-slate-100 group-hover:text-[hsl(var(--primary))] transition truncate">
                        {person.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                        {person.bio || "Collector on NerdVault"}
                      </p>
                    </Link>
                  </div>

                  <button
                    onClick={() => handleSendFriendRequest(person.id, person.name)}
                    data-testid={`button-follow-${person.id}`}
                    disabled={isRequested}
                    className={`nv-button mt-4 w-full rounded-xl py-2 text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                      isRequested
                        ? "border border-[hsl(var(--primary))]/30 bg-[rgba(55,218,178,.12)] text-[hsl(var(--primary))]"
                        : "bg-white/[.06] text-slate-300 hover:bg-[hsl(var(--primary))] hover:text-[#08211c]"
                    }`}
                  >
                    {isRequested ? <Check size={13} /> : <UserPlus size={13} />}
                    {isRequested ? "Request Sent" : "Add Friend"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
