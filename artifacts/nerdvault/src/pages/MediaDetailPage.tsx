import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  Star, Film, Users, CheckCircle2, BookmarkPlus, Send, ChevronDown,
  ChevronRight, ChevronLeft, MessageCircle, Layers, ArrowLeft, Heart, Lock, Eye, Edit3, Plus
} from "lucide-react";
import { api, UnifiedMedia, MediaReview } from "../lib/api";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";
import { SectionHeading } from "../components/common/SectionHeading";
import { Avatar } from "../components/common/Avatar";
import { MediaCard } from "../components/media/MediaCard";
import { FriendRecModal } from "../components/media/FriendRecModal";
import { MediaTrackModal } from "../components/media/MediaTrackModal";

export default function MediaDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, openAuthModal } = useAuth();
  const { isInVault, getItemStatus, trackMedia, notify } = useVault();

  const franchiseRef = useRef<HTMLDivElement>(null);
  const similarRef = useRef<HTMLDivElement>(null);

  const [media, setMedia] = useState<UnifiedMedia | null>(null);
  const [reviews, setReviews] = useState<MediaReview[]>([]);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);

  const fetchReviews = (mediaId: string) => {
    api.getReviews(mediaId)
      .then((res) => {
        if (res?.reviews) setReviews(res.reviews);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "instant" });

    api.getMediaDetail(slug)
      .then((data) => {
        if (data?.item) {
          setMedia(data.item);
          if (data.item.userRating) {
            setUserRating(data.item.userRating > 5 ? Math.round(data.item.userRating / 2) : data.item.userRating);
          }
          fetchReviews(data.item.id);
        }
      })
      .catch(() => {
        setMedia(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBackToBrowse = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/discover";
    }
  };

  const handleAuthGuardedAction = (action: () => void) => {
    if (!user) {
      openAuthModal();
      return;
    }
    action();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
          <p className="text-[12px] text-slate-500">Loading title details...</p>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="nv-card flex min-h-[300px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
        <p className="text-[14px] font-bold text-slate-300">Title not found</p>
        <p className="mt-1 text-[12px] text-slate-500">The requested title could not be retrieved from the catalog.</p>
        <button
          onClick={handleBackToBrowse}
          className="nv-button mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[11px] font-extrabold text-[#09201c]"
        >
          <ArrowLeft size={14} /> Back to Browse
        </button>
      </div>
    );
  }

  const inVault = isInVault(media.id);
  const currentStatus = getItemStatus(media.id) || media.status || "Wishlist";

  const handleStatusChange = (newStatus: string) => {
    handleAuthGuardedAction(() => {
      trackMedia(media, newStatus);
    });
  };

  const handleStarRating = (stars: number) => {
    handleAuthGuardedAction(() => {
      setUserRating(stars);
      trackMedia(media, inVault ? currentStatus : "Completed", stars);
      notify(`You rated ${media.title} ${stars} out of 5 stars`);
    });
  };

  const handleLikeReview = (reviewId: string) => {
    setLikedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
    notify("Liked review!");
  };

  const franchiseItems = media.franchise?.items || [];
  const similarItems = media.similar || [];
  const genreList = media.genres && media.genres.length > 0 ? media.genres : [media.genre];

  return (
    <div className="pb-16 space-y-10">
      {/* Top Back To Browse Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToBrowse}
          data-testid="button-back-top"
          className="nv-button flex items-center gap-2 rounded-xl border border-white/[.1] bg-[#12181d]/80 px-4 py-2 text-[12px] font-bold text-slate-300 backdrop-blur hover:border-[rgba(55,218,178,.4)] hover:text-[hsl(var(--primary))]"
        >
          <ArrowLeft size={15} /> Back to Browse
        </button>
      </div>

      {/* Hero Backdrop Section */}
      <section className="nv-reveal relative -mx-5 -mt-1 min-h-[520px] overflow-hidden sm:-mx-8 lg:-mx-10 rounded-3xl border border-white/[.14] shadow-2xl">
        <img
          src={media.backdrop || media.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition-opacity duration-700"
        />
        {/* Soft left-weighted gradient for readability without darkening the whole banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b0e]/95 via-[#070b0e]/50 to-transparent sm:max-w-[75%]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#070b0e]/95 via-[#070b0e]/40 to-transparent" />

        <div className="relative flex min-h-[520px] items-end px-5 pb-10 sm:px-8 lg:px-12 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          <div className="flex w-full max-w-[980px] flex-col gap-7 sm:flex-row sm:items-end">
            <img
              src={media.poster}
              alt={`${media.title} poster`}
              className="hidden aspect-[2/3] w-36 rounded-2xl border border-white/[.16] object-cover shadow-2xl sm:block lg:w-44"
            />
            <div className="max-w-[650px]">
              {/* Media Badges & Prominent Genres */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-300">
                <span className="rounded-md bg-[hsl(var(--primary))] px-2.5 py-1 text-[#08211c] font-extrabold">
                  {media.type}
                </span>
                <span>{media.year}</span>
                <span>·</span>
                {genreList.map((g) => (
                  <span
                    key={g}
                    className="rounded-md bg-white/[.08] px-2 py-0.5 text-slate-200 border border-white/[.1]"
                  >
                    {g}
                  </span>
                ))}
                {media.runtime && (
                  <>
                    <span>·</span>
                    <span>{media.runtime}</span>
                  </>
                )}
                {media.platform && (
                  <>
                    <span>·</span>
                    <span className="text-[hsl(var(--accent))]">{media.platform}</span>
                  </>
                )}
              </div>

              <h2 className="font-display mt-3 text-4xl font-bold tracking-[-.07em] text-white sm:text-6xl">
                {media.title}
              </h2>

              <p className="mt-4 max-w-[590px] text-[13px] leading-6 text-slate-300/85 line-clamp-4">
                {media.overview}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleAuthGuardedAction(() => setTrackModalOpen(true))}
                  data-testid="button-detail-add-vault"
                  className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-lg"
                >
                  {inVault ? <CheckCircle2 size={16} /> : <BookmarkPlus size={16} />}
                  {inVault ? `In Vault (${currentStatus})` : "Add to Vault"}
                </button>

                <select
                  value={currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  data-testid="select-detail-status"
                  className="h-11 rounded-xl border border-white/[.14] bg-black/35 px-3.5 text-[12px] font-bold text-slate-200 outline-none backdrop-blur"
                >
                  <option value="Watching">Watching</option>
                  <option value="Completed">Completed</option>
                  <option value="Wishlist">Wishlist</option>
                  <option value="Favorite">Favorite</option>
                  <option value="Paused">Paused</option>
                  <option value="Dropped">Dropped</option>
                </select>

                <button
                  onClick={() => handleAuthGuardedAction(() => setRecModalOpen(true))}
                  data-testid="button-detail-share"
                  title="Recommend to Friend"
                  className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.14] bg-black/25 px-4 py-2.5 text-[12px] font-bold text-slate-300 backdrop-blur hover:bg-white/[.1]"
                >
                  <Send size={15} /> Recommend
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Details and Sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <main className="space-y-9">
          {/* Stats Bar with 5-Star Interactive Rating */}
          <div className="flex flex-wrap items-center gap-6 border-b border-white/[.07] pb-6">
            <div className="flex items-center gap-2">
              <Star size={17} className="text-[hsl(var(--accent))]" fill="currentColor" />
              <div>
                <p className="font-display text-[17px] font-bold text-slate-200">{media.rating} / 5</p>
                <p className="text-[10px] text-slate-500">Community score</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Film size={17} className="text-[hsl(var(--accent))]" />
              <div>
                <p className="font-display text-[17px] font-bold text-slate-200">
                  {genreList.join(", ")}
                </p>
                <p className="text-[10px] text-slate-500">Genre classification</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users size={17} className="text-[hsl(var(--accent))]" />
              <div>
                <p className="font-display text-[17px] font-bold text-slate-200">{media.type}</p>
                <p className="text-[10px] text-slate-500">Media format</p>
              </div>
            </div>

            {/* Interactive User Rating (Out of 5 Stars) */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[12px] text-slate-400 mr-1 hidden sm:inline font-semibold">Your Rating:</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => handleStarRating(i)}
                  data-testid={`button-rating-${i}`}
                  aria-label={`Rate ${i} stars`}
                  className="p-1 transition hover:scale-115"
                >
                  <Star
                    size={20}
                    fill={i <= userRating ? "#acd986" : "transparent"}
                    className={i <= userRating ? "text-[#acd986]" : "text-slate-700 hover:text-[#acd986]"}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Synopsis */}
          <div>
            <SectionHeading eyebrow="Overview & Synopsis" title="About the story" />
            <p className="max-w-[720px] text-[13px] leading-7 text-slate-300/90">
              {media.overview}
            </p>
          </div>

          {/* --- LETTERBOXD-STYLE COMMUNITY REVIEWS SECTION --- */}
          <section className="space-y-5 pt-4 border-t border-white/[.08]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-ui text-[10px] uppercase font-bold tracking-[.18em] text-[hsl(var(--primary))]">
                  Community Discussion
                </p>
                <h3 className="font-display text-2xl font-bold tracking-[-.05em] text-white">
                  Popular reviews
                </h3>
              </div>
              <button
                onClick={() => handleAuthGuardedAction(() => setTrackModalOpen(true))}
                className="nv-button flex items-center gap-1.5 rounded-xl border border-[rgba(55,218,178,.3)] bg-[rgba(55,218,178,.1)] px-4 py-2 text-[11px] font-bold text-[hsl(var(--primary))] hover:bg-[rgba(55,218,178,.2)]"
              >
                <Edit3 size={13} /> Write a review
              </button>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => {
                  const isLiked = likedReviews[rev.id];
                  const totalLikes = (rev.likesCount ?? rev.likes ?? 0) + (isLiked ? 1 : 0);
                  const initials = (rev.userName || "Collector").slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={rev.id}
                      className={`rounded-2xl p-5 border transition-all ${
                        rev.isOwner
                          ? "bg-[rgba(55,218,178,.04)] border-[rgba(55,218,178,.3)] shadow-[0_0_20px_rgba(55,218,178,.08)]"
                          : "bg-white/[.025] border-white/[.08]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={initials}
                            tone={rev.isOwner ? "green" : "teal"}
                            image={rev.userImage}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-white">
                                {rev.userName || "Collector"}
                              </span>
                              {rev.isOwner && (
                                <span className="font-mono-ui text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30">
                                  You
                                </span>
                              )}
                              {rev.isPrivate && (
                                <span className="font-mono-ui text-[9px] uppercase font-semibold text-slate-500 flex items-center gap-1">
                                  <Lock size={10} /> Private
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono-ui">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                            </span>
                          </div>
                        </div>

                        {rev.isOwner && (
                          <button
                            onClick={() => setTrackModalOpen(true)}
                            className="text-slate-500 hover:text-[hsl(var(--primary))] p-1 text-[11px] font-semibold"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {/* Review Content Text */}
                      <p className="mt-3 text-[13px] leading-6 text-slate-200/90 whitespace-pre-line">
                        {rev.content || rev.reviewText || "No review content provided."}
                      </p>

                      {/* Like Button & Like Counter */}
                      <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-white/[.04]">
                        <button
                          onClick={() => handleLikeReview(rev.id)}
                          className={`nv-button flex items-center gap-1.5 text-[11px] font-bold transition ${
                            isLiked ? "text-red-400" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <Heart size={13} fill={isLiked ? "currentColor" : "transparent"} />
                          <span>{isLiked ? "Liked" : "Like review"}</span>
                        </button>
                        <span className="text-[11px] text-slate-600">
                          {totalLikes} {totalLikes === 1 ? "like" : "likes"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="nv-card flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[.08] rounded-2xl">
                <MessageCircle size={24} className="text-slate-600 mb-2" />
                <p className="text-[13px] font-bold text-slate-300">No reviews written yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                  Be the first to share your thoughts, rate, and review {media.title} for fellow collectors.
                </p>
                <button
                  onClick={() => handleAuthGuardedAction(() => setTrackModalOpen(true))}
                  className="nv-button mt-4 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-[11px] font-extrabold text-[#09201c] hover:bg-[#73e4c7]"
                >
                  Write first review
                </button>
              </div>
            )}
          </section>

          {/* Details & Extras Accordion */}
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              data-testid="button-toggle-seasons"
              className="flex w-full items-center justify-between border-b border-white/[.08] pb-4 text-left"
            >
              <span>
                <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
                  Production & Crew
                </span>
                <span className="mt-1 block font-display text-xl font-semibold text-slate-100">
                  Details & extras
                </span>
              </span>
              {expanded ? <ChevronDown size={19} className="text-slate-500" /> : <ChevronRight size={19} className="text-slate-500" />}
            </button>

            {expanded && (
              <div className="divide-y divide-white/[.06] pt-2">
                {[
                  ["Primary Genres", genreList.join(" · ")],
                  media.director ? ["Director / Creator", media.director] : null,
                  media.cast && media.cast.length > 0 ? ["Cast", media.cast.join(" · ")] : null,
                  media.studio ? ["Studio / Production", media.studio] : null,
                  media.platform ? ["Platform / Network", media.platform] : null,
                  media.runtime ? ["Runtime / Length", media.runtime] : null,
                  media.audio ? ["Audio Formats", media.audio] : null,
                ]
                  .filter(Boolean)
                  .map((row: any) => (
                    <div key={row[0]} className="flex justify-between gap-4 py-3.5 text-[12px]">
                      <span className="text-slate-500 font-medium">{row[0]}</span>
                      <span className="text-right font-semibold text-slate-200">{row[1]}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="space-y-5">
          {media.trailerUrl && (
            <div className="nv-card rounded-3xl p-5 border border-white/[.08]">
              <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-slate-500 block mb-3">
                Official Trailer
              </span>
              <a
                href={media.trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="nv-button flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3 text-[12px] font-extrabold text-[#09201c] hover:bg-[#73e4c7] shadow-md"
              >
                Watch on YouTube
              </a>
            </div>
          )}

          {/* Social Notes Card */}
          <div className="rounded-3xl border border-[rgba(55,218,178,.2)] bg-[rgba(55,218,178,.05)] p-5">
            <div className="flex items-center gap-2 text-[hsl(var(--primary))]">
              <MessageCircle size={16} />
              <span className="font-mono-ui text-[10px] uppercase font-bold tracking-[.16em]">
                Vault Circle
              </span>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-slate-300">
              Save this title to your vault to log review notes, rate, recommend to friends, or add to custom playlists.
            </p>
          </div>
        </aside>
      </div>

      {/* --- FRANCHISE / UNIVERSE SECTION (If Part of Franchise) --- */}
      {franchiseItems.length > 0 && (
        <section className="nv-reveal space-y-4 pt-6 border-t border-white/[.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers size={20} className="text-[hsl(var(--primary))]" />
              <div>
                <p className="font-mono-ui text-[10px] uppercase font-bold tracking-[.18em] text-[hsl(var(--primary))]">
                  Universe & Timeline
                </p>
                <h3 className="font-display text-2xl font-bold tracking-[-.05em] text-slate-100">
                  {media.franchise?.name || `${media.title} Franchise`}
                </h3>
              </div>
            </div>

            {/* Franchise Scroll Arrow Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (franchiseRef.current) {
                    franchiseRef.current.scrollBy({ left: -480, behavior: "smooth" });
                  }
                }}
                aria-label="Scroll previous franchise entries"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[.12] bg-[#12181d]/80 text-slate-400 hover:text-white hover:border-[hsl(var(--primary))]/50 hover:bg-white/[.08] active:scale-95 transition shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  if (franchiseRef.current) {
                    franchiseRef.current.scrollBy({ left: 480, behavior: "smooth" });
                  }
                }}
                aria-label="Scroll next franchise entries"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[.12] bg-[#12181d]/80 text-slate-400 hover:text-white hover:border-[hsl(var(--primary))]/50 hover:bg-white/[.08] active:scale-95 transition shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={franchiseRef}
            className="flex gap-4 overflow-x-auto pt-4 pb-4 px-1.5 -mt-3 -mx-1.5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {franchiseItems.map((item) => (
              <div key={item.id} className="w-[140px] shrink-0 sm:w-[160px]">
                <MediaCard item={item} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- MORE LIKE THIS SECTION (2 Rows of Similar Content) --- */}
      {similarItems.length > 0 && (
        <section className="nv-reveal space-y-5 pt-6 border-t border-white/[.08]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono-ui text-[10px] uppercase font-bold tracking-[.18em] text-[hsl(var(--accent))]">
                Recommendations
              </p>
              <h3 className="font-display text-2xl font-bold tracking-[-.05em] text-slate-100">
                More like this
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono-ui">
              {similarItems.length} titles
            </span>
          </div>

          {/* 2 Rows of Similar Content Grid */}
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {similarItems.slice(0, 16).map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom Back To Browse Button */}
      <div className="flex items-center justify-center pt-8 border-t border-white/[.08]">
        <button
          onClick={handleBackToBrowse}
          data-testid="button-back-bottom"
          className="nv-button flex items-center gap-2 rounded-2xl border border-[rgba(55,218,178,.3)] bg-[rgba(55,218,178,.1)] px-6 py-3 text-[13px] font-bold text-[hsl(var(--primary))] hover:bg-[rgba(55,218,178,.18)] shadow-lg"
        >
          <ArrowLeft size={16} /> Back to Browse
        </button>
      </div>

      <FriendRecModal
        isOpen={recModalOpen}
        onClose={() => setRecModalOpen(false)}
        item={media}
      />

      <MediaTrackModal
        isOpen={trackModalOpen}
        onClose={() => {
          setTrackModalOpen(false);
          if (media) fetchReviews(media.id);
        }}
        item={media}
      />
    </div>
  );
}
