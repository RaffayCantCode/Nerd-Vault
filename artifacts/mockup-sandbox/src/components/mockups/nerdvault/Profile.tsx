import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Film,
  Gamepad2,
  Heart,
  Library,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Share2,
  Star,
  Tv,
  Users,
} from "lucide-react";
import { AppLayout, MediaCard, Poster, Rating } from "./_shared/AppLayout";
import "./Profile.css";

type ActivityFilter = "all" | "reviews" | "logged";

const art = {
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=88",
  dune: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=85",
  arcane: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=700&q=85",
  elden: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=700&q=85",
  spirited: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=85",
  blade: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=85",
  noCountry: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=85",
  arrival: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=85",
  hollow: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85",
  neon: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=700&q=85",
};

const favorites = [
  { title: "Dune: Part Two", meta: "2024 · Film", src: art.dune, score: "9.4" },
  { title: "Arcane", meta: "2021 · Series", src: art.arcane, score: "9.7" },
  { title: "Elden Ring", meta: "2022 · Game", src: art.elden, score: "9.5" },
  { title: "Spirited Away", meta: "2001 · Anime", src: art.spirited, score: "9.8" },
];

const recent = [
  { title: "Blade Runner 2049", meta: "Watched yesterday", src: art.blade, type: "Film", score: "8.8" },
  { title: "No Country for Old Men", meta: "Watched 3 days ago", src: art.noCountry, type: "Film", score: "9.1" },
  { title: "Arrival", meta: "Watched last week", src: art.arrival, type: "Film", score: "9.0" },
  { title: "Hollow Knight", meta: "Played last week", src: art.hollow, type: "Game", score: "9.3" },
  { title: "Tron: Identity", meta: "Played 2 weeks ago", src: art.neon, type: "Game", score: "7.9" },
];

const activities = [
  { kind: "review", title: "Reviewed Dune: Part Two", detail: "“A cathedral of sand, sound, and impossible scale.”", time: "2h ago", src: art.dune, score: "9.4" },
  { kind: "logged", title: "Logged Elden Ring", detail: "Completed · 126 hours", time: "Yesterday", src: art.elden, score: "9.5" },
  { kind: "review", title: "Reviewed Pluto", detail: "“Quietly devastating, right down to the last frame.”", time: "3 days ago", src: art.arcane, score: "8.8" },
  { kind: "logged", title: "Added 4 titles to the watchlist", detail: "The Bear · Silo · The Wailing · Outer Wilds", time: "5 days ago", src: art.spirited },
];

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="vault-mono text-[9px] uppercase tracking-[0.24em] text-[#55e5c0]">{eyebrow}</p>
        <h2 className="mt-2 text-[21px] font-extrabold tracking-[-0.045em] text-[#f3f7f5]">{title}</h2>
      </div>
      {action ? (
        <button type="button" className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#8fa09b] transition hover:text-[#55e5c0]">
          {action} <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[25px] font-extrabold tracking-[-0.06em]" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7e8b89]">{label}</div>
    </div>
  );
}

