import React, { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Star, Heart, Sparkles, Check, UserPlus, Share2, Edit3, Film, Tv,
  Gamepad2, Calendar, Clock, ListFilter, Search, ArrowUpDown, ChevronRight,
  BookmarkCheck, Plus, LogIn, Lock
} from "lucide-react";
import { api, UserProfile, VaultStats, UnifiedMedia } from "../lib/api";
import { Avatar } from "../components/common/Avatar";
import { SectionHeading } from "../components/common/SectionHeading";
import { MediaCard } from "../components/media/MediaCard";
import { EditProfileModal } from "../components/profile/EditProfileModal";
import { FavoriteSelectModal } from "../components/profile/FavoriteSelectModal";
import { CustomSelect } from "../components/common/CustomSelect";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";

export default function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { user, openAuthModal } = useAuth();
  const { vaultItems, stats, notify } = useVault();

  const [activeTab, setActiveTab] = useState<"showcase" | "activity" | "logs">("showcase");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [favoriteModalType, setFavoriteModalType] = useState<"Movie" | "Series" | "Anime" | "Game" | null>(null);

  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [profileStats, setProfileStats] = useState<VaultStats | null>(null);
  const [favorites, setFavorites] = useState<UnifiedMedia[]>([]);
  const [logs, setLogs] = useState<UnifiedMedia[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);
  const [loading, setLoading] = useState(true);

  // Logs filters & sorting
  const [logSort, setLogSort] = useState<"latest" | "oldest" | "highest" | "title">("latest");
  const [logSearch, setLogSearch] = useState("");
  const [logType, setLogType] = useState("All formats");

  const loadProfile = () => {
    setLoading(true);
    api.getProfile(id)
      .then((res: any) => {
        if (res?.user) {
          setProfileUser(res.user);
          setIsOwner(res.isOwner ?? (!id || id === user?.id));
        } else {
          setProfileUser(null);
          setIsOwner(false);
        }
        if (res?.stats) setProfileStats(res.stats);
        if (res?.favorites) setFavorites(res.favorites);
        if (res?.logs) setLogs(res.logs);
        if (res?.recentActivity) setRecentActivity(res.recentActivity);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setProfileUser(null);
        setIsOwner(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [id, user]);

  const isGuest = !user && !id;

  const currentUser: UserProfile | null = isGuest
    ? null
    : profileUser || user;

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "G";

  const allItems = logs.length > 0 ? logs : vaultItems;

  const displayStats: VaultStats = profileStats || stats || {
    totalCollected: allItems.length,
    hoursWatched: Math.round(allItems.length * 2.2),
    topGenre: allItems[0]?.genre || "Cinema",
    topGenreCount: allItems.length,
    averageRating: 0,
    tasteScore: 0,
    genresBreakdown: [],
  };

  // Section Privacy Checks
  const privacySettings = JSON.parse(localStorage.getItem(`nv_privacy_${currentUser?.id}`) || "{}");
  const favsPrivate = !isOwner && privacySettings.favorites === "private";
  const dnaPrivate = !isOwner && privacySettings.dna === "private";
  const activityPrivate = !isOwner && privacySettings.activity === "private";
  const logsPrivate = !isOwner && privacySettings.logs === "private";

  // Derive Top 4 Favorites (1 Movie, 1 Series, 1 Anime, 1 Game)
  const favMovie = favorites.find((i) => i.type?.toLowerCase() === "movie") ||
    allItems.find((i) => i.type?.toLowerCase() === "movie" && (i.status === "Favorite" || (i.userRating && i.userRating >= 4.5)));

  const favSeries = favorites.find((i) => i.type?.toLowerCase() === "series" || i.type?.toLowerCase() === "show") ||
    allItems.find((i) => (i.type?.toLowerCase() === "series" || i.type?.toLowerCase() === "show") && (i.status === "Favorite" || (i.userRating && i.userRating >= 4.5)));

  const favAnime = favorites.find((i) => i.type?.toLowerCase() === "anime") ||
    allItems.find((i) => i.type?.toLowerCase() === "anime" && (i.status === "Favorite" || (i.userRating && i.userRating >= 4.5)));

  const favGame = favorites.find((i) => i.type?.toLowerCase() === "game") ||
    allItems.find((i) => i.type?.toLowerCase() === "game" && (i.status === "Favorite" || (i.userRating && i.userRating >= 4.5)));

  const top4Slots = [
    { label: "Favorite Movie", type: "Movie" as const, icon: Film, item: favMovie },
    { label: "Favorite Series", type: "Series" as const, icon: Tv, item: favSeries },
    { label: "Favorite Anime", type: "Anime" as const, icon: Sparkles, item: favAnime },
    { label: "Favorite Game", type: "Game" as const, icon: Gamepad2, item: favGame },
  ];

  const handleSlotClick = (slotType: "Movie" | "Series" | "Anime" | "Game") => {
    if (!user) {
      openAuthModal();
      return;
    }
    setFavoriteModalType(slotType);
  };

  const handleShareProfile = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/profile${currentUser?.id ? `/${currentUser.id}` : ""}`;
      navigator.clipboard.writeText(url);
      notify("Profile link copied to clipboard!");
    }
  };

  const handleAddFriend = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (currentUser?.id) {
      api.sendFriendRequest(currentUser.id)
        .then(() => {
          setFriendRequested(true);
          notify(`Friend request sent to ${currentUser.name}!`);
        })
        .catch(() => {
          setFriendRequested(true);
          notify(`Friend request sent to ${currentUser.name}!`);
        });
    }
  };

  // Filter and sort logs
  let filteredLogs = [...allItems];
  if (logSearch.trim()) {
    filteredLogs = filteredLogs.filter((i) =>
      i.title.toLowerCase().includes(logSearch.toLowerCase()) ||
      i.genre?.toLowerCase().includes(logSearch.toLowerCase())
    );
  }
  if (logType !== "All formats") {
    filteredLogs = filteredLogs.filter((i) => i.type?.toLowerCase() === logType.toLowerCase());
  }

  if (logSort === "latest") {
    // Recently added
  } else if (logSort === "oldest") {
    filteredLogs.reverse();
  } else if (logSort === "highest") {
    filteredLogs.sort((a, b) => Number(b.userRating || b.rating || 0) - Number(a.userRating || a.rating || 0));
  } else if (logSort === "title") {
    filteredLogs.sort((a, b) => a.title.localeCompare(b.title));
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Profile Header */}
      <section className="nv-card nv-reveal relative overflow-hidden rounded-3xl p-6 sm:p-9 border border-white/[.1]">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[rgba(55,218,178,.12)] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#65d4bd] to-[#286d70] text-2xl font-extrabold text-[#09201c] shadow-[0_0_35px_rgba(55,218,178,.3)]">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-ui text-[10px] uppercase font-bold tracking-[.22em] text-[hsl(var(--primary))]">
                  {isGuest ? "Guest Mode" : "Collector profile"}
                </span>
              </div>
              <h2 className="font-display mt-1 text-3xl font-bold tracking-[-.06em] text-white">
                {currentUser?.name || "Guest Collector"}
              </h2>
              <p className="mt-1 text-[13px] text-slate-400 max-w-[440px]">
                {currentUser?.bio ||
                  (isGuest
                    ? "Browsing as guest. Sign in to customize your profile and save your collection."
                    : "Building a personal vault of cinema, television, anime, and games.")}
              </p>
            </div>
          </div>

          {/* Action Buttons (Strictly Guarded for Guest Mode) */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            {isGuest ? (
              <button
                onClick={openAuthModal}
                data-testid="button-signin-profile"
                className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-lg"
              >
                <LogIn size={15} /> Sign In / Register
              </button>
            ) : isOwner ? (
              <>
                <button
                  onClick={() => setEditModalOpen(true)}
                  data-testid="button-edit-profile"
                  className="nv-button flex items-center gap-2 rounded-xl border border-white/[.12] bg-[#141b20] px-4 py-2.5 text-[12px] font-bold text-slate-300 hover:border-[rgba(55,218,178,.4)] hover:text-white"
                >
                  <Edit3 size={15} /> Edit profile
                </button>
                <button
                  onClick={handleShareProfile}
                  data-testid="button-share-profile"
                  className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-md"
                >
                  <Share2 size={15} /> Share
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAddFriend}
                  disabled={friendRequested}
                  data-testid="button-add-friend"
                  className={`nv-button flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-extrabold transition shadow-lg ${
                    friendRequested
                      ? "bg-white/[.08] text-slate-400 border border-white/[.1]"
                      : "bg-[hsl(var(--primary))] text-[#08211c] hover:bg-[#73e4c7]"
                  }`}
                >
                  {friendRequested ? <Check size={15} /> : <UserPlus size={15} />}
                  {friendRequested ? "Request Sent" : "Add Friend"}
                </button>
                <button
                  onClick={handleShareProfile}
                  className="nv-button flex items-center gap-2 rounded-xl border border-white/[.12] bg-[#141b20] px-4 py-2.5 text-[12px] font-bold text-slate-300 hover:bg-white/[.08]"
                >
                  <Share2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-white/[.08] pt-6 sm:max-w-[560px]">
          <div>
            <p className="font-display text-2xl font-bold text-slate-100">
              {displayStats.totalCollected}
            </p>
            <p className="text-[11px] text-slate-500">Titles in vault</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-100">
              {displayStats.hoursWatched}h
            </p>
            <p className="text-[11px] text-slate-500">Hours tracked</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-100">
              {displayStats.averageRating ? `${displayStats.averageRating.toFixed(1)} / 5` : "0.0 / 5"}
            </p>
            <p className="text-[11px] text-slate-500">Avg. rating</p>
          </div>
        </div>
      </section>

      {/* Sub-Tabs Navigation (Showcase / Activity / Logs) */}
      <div className="flex border-b border-white/[.08] pb-1">
        <div className="flex gap-2">
          {[
            { id: "showcase", label: "Showcase & DNA" },
            { id: "activity", label: "Activity" },
            { id: "logs", label: `Logs (${allItems.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`nv-button px-5 py-3 text-[13px] font-bold transition-all relative ${
                activeTab === tab.id
                  ? "text-[hsl(var(--primary))]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 bg-[hsl(var(--primary))] shadow-[0_0_12px_rgba(55,218,178,.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SHOWCASE & TASTE DNA */}
      {activeTab === "showcase" && (
        <div className="space-y-10">
          {/* --- TOP 4 FAVORITES BALANCED SHOWCASE (ABOVE DNA) --- */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-ui text-[10px] uppercase font-bold tracking-[.2em] text-[hsl(var(--primary))]">
                  Signature Taste
                </p>
                <h3 className="font-display text-xl font-bold tracking-[-.04em] text-white">
                  Favorite 4 showcase
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                1 per media category
              </span>
            </div>

            {favsPrivate ? (
              <div className="nv-card flex flex-col items-center justify-center rounded-3xl p-10 text-center border border-dashed border-white/[.1]">
                <Lock size={26} className="text-slate-500 mb-2" />
                <p className="text-[13px] font-bold text-slate-300">This section is private</p>
                <p className="text-[11px] text-slate-500 mt-1">The collector has set their Favorite 4 showcase to private.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-[760px]">
                {top4Slots.map((slot) => {
                  const Icon = slot.icon;
                  const item = slot.item;

                  if (item) {
                    return (
                      <div key={slot.label} className="flex flex-col group relative">
                        <div
                          onClick={() => handleSlotClick(slot.type)}
                          className="cursor-pointer"
                          title={`Click to change Favorite ${slot.type}`}
                        >
                          <MediaCard item={item} />
                        </div>
                        <div className="mt-2 flex items-center justify-center">
                          <span className="font-mono-ui text-[10px] uppercase font-bold text-[hsl(var(--primary))] flex items-center gap-1">
                            <Icon size={11} /> {slot.label}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => handleSlotClick(slot.type)}
                      className="nv-card flex aspect-[2/3] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[.14] p-4 text-center hover:border-[rgba(55,218,178,.5)] hover:bg-white/[.04] transition group"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-slate-500 group-hover:bg-[hsl(var(--primary))]/15 group-hover:text-[hsl(var(--primary))] transition">
                        <Icon size={18} />
                      </div>
                      <span className="mt-2.5 text-[12px] font-bold text-slate-300">
                        {slot.label}
                      </span>
                      <span className="mt-1 font-mono-ui text-[10px] text-slate-500 group-hover:text-[hsl(var(--primary))]">
                        + Add Favorite
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Taste DNA Top Genres Breakdown */}
          {dnaPrivate ? (
            <div className="nv-card flex flex-col items-center justify-center rounded-3xl p-10 text-center border border-dashed border-white/[.1]">
              <Lock size={26} className="text-slate-500 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">Taste DNA is private</p>
              <p className="text-[11px] text-slate-500 mt-1">The collector has set their Taste DNA breakdown to private.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
              <section className="nv-card rounded-3xl p-6 border border-white/[.08]">
                <SectionHeading eyebrow="Taste DNA" title="Top genres" />
                {displayStats.genresBreakdown && displayStats.genresBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {displayStats.genresBreakdown.map((row) => (
                      <div key={row.name}>
                        <div className="mb-2 flex justify-between text-[12px]">
                          <span className="font-semibold text-slate-200">{row.name}</span>
                          <span className="text-slate-500 font-mono-ui">{row.count} titles</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[.07]">
                          <div
                            className={`h-full rounded-full ${
                              row.color === "teal"
                                ? "bg-[#4ccab2]"
                                : row.color === "green"
                                ? "bg-[#acd986]"
                                : row.color === "violet"
                                ? "bg-[#aa96d8]"
                                : "bg-[#d4936e]"
                            }`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
                    <Sparkles size={24} className="text-slate-600 mb-2" />
                    <p className="text-[13px] font-bold text-slate-300">No genre breakdown yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                      Track titles in your vault to generate your personal Taste DNA breakdown.
                    </p>
                  </div>
                )}
              </section>

              {/* Quick Profile Summary Bio Card */}
              <section className="nv-card rounded-3xl p-6 border border-white/[.08] flex flex-col justify-between">
                <div>
                  <SectionHeading eyebrow="Collector Identity" title="About the collection" />
                  <p className="text-[13px] leading-6 text-slate-300 mt-2">
                    {currentUser?.bio || "Building a personal vault of cinema, television, anime, and games."}
                  </p>
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between py-2 text-[12px] border-b border-white/[.06]">
                      <span className="text-slate-500 font-medium">Favorite Format</span>
                      <span className="text-slate-200 font-bold">{displayStats.topGenre || "Multi-format"}</span>
                    </div>
                    <div className="flex justify-between py-2 text-[12px] border-b border-white/[.06]">
                      <span className="text-slate-500 font-medium">Profile Visibility</span>
                      <span className="text-[hsl(var(--primary))] font-bold">Public Vault</span>
                    </div>
                    <div className="flex justify-between py-2 text-[12px]">
                      <span className="text-slate-500 font-medium">Average Score</span>
                      <span className="text-[#acd986] font-bold">★ {displayStats.averageRating ? displayStats.averageRating.toFixed(1) : "0.0"} / 5</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Logged on NerdVault</span>
                  <Link href="/vault" className="nv-button text-[12px] font-bold text-[hsl(var(--primary))] hover:underline">
                    View full vault →
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVITY STREAM */}
      {activeTab === "activity" && (
        <section className="nv-card rounded-3xl p-6 border border-white/[.08] space-y-6">
          <SectionHeading eyebrow="Chronicle" title="Recent activity" />
          {activityPrivate ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/[.08] rounded-2xl">
              <Lock size={26} className="text-slate-500 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">Activity is private</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                The collector has set their activity feed to private.
              </p>
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="divide-y divide-white/[.06]">
              {recentActivity.map((r, i) => (
                <div key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] font-bold">
                    <BookmarkCheck size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-200 truncate">
                      <span className="text-[hsl(var(--primary))] font-extrabold mr-1.5">{r.type}</span>
                      {r.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.time} · {r.mediaType || "Media"}</p>
                  </div>
                  {r.rating && (
                    <div className="flex items-center gap-1 rounded-xl bg-black/40 px-3 py-1.5 border border-white/[.08] text-[11px] font-bold text-[#acd986]">
                      <Star size={12} fill="currentColor" />
                      <span>{r.rating} / 5</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/[.08] rounded-2xl">
              <Clock size={28} className="text-slate-600 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">No activity recorded yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                Titles tracked, rated, or favorited will appear chronologically here.
              </p>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: LOGS & DIARY */}
      {activeTab === "logs" && (
        <section className="space-y-6">
          {logsPrivate ? (
            <div className="nv-card flex flex-col items-center justify-center rounded-3xl p-12 text-center border border-dashed border-white/[.08]">
              <Lock size={26} className="text-slate-500 mb-2" />
              <p className="text-[13px] font-bold text-slate-300">Logs & Diary are private</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                The collector has set their personal vault diary to private.
              </p>
            </div>
          ) : (
            <>
              {/* Search, Filter, and Sort Bar for Logs */}
              <div className="nv-card rounded-3xl p-4 sm:p-5 border border-white/[.1] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logged titles..."
                    className="h-11 w-full rounded-2xl border border-white/[.1] bg-black/25 pl-10 pr-4 text-[12px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-[rgba(55,218,178,.5)]"
                  />
                </div>

                <div className="flex gap-2.5 w-full sm:w-auto overflow-x-auto">
                  <CustomSelect
                    value={logType}
                    onChange={(val) => setLogType(val)}
                    options={["All formats", "Movie", "Series", "Anime", "Game"]}
                    minWidth="130px"
                  />

                  <CustomSelect
                    value={logSort}
                    onChange={(val) => setLogSort(val as any)}
                    options={[
                      { label: "Latest to Oldest", value: "latest" },
                      { label: "Oldest to Latest", value: "oldest" },
                      { label: "Highest Rated", value: "highest" },
                      { label: "Alphabetical", value: "title" },
                    ]}
                    minWidth="160px"
                  />
                </div>
              </div>

              {/* Logs List Table / Cards */}
              {filteredLogs.length > 0 ? (
                <div className="nv-card rounded-3xl p-4 sm:p-6 border border-white/[.08] divide-y divide-white/[.06]">
                  {filteredLogs.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 group">
                      <Link href={`/media/${item.id}`} className="block shrink-0">
                        <img
                          src={item.poster}
                          alt=""
                          className="h-16 w-11 rounded-lg object-cover border border-white/[.1] transition-transform group-hover:scale-105"
                        />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link href={`/media/${item.id}`} className="block">
                          <p className="text-[13px] font-bold text-white group-hover:text-[hsl(var(--primary))] transition truncate">
                            {item.title}
                          </p>
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.year} · <span className="font-semibold text-slate-300">{item.type}</span> · {item.genre}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-white/[.06] px-2.5 py-1 font-mono-ui text-[10px] font-bold text-slate-300 border border-white/[.08]">
                          {item.status || "Completed"}
                        </span>

                        {(item.userRating || item.rating) && (
                          <div className="flex items-center gap-1 font-mono-ui text-[11px] font-bold text-[#acd986] bg-black/40 px-2.5 py-1 rounded-lg border border-white/[.08]">
                            <Star size={12} fill="currentColor" />
                            <span>{item.userRating || item.rating} / 5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="nv-card flex min-h-[220px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.08]">
                  <BookmarkCheck size={28} className="text-slate-600 mb-2" />
                  <p className="text-[13px] font-bold text-slate-300">No logs found</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                    {logSearch ? "No titles match your filter terms." : "Start tracking titles in your vault to create your diary."}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentUser={currentUser || { id: "guest", name: "Guest", email: "" }}
      />

      {favoriteModalType && (
        <FavoriteSelectModal
          isOpen={true}
          onClose={() => setFavoriteModalType(null)}
          targetType={favoriteModalType}
          onSelected={() => {
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
