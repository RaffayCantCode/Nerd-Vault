import { useState } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Clock3,
  Heart,
  ListPlus,
  MessageCircle,
  Play,
  Quote,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { AppLayout, MediaCard, Poster, Rating } from "./_shared/AppLayout";
import "./MediaDetail.css";

const poster = "/__mockup/images/nerdvault-dune-poster.jpg";

const similar = [
  {
    title: "The Quiet Orbit",
    meta: "2021 · 2h 18m",
    type: "Movie",
    score: "86",
    src: "/__mockup/images/nerdvault-similar-solaris.jpg",
  },
  {
    title: "Red Horizon",
    meta: "2023 · 2h 04m",
    type: "Movie",
    score: "82",
    src: "/__mockup/images/nerdvault-similar-orbit.jpg",
  },
  {
    title: "Dune",
    meta: "2021 · 2h 35m",
    type: "Movie",
    score: "89",
    src: poster,
  },
];

const episodes = [
  { number: "01", title: "The Arrival", duration: "48m" },
  { number: "02", title: "The Long Night", duration: "52m" },
  { number: "03", title: "A Narrow Path", duration: "46m" },
  { number: "04", title: "The Deep Desert", duration: "55m" },
  { number: "05", title: "Names in the Wind", duration: "51m" },
];