export function Profile() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [shared, setShared] = useState(false);
  const [savedFavorites, setSavedFavorites] = useState<string[]>(["Dune: Part Two", "Arcane", "Elden Ring", "Spirited Away"]);

  const filteredActivities = useMemo(
    () => activities.filter((item) => activityFilter === "all" || item.kind === activityFilter),
    [activityFilter],
  );

  const toggleFavorite = (title: string) => {
    setSavedFavorites((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard?.writeText("nerdvault.example/alexmorgan");
    } catch {
      // Clipboard access is unavailable in some embedded previews.
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
  };

  return (
    <AppLayout active="profile">
      <div className="vault-profile pb-14">
        <section className="profile-hero relative overflow-hidden rounded-[22px] border border-white/[0.09] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-[#55e5c0]/10" />
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full border border-[#b7ef7d]/10" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-5 sm:gap-7">
              <div className="relative h-[82px] w-[82px] shrink-0 rounded-[24px] border border-[#55e5c0]/40 bg-[#183432] p-1 shadow-[0_0_38px_rgba(85,229,192,0.18)] sm:h-[106px] sm:w-[106px]">
                <Poster src={art.avatar} alt="Alex Morgan" className="rounded-[19px]" />
                <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-4 border-[#152220] bg-[#b7ef7d] text-[#102019]"><Check size={13} strokeWidth={3} /></span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[29px] font-extrabold tracking-[-0.07em] text-[#f3f7f5] sm:text-[38px]">Alex Morgan</h1>
                  <span className="vault-mono rounded-md border border-[#55e5c0]/20 bg-[#55e5c0]/[0.08] px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#55e5c0]">Level 18</span>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-[#91a19d]">@alexmorgan <span className="px-1 text-[#52615e]">·</span> San Francisco, CA</p>
                <p className="mt-3 max-w-[530px] text-[12px] leading-relaxed text-[#b7c4c0]">Collecting stories that leave a mark. Usually found somewhere between a prestige drama and a difficult boss fight.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
              <button type="button" aria-label="Share profile" onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#a7b5b1] transition hover:border-[#55e5c0]/35 hover:bg-[#55e5c0]/10 hover:text-[#55e5c0]">
                {shared ? <Check size={16} /> : <Share2 size={16} />}
              </button>
              <button type="button" onClick={() => setFollowing((value) => !value)} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[12px] font-extrabold transition ${following ? "bg-[#b7ef7d] text-[#0b1714]" : "border border-[#55e5c0]/35 bg-[#55e5c0]/10 text-[#55e5c0] hover:bg-[#55e5c0]/20"}`}>
                {following ? <Check size={15} /> : <Plus size={15} />}
                {following ? "Following" : "Follow"}
              </button>
              <button type="button" aria-label="More profile actions" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#a7b5b1] transition hover:bg-white/[0.09] hover:text-white"><MoreHorizontal size={17} /></button>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-y-5 border-t border-white/[0.08] pt-6 sm:grid-cols-4 sm:gap-0">
            <Stat value="247" label="Titles logged" accent="#55e5c0" />
            <Stat value="86" label="Reviews written" accent="#b7ef7d" />
            <Stat value="1,842" label="Hours explored" accent="#8cc8ff" />
            <Stat value="94.6k" label="Nerd score" accent="#ff846d" />
          </div>
        </section>

        <div className="profile-scroll mt-8 flex gap-7 overflow-x-auto border-b border-white/[0.08] px-1">
          {["Overview", "Reviews", "Folders", "Activity"].map((tab) => (
            <button key={tab} type="button" data-active={activeTab === tab} onClick={() => setActiveTab(tab)} className="profile-tab shrink-0 pb-3 text-[12px] font-bold text-[#83918e] transition hover:text-white data-[active=true]:text-[#f3f7f5]">{tab}</button>
          ))}
          <button type="button" onClick={() => setEditing((value) => !value)} className="ml-auto flex shrink-0 items-center gap-1.5 pb-3 text-[11px] font-bold text-[#83918e] transition hover:text-[#55e5c0]"><Pencil size={13} /> {editing ? "Done editing" : "Edit profile"}</button>
        </div>

        {editing ? (
          <div className="vault-glass mt-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[12px] font-bold text-[#f3f7f5]">Profile details</p><p className="mt-1 text-[11px] text-[#899895]">Your profile is public. Keep the signal, lose the noise.</p></div>
            <div className="flex gap-2"><button type="button" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-[#b9c8c3] hover:bg-white/[0.09]">Change avatar</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg bg-[#55e5c0] px-3 py-2 text-[11px] font-extrabold text-[#081512]">Save changes</button></div>
          </div>
        ) : null}

        {activeTab === "Overview" ? (
          <>
            <section className="mt-9">
              <SectionHeading eyebrow="The essential four" title="Favorite 4" action={`${savedFavorites.length} saved`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {favorites.map((item, index) => (
                  <div key={item.title} className="group relative min-w-0">
                    <div className="poster-lift relative aspect-[0.79] overflow-hidden rounded-[15px] border border-white/[0.08] bg-[#161d1e]">
                      <Poster src={item.src} alt={`${item.title} cover`} className="transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute left-3 top-3 vault-mono text-[10px] text-white/55">0{index + 1}</span>
                      <button type="button" aria-label={`${savedFavorites.includes(item.title) ? "Remove" : "Add"} ${item.title} from favorites`} onClick={() => toggleFavorite(item.title)} className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur transition ${savedFavorites.includes(item.title) ? "bg-[#ff846d] text-[#1f110e]" : "bg-black/45 text-white/75 hover:bg-[#ff846d] hover:text-[#1f110e]"}`}><Heart size={13} fill={savedFavorites.includes(item.title) ? "currentColor" : "none"} /></button>
                      <div className="absolute bottom-3 left-3"><p className="text-[13px] font-extrabold leading-tight text-white">{item.title}</p><p className="mt-1 text-[10px] text-white/60">{item.meta}</p></div>
                    </div>
                    <div className="mt-2 flex items-center justify-between"><Rating value={item.score} label="Score" /><button type="button" className="text-[#647470] transition hover:text-white" aria-label={`More options for ${item.title}`}><MoreHorizontal size={15} /></button></div>
                  </div>
                ))}
              </div>
            </section>

            <div className="profile-grid mt-12">
              <section>
                <SectionHeading eyebrow="A little proof" title="Latest reviews" action="View all" />
                <div className="space-y-3">
                  {activities.filter((item) => item.kind === "review").map((review) => (
                    <article key={review.title} className="vault-glass flex gap-4 rounded-2xl p-3.5 transition hover:border-[#55e5c0]/20 hover:bg-[#55e5c0]/[0.04]">
                      <div className="h-[74px] w-[54px] shrink-0 overflow-hidden rounded-lg"><Poster src={review.src} alt="" /></div>
                      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="truncate text-[13px] font-extrabold text-[#f0f6f3]">{review.title.replace("Reviewed ", "")}</h3><p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[#647470]">Film review · {review.time}</p></div><Rating value={review.score ?? "—"} label="" /></div><p className="mt-2 truncate text-[11px] italic text-[#9eada8]">{review.detail}</p></div>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                <SectionHeading eyebrow="Curated corners" title="Public folders" action="See all" />
                <div className="space-y-3">
                  {[
                    { name: "Rainy day cinema", count: "18 titles", color: "from-[#223f46] to-[#101d22]", icon: Film },
                    { name: "Games that changed me", count: "11 titles", color: "from-[#293f2b] to-[#131e18]", icon: Gamepad2 },
                    { name: "Slow-burn Sundays", count: "24 titles", color: "from-[#49302d] to-[#211917]", icon: Clock3 },
                  ].map(({ name, count, color, icon: Icon }) => (
                    <button type="button" key={name} className={`flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-br ${color} p-3.5 text-left transition hover:-translate-y-0.5 hover:border-white/20`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-[#d9f7e3]"><Icon size={18} strokeWidth={1.7} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold text-[#eef7f3]">{name}</span><span className="mt-1 block text-[10px] text-white/55">{count} · Public</span></span><ChevronRight size={15} className="text-white/45" />
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="mt-12">
              <SectionHeading eyebrow="Last logged" title="Recently watched & played" action="Open vault" />
              <div className="media-rail pb-2">
                {recent.map((item) => <div key={item.title} className="poster-lift"><MediaCard {...item} compact /></div>)}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "Reviews" ? (
          <section className="mt-9"><SectionHeading eyebrow="86 dispatches" title="Reviews by Alex" /><div className="grid gap-3 md:grid-cols-2">{activities.filter((item) => item.kind === "review").concat(activities.filter((item) => item.kind === "review")).map((review, index) => <article key={`${review.title}-${index}`} className="vault-glass rounded-2xl p-4"><div className="flex items-center gap-3"><div className="h-12 w-9 overflow-hidden rounded-md"><Poster src={review.src} alt="" /></div><div className="min-w-0 flex-1"><h3 className="truncate text-[13px] font-extrabold text-[#f3f7f5]">{review.title.replace("Reviewed ", "")}</h3><p className="mt-1 text-[10px] text-[#71807c]">{review.time} · Film</p></div><Rating value={review.score ?? "—"} label="" /></div><p className="mt-4 text-[12px] italic leading-relaxed text-[#a8b7b2]">{review.detail}</p></article>)}</div></section>
        ) : null}

        {activeTab === "Folders" ? (
          <section className="mt-9"><SectionHeading eyebrow="Public collections" title="Folders worth wandering through" /><div className="grid gap-4 sm:grid-cols-2">{["Rainy day cinema", "Games that changed me", "Slow-burn Sundays", "Animated masterpieces"].map((name, index) => <button type="button" key={name} className="group relative min-h-[170px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#17201f] p-5 text-left transition hover:-translate-y-1 hover:border-[#55e5c0]/30"><div className={`absolute inset-0 bg-gradient-to-br ${["from-[#244a4b]", "from-[#30482f]", "from-[#563631]", "from-[#3d355b]"][index]} to-[#111617] opacity-80`} /><div className="relative flex h-full flex-col justify-end"><Library size={18} className="mb-auto text-[#b7ef7d]" /><h3 className="text-[16px] font-extrabold text-white">{name}</h3><p className="mt-1 text-[11px] text-white/55">{[18, 11, 24, 31][index]} titles · Public</p></div></button>)}</div></section>
        ) : null}

        {activeTab === "Activity" ? (
          <section className="mt-9"><div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="The paper trail" title="Activity overview" /><div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1"><ListFilter size={14} className="ml-2 text-[#6d7c78]" />{(["all", "reviews", "logged"] as ActivityFilter[]).map((filter) => <button type="button" key={filter} onClick={() => setActivityFilter(filter)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold capitalize transition ${activityFilter === filter ? "bg-white/[0.1] text-[#f3f7f5]" : "text-[#71807c] hover:text-white"}`}>{filter}</button>)}</div></div><div className="mt-2 max-w-3xl space-y-0">{filteredActivities.map((item) => <article key={item.title} className="activity-line flex gap-4 py-4"><div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#55e5c0]/25 bg-[#16302c] text-[#55e5c0]">{item.kind === "review" ? <MessageCircle size={14} /> : <Activity size={14} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-[12px] font-extrabold text-[#edf5f2]">{item.title}</h3><span className="vault-mono text-[9px] text-[#687773]">{item.time}</span></div><p className="mt-1 text-[11px] text-[#879691]">{item.detail}</p></div>{item.src ? <div className="h-11 w-8 shrink-0 overflow-hidden rounded-md"><Poster src={item.src} alt="" /></div> : null}</article>)}</div></section>
        ) : null}

        <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/[0.07] pt-5 text-[10px] text-[#62716d] sm:flex-row sm:items-center"><span className="vault-mono uppercase tracking-[0.18em]">Alex's universe · public since 2021</span><span className="flex items-center gap-3"><span><Users size={12} className="mr-1 inline" /> 142 followers</span><span><Star size={12} className="mr-1 inline text-[#b7ef7d]" /> 4.8 profile score</span></span></footer>
      </div>
    </AppLayout>
  );
}