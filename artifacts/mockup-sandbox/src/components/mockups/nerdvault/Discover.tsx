import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowRight, Check, ChevronDown, Clock3, Flame, Gamepad2, Heart, LayoutGrid, ListFilter, Play, Plus, Search, Sparkles, Tv, X } from "lucide-react";
import { AppLayout, MediaCard, Poster, Rating } from "./_shared/AppLayout";
import "./Discover.css";

type MediaType = "All" | "Movies" | "TV" | "Anime" | "Games";
type SortMode = "Trending" | "Highest rated" | "Recently added";

type MediaItem = {
  title: string;
  meta: string;
  type: Exclude<MediaType, "All">;
  score: string;
  src: string;
  genre: string;
  accent?: string;
};

const artwork = {
  dune: "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  poorThings: "https://image.tmdb.org/t/p/w780/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
  cyberpunk: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900_2x.jpg",
  oppenheimer: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  civilWar: "https://image.tmdb.org/t/p/w780/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
  pastLives: "https://image.tmdb.org/t/p/w780/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
  severance: "https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
  arcane: "https://image.tmdb.org/t/p/w780/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
  fallout: "https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgGv3LxKa.jpg",
  blueEyeSamurai: "https://image.tmdb.org/t/p/w780/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
  lastOfUs: "https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgGv3LxKa.jpg",
  shogun: "https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
  hades: "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900_2x.jpg",
  baldur: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/library_600x900_2x.jpg",
  alanWake: "https://cdn.cloudflare.steamstatic.com/steam/apps/1087100/library_600x900_2x.jpg",
  hollowKnight: "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900_2x.jpg",
  ori: "https://cdn.cloudflare.steamstatic.com/steam/apps/1057090/library_600x900_2x.jpg",
  celeste: "https://cdn.cloudflare.steamstatic.com/steam/apps/504230/library_600x900_2x.jpg",
};

const catalog: MediaItem[] = [
  { title: "Dune: Part Two", meta: "2024 · Sci-fi", type: "Movies", score: "94", src: artwork.dune, genre: "Sci-fi" },
  { title: "Poor Things", meta: "2023 · Fantasy", type: "Movies", score: "91", src: artwork.poorThings, genre: "Fantasy" },
  { title: "Cyberpunk 2077", meta: "Game · RPG", type: "Games", score: "92", src: artwork.cyberpunk, genre: "RPG" },
  { title: "Oppenheimer", meta: "2023 · Drama", type: "Movies", score: "93", src: artwork.oppenheimer, genre: "Drama" },
  { title: "Civil War", meta: "2024 · Thriller", type: "Movies", score: "86", src: artwork.civilWar, genre: "Thriller" },
  { title: "Past Lives", meta: "2023 · Romance", type: "Movies", score: "89", src: artwork.pastLives, genre: "Romance" },
  { title: "Severance", meta: "Season 2 · Apple TV+", type: "TV", score: "96", src: artwork.severance, genre: "Mystery" },
  { title: "Arcane", meta: "Season 2 · Netflix", type: "TV", score: "95", src: artwork.arcane, genre: "Animation" },
  { title: "Fallout", meta: "Season 1 · Prime Video", type: "TV", score: "90", src: artwork.fallout, genre: "Sci-fi" },
  { title: "Blue Eye Samurai", meta: "Season 1 · Netflix", type: "Anime", score: "94", src: artwork.blueEyeSamurai, genre: "Action" },
  { title: "The Last of Us", meta: "Season 2 · HBO", type: "TV", score: "92", src: artwork.lastOfUs, genre: "Drama" },
  { title: "Shōgun", meta: "Season 1 · FX", type: "TV", score: "91", src: artwork.shogun, genre: "Drama" },
  { title: "Hades", meta: "Game · Roguelike", type: "Games", score: "96", src: artwork.hades, genre: "Indie" },
  { title: "Baldur's Gate 3", meta: "Game · RPG", type: "Games", score: "97", src: artwork.baldur, genre: "RPG" },
  { title: "Alan Wake 2", meta: "Game · Horror", type: "Games", score: "90", src: artwork.alanWake, genre: "Horror" },
  { title: "Hollow Knight", meta: "Game · Metroidvania", type: "Games", score: "94", src: artwork.hollowKnight, genre: "Indie" },
  { title: "Ori and the Will of the Wisps", meta: "Game · Adventure", type: "Games", score: "91", src: artwork.ori, genre: "Adventure" },
  { title: "Celeste", meta: "Game · Platformer", type: "Games", score: "93", src: artwork.celeste, genre: "Indie" },
];