function UserStars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1" aria-label="Your rating out of five stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} out of 5`}
          onClick={() => onChange(star)}
          className="rounded-md p-1 transition hover:bg-[#55e5c0]/10"
        >
          <Star
            size={18}
            strokeWidth={1.7}
            className={star <= value ? "fill-[#b7ef7d] text-[#b7ef7d]" : "text-[#52635f]"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewRow({
  initials,
  name,
  date,
  copy,
  score,
}: {
  initials: string;
  name: string;
  date: string;
  copy: string;
  score: string;
}) {
  return (
    <div className="flex gap-3 border-b border-white/[0.07] py-4 last:border-b-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#243b37] text-[11px] font-extrabold text-[#b7ef7d]">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[12px] font-bold text-[#e9f2ee]">{name}</span>
            <span className="ml-2 text-[10px] text-[#71817e]">{date}</span>
          </div>
          <Rating value={score} label="" />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[#aab9b5]">{copy}</p>
      </div>
    </div>
  );
}

export function MediaDetail() {
  const [isInVault, setIsInVault] = useState(false);
  const [status, setStatus] = useState("Want to watch");
  const [userRating, setUserRating] = useState(0);
  const [isLoved, setIsLoved] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [season, setSeason] = useState("Season 1");
  const [selectedEpisode, setSelectedEpisode] = useState("01");
  const [showComposer, setShowComposer] = useState(false);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(false);
  const [discoveryOpened, setDiscoveryOpened] = useState(false);

  const handleVaultToggle = () => {
    setIsInVault((current) => !current);
    if (!isInVault) setStatus("Want to watch");
  };

  const handleShare = async () => {
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
  };

  return (
    <AppLayout active="home">
      <div className="nerdvault-detail-page">
        <div className="mb-5 flex items-center gap-2 text-[11px] text-[#71817e]">
          <span className="text-[#55e5c0]">Home</span>
          <span className="text-[#40504d]">/</span>
          <span>Movies</span>
          <span className="text-[#40504d]">/</span>
          <span className="truncate text-[#b5c4bf]">Dune: Part Two</span>
        </div>

        <section className="detail-hero">
          <div className="detail-hero-art" aria-hidden="true" />
          <div className="detail-hero-content">
            <div className="detail-poster">
              <Poster src={poster} alt="Dune: Part Two atmospheric desert poster" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur">
                  Movie
                </span>
                <button
                  type="button"
                  aria-label={isLoved ? "Remove from favorites" : "Add to favorites"}
                  onClick={() => setIsLoved((current) => !current)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition ${
                    isLoved
                      ? "border-[#ff846d]/50 bg-[#ff846d]/20 text-[#ff9a87]"
                      : "border-white/15 bg-black/35 text-white/75 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <Heart size={15} className={isLoved ? "fill-current" : ""} />
                </button>
              </div>
            </div>

            <div className="detail-copy">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="vault-mono text-[10px] uppercase tracking-[0.2em] text-[#b7ef7d]">Now entering your universe</span>
                <span className="h-1 w-1 rounded-full bg-[#55e5c0]" />
                <span className="text-[11px] text-[#9aaba6]">Warner Bros. · Legendary</span>
              </div>
              <h1 className="max-w-[740px] text-[42px] font-extrabold leading-[0.98] tracking-[-0.07em] text-[#f5faf7] sm:text-[66px]">
                Dune:
                <br />
                Part Two
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#c0ceca]">
                <span>2024</span>
                <span className="h-1 w-1 rounded-full bg-[#61716e]" />
                <span>2h 46m</span>
                <span className="h-1 w-1 rounded-full bg-[#61716e]" />
                <span>PG-13</span>
                <span className="h-1 w-1 rounded-full bg-[#61716e]" />
                <span>English</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Sci-fi", "Epic", "Adventure", "Drama"].map((genre) => (
                  <span key={genre} className="detail-pill">
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
                <Rating value="94" />
                <div className="h-5 w-px bg-white/15" />
                <div className="flex items-center gap-2 text-[11px] text-[#9aaba6]">
                  <Users size={14} className="text-[#55e5c0]" />
                  <span>1.8k nerds logged this</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#9aaba6]">
                  <Clock3 size={14} className="text-[#b7ef7d]" />
                  <span>Top 4% in Epic sci-fi</span>
                </div>
              </div>
              <p className="mt-5 max-w-[720px] text-[13px] leading-[1.75] text-[#b5c3bf]">
                Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Caught between the love of his life and the fate of the known universe, he must prevent a terrible future only he can foresee.
              </p>
              <div className="detail-action-row mt-7">
                <button
                  type="button"
                  onClick={handleVaultToggle}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[12px] font-extrabold transition ${
                    isInVault
                      ? "bg-[#b7ef7d] text-[#0d1816] shadow-[0_12px_30px_rgba(183,239,125,0.16)]"
                      : "bg-[#55e5c0] text-[#071311] shadow-[0_12px_30px_rgba(85,229,192,0.15)] hover:bg-[#78edcf]"
                  }`}
                >
                  {isInVault ? <Check size={16} strokeWidth={2.5} /> : <ListPlus size={16} />}
                  {isInVault ? "In your vault" : "Add to vault"}
                </button>
                <label className="relative">
                  <span className="sr-only">Choose watch status</span>
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setIsInVault(true);
                    }}
                    className="h-11 appearance-none rounded-xl border border-white/15 bg-black/25 py-0 pl-4 pr-10 text-[12px] font-bold text-[#e1ebe7] outline-none backdrop-blur transition hover:border-[#55e5c0]/45"
                  >
                    <option>Want to watch</option>
                    <option>Currently watching</option>
                    <option>Completed</option>
                    <option>Paused</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-[14px] text-[#8fa09b]" />
                </label>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-4 text-[12px] font-bold text-[#c4d1cd] backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
                >
                  <Share2 size={15} />
                  {shared ? "Link copied" : "Share"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-1">
          <div className="flex items-center gap-1">
            {["Overview", "Reviews", "Watch notes"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-t-lg px-3 py-3 text-[12px] font-bold transition ${
                  activeTab === tab ? "text-[#f3f7f5]" : "text-[#71817e] hover:text-[#c5d2ce]"
                }`}
              >
                {tab}
                {tab === "Reviews" ? <span className="ml-1.5 text-[10px] text-[#55e5c0]">28</span> : null}
                {activeTab === tab ? <span className="absolute bottom-[-5px] left-3 right-3 h-0.5 rounded-full bg-[#55e5c0]" /> : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <span className="text-[11px] text-[#748480]">Your rating</span>
            <UserStars value={userRating} onChange={setUserRating} />
            {userRating > 0 ? <span className="text-[10px] font-bold text-[#b7ef7d]">{userRating}.0</span> : null}
          </div>
        </div>

        {activeTab === "Overview" ? (
          <div className="detail-info-grid">
            <section className="detail-panel p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#55e5c0]">The good stuff</p>
                  <h2 className="mt-2 text-[18px] font-extrabold tracking-[-0.04em] text-[#edf5f1]">A world worth getting lost in</h2>
                </div>
                <div className="hidden rounded-full border border-[#b7ef7d]/15 bg-[#b7ef7d]/[0.08] px-3 py-1.5 text-[10px] font-bold text-[#b7ef7d] sm:block">
                  Alex&apos;s match · 96%
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-[1.8] text-[#a9b8b3]">
                Denis Villeneuve&apos;s second chapter goes bigger without losing the intimate pulse. The sound design feels physical, the sand has a language of its own, and every quiet look between Paul and Chani carries the weight of a prophecy trying to become a choice.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
                {[
                  ["Director", "Denis Villeneuve"],
                  ["Written by", "Villeneuve, Spaihts"],
                  ["Studio", "Legendary"],
                  ["Released", "Mar 1, 2024"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="vault-mono text-[9px] uppercase tracking-[0.16em] text-[#63726f]">{label}</p>
                    <p className="mt-1.5 text-[11px] font-semibold leading-snug text-[#d0dad6]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["AM", "JT", "SK", "LN"].map((initials, index) => (
                      <div
                        key={initials}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#121819] text-[8px] font-extrabold text-[#0a1614]"
                        style={{ background: ["#b7ef7d", "#55e5c0", "#8cc8ff", "#ff846d"][index] }}
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-[#8d9c98]">Your circle is watching this</span>
                </div>
                <button type="button" onClick={() => setActiveTab("Reviews")} className="text-[11px] font-bold text-[#55e5c0] transition hover:text-[#b7ef7d]">
                  See all reviews
                </button>
              </div>
            </section>

            <section className="detail-panel detail-panel-soft p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#b7ef7d]">Your take</p>
                  <h2 className="mt-2 text-[18px] font-extrabold tracking-[-0.04em] text-[#edf5f1]">
                    {userRating ? `You gave it ${userRating}.0` : "What did it leave you with?"}
                  </h2>
                </div>
                <Quote size={22} className="text-[#b7ef7d]/55" />
              </div>
              {!showComposer ? (
                <button
                  type="button"
                  onClick={() => setShowComposer(true)}
                  className="mt-5 flex min-h-[96px] w-full items-start gap-3 rounded-xl border border-dashed border-[#b7ef7d]/25 bg-[#b7ef7d]/[0.04] p-4 text-left text-[12px] text-[#82938d] transition hover:border-[#b7ef7d]/55 hover:bg-[#b7ef7d]/[0.08]"
                >
                  <MessageCircle size={16} className="mt-0.5 text-[#b7ef7d]" />
                  Leave a note for future you...
                </button>
              ) : (
                <div className="mt-5">
                  <textarea
                    autoFocus
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="The sandworm scene changed my brain chemistry..."
                    className="min-h-[96px] w-full resize-none rounded-xl border border-[#b7ef7d]/25 bg-[#b7ef7d]/[0.05] p-4 text-[12px] leading-relaxed text-[#dce8e2] outline-none placeholder:text-[#71817e] focus:border-[#b7ef7d]/55"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowComposer(false)} className="rounded-lg px-3 py-2 text-[11px] font-bold text-[#81918c] hover:text-white">Cancel</button>
                    <button type="button" onClick={() => setShowComposer(false)} className="rounded-lg bg-[#b7ef7d] px-3 py-2 text-[11px] font-extrabold text-[#101a16] hover:bg-[#cefa9b]">Save note</button>
                  </div>
                </div>
              )}
              <div className="mt-6 flex items-center justify-between border-t border-[#b7ef7d]/10 pt-5">
                <span className="text-[11px] text-[#82938d]">Private to your vault</span>
                <Bookmark size={16} className="text-[#b7ef7d]" />
              </div>
            </section>
          </div>
        ) : activeTab === "Reviews" ? (
          <section className="detail-panel mt-6 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#55e5c0]">From the vault</p>
                <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.04em] text-[#edf5f1]">28 nerds left a signal</h2>
              </div>
              <button type="button" onClick={() => { setActiveTab("Overview"); setShowComposer(true); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-[#c7d4d0] transition hover:bg-white/[0.06] hover:text-white">
                <MessageCircle size={14} /> Write a review
              </button>
            </div>
            <div className="mt-3 grid gap-x-8 md:grid-cols-2">
              <ReviewRow initials="RM" name="Rhea M." date="2 days ago" score="98" copy="A thunderclap of a movie. It somehow feels mythic and deeply human at the same time." />
              <ReviewRow initials="DK" name="Dylan K." date="5 days ago" score="91" copy="The sound design should be illegal. Saw it in IMAX and my ribcage is still vibrating." />
              <ReviewRow initials="NS" name="Noah S." date="1 week ago" score="95" copy="Chani gets the final word, and the film is smarter for trusting her with it." />
              <ReviewRow initials="JT" name="Jules T." date="2 weeks ago" score="88" copy="Huge, patient, strange. The rare sequel that makes the first movie richer." />
            </div>
          </section>
        ) : (
          <section className="detail-panel mt-6 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#55e5c0]">Watch notes</p>
                <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.04em] text-[#edf5f1]">Keep the good bits close</h2>
              </div>
              <button type="button" onClick={() => { setActiveTab("Overview"); setShowComposer(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#55e5c0] px-3 py-2 text-[11px] font-extrabold text-[#071311] hover:bg-[#78edcf]">
                <ListPlus size={14} /> Add note
              </button>
            </div>
            <div className="mt-5 rounded-xl border border-[#55e5c0]/15 bg-[#55e5c0]/[0.05] p-4">
              <div className="flex gap-3">
                <Play size={16} className="mt-0.5 shrink-0 fill-[#55e5c0] text-[#55e5c0]" />
                <p className="text-[12px] leading-relaxed text-[#b8c9c3]">“The mystery of the voice is less interesting than what Paul chooses to do with it.”</p>
              </div>
              <p className="mt-3 pl-7 text-[10px] text-[#6e807b]">Saved from your watch session · 18:42</p>
            </div>
            <p className="mt-5 text-[12px] text-[#788984]">Your private notes will live here alongside memorable moments and rewatch prompts.</p>
          </section>
        )}

        <section className="mt-9">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#8cc8ff]">Series-ready anatomy</p>
              <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.05em] text-[#eef6f2]">If this world had more chapters</h2>
              <p className="mt-1 text-[12px] text-[#81918d]">The detail view stretches naturally from one film to a full season.</p>
            </div>
            <label className="relative hidden sm:block">
              <span className="sr-only">Select season</span>
              <select value={season} onChange={(event) => setSeason(event.target.value)} className="h-9 appearance-none rounded-lg border border-white/10 bg-white/[0.04] py-0 pl-3 pr-8 text-[11px] font-bold text-[#cbd8d3] outline-none hover:border-[#8cc8ff]/40">
                <option>Season 1</option>
                <option>Season 2</option>
                <option>Specials</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3 text-[#768783]" />
            </label>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {episodes.map((episode) => (
              <button key={episode.number} type="button" onClick={() => setSelectedEpisode(episode.number)} className={`episode-card text-left ${selectedEpisode === episode.number ? "border-[#8cc8ff]/35 bg-[#8cc8ff]/[0.08]" : ""}`}>
                <div className="flex items-center justify-between px-3 pt-3">
                  <span className="vault-mono text-[9px] tracking-[0.14em] text-[#8cc8ff]">E{episode.number}</span>
                  <span className="text-[10px] text-[#788984]">{episode.duration}</span>
                </div>
                <div className="px-3 pb-3 pt-5">
                  <p className="text-[11px] font-bold text-[#d7e3de]">{episode.title}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9 border-t border-white/[0.07] pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#ff846d]">Keep exploring</p>
              <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.05em] text-[#eef6f2]">More worlds with a pulse</h2>
            </div>
            <button type="button" onClick={() => setDiscoveryOpened((current) => !current)} className="hidden text-[11px] font-bold text-[#55e5c0] transition hover:text-[#b7ef7d] sm:block">
              {discoveryOpened ? "Close discovery shelf" : "Open discovery shelf"}
            </button>
          </div>
          {discoveryOpened ? <p className="mt-2 text-[11px] text-[#b7ef7d]">12 hand-picked matches added to this shelf.</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {similar.map((item) => (
              <MediaCard key={item.title} {...item} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}