const typeFilters: Array<{ label: MediaType; icon: typeof LayoutGrid }> = [
  { label: "All", icon: LayoutGrid },
  { label: "Movies", icon: Play },
  { label: "TV", icon: Tv },
  { label: "Anime", icon: Sparkles },
  { label: "Games", icon: Gamepad2 },
];

const genres = [
  { name: "Sci-fi", count: "128 titles", color: "#1d5755", art: artwork.dune },
  { name: "Drama", count: "214 titles", color: "#314c5a", art: artwork.oppenheimer },
  { name: "Animation", count: "96 titles", color: "#345644", art: artwork.arcane },
  { name: "Horror", count: "73 titles", color: "#443748", art: artwork.alanWake },
  { name: "Indie games", count: "184 titles", color: "#5b4938", art: artwork.hades },
];

function FilterPill({ label, active, onClick, Icon }: { label: MediaType; active: boolean; onClick: () => void; Icon: typeof LayoutGrid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition ${
        active ? "border-[#55e5c0]/35 bg-[#55e5c0] text-[#071311]" : "border-white/[0.09] bg-white/[0.035] text-[#879692] hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <Icon size={14} strokeWidth={active ? 2.4 : 1.8} />
      {label}
    </button>
  );
}

function InlineMediaCard({ item, saved, onToggle }: { item: MediaItem; saved: boolean; onToggle: () => void }) {
  return (
    <article className="group min-w-[138px] flex-1">
      <div className="poster-shine relative aspect-[2/3] overflow-hidden rounded-[15px] border border-white/[0.06] bg-[#171d1f] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
        <Poster src={item.src} alt={`${item.title} poster`} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060b0c]/90 via-transparent to-transparent" />
        <span className="absolute right-2 top-2 rounded-full bg-[#071311]/80 px-2 py-1 text-[10px] font-extrabold text-[#b7ef7d] backdrop-blur">{item.score}</span>
        <button type="button" aria-label={`${saved ? "Remove" : "Save"} ${item.title}`} onClick={onToggle} className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur transition ${saved ? "border-[#55e5c0]/30 bg-[#55e5c0] text-[#071311]" : "border-white/15 bg-black/40 text-white/70 hover:bg-white/20 hover:text-white"}`}>
          {saved ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
        </button>
      </div>
      <h3 className="mt-3 truncate text-[12px] font-bold text-[#edf4f0]">{item.title}</h3>
      <p className="mt-1 truncate text-[10px] text-[#7d8d89]">{item.meta}</p>
    </article>
  );
}

export function Discover() {
  const [activeFilter, setActiveFilter] = useState<MediaType>("All");
  const [sortMode, setSortMode] = useState<SortMode>("Trending");
  const [saved, setSaved] = useState<string[]>(["Hades"]);
  const [genre, setGenre] = useState("All genres");
  const [showFilters, setShowFilters] = useState(false);
  const [featureDetails, setFeatureDetails] = useState(false);

  const filteredCatalog = useMemo(() => {
    const byType = activeFilter === "All" ? catalog : catalog.filter((item) => item.type === activeFilter);
    const byGenre = genre === "All genres" ? byType : byType.filter((item) => item.genre === genre);
    return [...byGenre].sort((a, b) => {
      if (sortMode === "Highest rated") return Number(b.score) - Number(a.score);
      if (sortMode === "Recently added") return a.title.localeCompare(b.title);
      return catalog.indexOf(a) - catalog.indexOf(b);
    });
  }, [activeFilter, genre, sortMode]);

  const toggleSaved = (title: string) => {
    setSaved((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  };

  const row = (title: string, subtitle: string, items: MediaItem[]) => (
    <section className="mt-12" key={title}>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-[18px] font-extrabold tracking-[-0.04em] text-[#f0f6f2]">{title}</h2>
          <p className="mt-1 text-[11px] text-[#71807d]">{subtitle}</p>
        </div>
        <button type="button" onClick={() => { setActiveFilter("All"); setGenre("All genres"); setShowFilters(false); }} className="group flex items-center gap-1.5 text-[11px] font-bold text-[#8ea19b] transition hover:text-[#55e5c0]">
          See all <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </button>
      </div>
      <div className="hide-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {items.map((item) => <InlineMediaCard key={item.title} item={item} saved={saved.includes(item.title)} onToggle={() => toggleSaved(item.title)} />)}
      </div>
    </section>
  );

  return (
    <AppLayout active="discover" eyebrow="A world worth getting lost in" title="Discover" action={<button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] px-3.5 py-2.5 text-[11px] font-bold text-[#a6b5b0] transition hover:border-[#55e5c0]/30 hover:text-[#55e5c0]"><ListFilter size={15} /> Filters</button>}>
      <div className="discover-page">
        <section className="discover-hero relative min-h-[355px] overflow-hidden rounded-[24px] border border-white/[0.08] px-6 py-8 sm:px-10 sm:py-10">
          <div className="relative z-10 max-w-[480px]">
            <div className="mb-5 flex items-center gap-2 text-[#b7ef7d]">
              <Flame size={16} fill="currentColor" />
              <span className="vault-mono text-[9px] uppercase tracking-[0.22em]">Tonight's signal</span>
            </div>
            <p className="vault-mono mb-3 text-[10px] uppercase tracking-[0.18em] text-[#88a59b]">Featured in the vault</p>
            <h2 className="text-[38px] font-extrabold leading-[0.98] tracking-[-0.07em] text-[#f4f7f4] sm:text-[52px]">A universe<br />in motion.</h2>
            <p className="mt-5 max-w-[350px] text-[13px] leading-relaxed text-[#afbbb6]">From desert epics to beautifully broken worlds, these are the stories with a pulse this week.</p>
            <div className="mt-7 flex items-center gap-3">
              <button type="button" onClick={() => toggleSaved("Dune: Part Two")} className="flex items-center gap-2 rounded-xl bg-[#55e5c0] px-4 py-2.5 text-[11px] font-extrabold text-[#071311] transition hover:bg-[#b7ef7d]"><Plus size={15} /> {saved.includes("Dune: Part Two") ? "In your vault" : "Add to vault"}</button>
              <button type="button" onClick={() => setFeatureDetails((current) => !current)} className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-[11px] font-bold text-[#d5dfdc] backdrop-blur transition hover:bg-white/10"><Play size={14} fill="currentColor" /> {featureDetails ? "Hide details" : "View details"}</button>
            </div>
          </div>
          {featureDetails ? (
            <div className="absolute bottom-5 left-6 z-20 max-w-[300px] rounded-xl border border-white/10 bg-[#071311]/85 p-3 text-[11px] leading-relaxed text-[#c4d2cc] backdrop-blur sm:left-10">
              Denis Villeneuve's desert epic returns with a larger canvas, stranger visions, and one of the year's most transportive scores.
            </div>
          ) : null}
          <div className="absolute bottom-6 right-7 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-[#071311]/60 px-3 py-2 backdrop-blur sm:flex">
            <Rating value="94" label="community score" />
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-4 border-b border-white/[0.07] pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {typeFilters.map(({ label, icon: Icon }) => <FilterPill key={label} label={label} Icon={Icon} active={activeFilter === label} onClick={() => setActiveFilter(label)} />)}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6d7d79]" size={14} />
              <select aria-label="Sort discover results" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-9 appearance-none rounded-lg border border-white/[0.09] bg-white/[0.035] pl-9 pr-8 text-[11px] font-bold text-[#aab8b3] outline-none transition hover:border-white/20 focus:border-[#55e5c0]/40">
                <option>Trending</option>
                <option>Highest rated</option>
                <option>Recently added</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6d7d79]" size={13} />
            </div>
            {showFilters ? <button type="button" onClick={() => { setGenre("All genres"); setActiveFilter("All"); }} className="flex h-9 items-center gap-1.5 rounded-lg border border-[#ff846d]/20 bg-[#ff846d]/[0.07] px-3 text-[10px] font-bold text-[#ffad9d] transition hover:bg-[#ff846d]/[0.13]"><X size={13} /> Reset</button> : null}
          </div>
        </section>

        {showFilters ? (
          <section className="vault-glass mt-4 flex flex-wrap items-center gap-2 rounded-2xl p-4">
            <span className="vault-mono mr-2 text-[9px] uppercase tracking-[0.18em] text-[#6e817b]">Browse by genre</span>
            {["All genres", ...Array.from(new Set(catalog.map((item) => item.genre)))].map((item) => (
              <button key={item} type="button" onClick={() => setGenre(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${genre === item ? "bg-[#b7ef7d] text-[#071311]" : "bg-white/[0.05] text-[#8e9d99] hover:bg-white/10 hover:text-white"}`}>{item}</button>
            ))}
          </section>
        ) : null}

        {row("Trending now", "The titles everyone is passing around", catalog.slice(0, 6))}
        {row("Because you liked Arrival", "Slow-burn worlds, big questions", catalog.filter((item) => ["Dune: Part Two", "Severance", "Hades", "Past Lives", "Alan Wake 2"].includes(item.title)))}

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold tracking-[-0.04em] text-[#f0f6f2]">Browse by mood</h2>
              <p className="mt-1 text-[11px] text-[#71807d]">Pick a doorway. See where it leads.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {genres.map((item) => (
              <button key={item.name} type="button" onClick={() => { setGenre(item.name); setShowFilters(true); }} className="group relative min-h-[116px] overflow-hidden rounded-2xl border border-white/[0.08] p-4 text-left transition hover:-translate-y-1 hover:border-[#55e5c0]/25" style={{ backgroundColor: item.color }}>
                <img src={item.art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen transition duration-500 group-hover:scale-110 group-hover:opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="relative z-10 mt-10">
                  <p className="text-[13px] font-extrabold text-white">{item.name}</p>
                  <p className="mt-1 text-[10px] text-white/60">{item.count}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-extrabold tracking-[-0.04em] text-[#f0f6f2]">{activeFilter === "All" ? "The full signal" : `${activeFilter} worth your time`}</h2>
              <p className="mt-1 text-[11px] text-[#71807d]">{filteredCatalog.length} hand-picked titles · {sortMode.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#687976]"><Clock3 size={13} /> Updated just now</div>
          </div>
          {filteredCatalog.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filteredCatalog.map((item) => <MediaCard key={item.title} title={item.title} meta={item.meta} src={item.src} type={item.type} score={item.score} />)}
            </div>
          ) : (
            <div className="vault-glass flex min-h-[210px] flex-col items-center justify-center rounded-2xl text-center">
              <Search size={22} className="mb-3 text-[#55e5c0]" />
              <p className="text-sm font-bold text-[#e2ebe7]">Nothing in this corner yet</p>
              <p className="mt-1 text-[11px] text-[#7d8d89]">Try another genre or reset your filters.</p>
            </div>
          )}
        </section>

        <section className="mt-14 border-t border-white/[0.07] pt-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="vault-mono text-[9px] uppercase tracking-[0.2em] text-[#55e5c0]">Your signal</p>
              <h2 className="mt-2 text-[18px] font-extrabold tracking-[-0.04em] text-[#edf4f0]">Keep the good stuff close.</h2>
            </div>
            <Heart size={19} className="text-[#ff846d]" fill="currentColor" />
          </div>
          <div className="mt-4 rounded-2xl border border-[#55e5c0]/15 bg-[#55e5c0]/[0.055] p-4 text-[11px] leading-relaxed text-[#9aada6]">
            You have {saved.length} title{saved.length === 1 ? "" : "s"} waiting in your vault. Discover something new, then give it a home.
          </div>
        </section>
      </div>
    </AppLayout>
  );
}