import { ArrowRight, Bookmark, Check, ChevronRight, Flame, Play, Plus, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./Home.css";

type Media = {
  title: string;
  meta: string;
  type: "Movie" | "TV" | "Anime" | "Game";
  score: string;
  src: string;
};

const featured = {
  title: "Dune: Part Two",
  description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
  meta: ["2024", "2h 46m", "Sci-fi / Epic"],
  src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1800&q=85",
};

const trending: Media[] = [
  { title: "The Bear", meta: "Season 3 · 10 episodes", type: "TV", score: "9.1", src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=620&q=80" },
  { title: "Frieren", meta: "Season 1 · 28 episodes", type: "Anime", score: "9.4", src: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=620&q=80" },
  { title: "Hades II", meta: "Early access · PC", type: "Game", score: "9.2", src: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=620&q=80" },
  { title: "Challengers", meta: "2024 · 2h 11m", type: "Movie", score: "8.3", src: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=620&q=80" },
  { title: "Blue Eye Samurai", meta: "Season 1 · 8 episodes", type: "TV", score: "9.0", src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=620&q=80" },
  { title: "Alan Wake 2", meta: "2023 · PlayStation 5", type: "Game", score: "8.8", src: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=620&q=80" },
];

const newlyAdded: Media[] = [
  { title: "The Zone of Interest", meta: "2023 · Movie", type: "Movie", score: "8.5", src: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=620&q=80" },
  { title: "Delicious in Dungeon", meta: "Season 1 · Anime", type: "Anime", score: "8.7", src: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=620&q=80" },
  { title: "Pacific Drive", meta: "2024 · PC / PS5", type: "Game", score: "8.1", src: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=620&q=80" },
  { title: "Shōgun", meta: "Limited series · 10 episodes", type: "TV", score: "9.3", src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=620&q=80" },
];

const weekly = [
  { title: "Shōgun", meta: "TV · Limited series", score: "9.3", src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=160&q=80" },
  { title: "The First Slam Dunk", meta: "Anime · Movie", score: "9.0", src: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=160&q=80" },
  { title: "Baldur's Gate 3", meta: "Game · PC / Console", score: "9.6", src: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=160&q=80" },
  { title: "Past Lives", meta: "Movie · 2023", score: "8.4", src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=160&q=80" },
];

const suggestions = ["Dune: Part Two", "The Bear", "Frieren", "Baldur's Gate 3"];

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="section-label">{eyebrow}</p>
        <h2 className="mt-2 text-[21px] font-extrabold tracking-[-0.055em] text-[#edf4f1] sm:text-[24px]">{title}</h2>
      </div>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="group flex shrink-0 items-center gap-2 text-[11px] font-bold text-[#82928e] transition hover:text-[#55e5c0]">
          {action}<ArrowRight size={14} className="transition group-hover:translate-x-1" />
        </button>
      ) : null}
    </div>
  );
}

function MediaTile({ media, saved, onSave, delay }: { media: Media; saved: boolean; onSave: () => void; delay: number }) {
  return (
    <article className="media-tile" style={{ animationDelay: `${delay}ms` }}>
      <div className="poster-wrap">
        <img src={media.src} alt={`${media.title} poster`} className="h-full w-full object-cover" loading="lazy" />
        <div className="poster-shade" />
        <span className="tile-score">{media.score}</span>
        <span className="tile-type">{media.type}</span>
        <button type="button" className="tile-add" onClick={onSave} aria-label={saved ? `Remove ${media.title} from vault` : `Add ${media.title} to vault`}>
          {saved ? <Check size={14} /> : <Plus size={14} />}
        </button>
      </div>
      <h3 className="tile-title">{media.title}</h3>
      <p className="tile-meta">{media.meta}</p>
    </article>
  );
}

export function Home() {
  const [savedTitles, setSavedTitles] = useState<string[]>(["The Bear"]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const allMedia = useMemo(() => [...trending, ...newlyAdded], []);
  const filteredSuggestions = suggestions.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  const toggleSaved = (title: string) => {
    setSavedTitles((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
    setNotice(savedTitles.includes(title) ? `${title} removed from your vault` : `${title} added to your vault`);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const browse = (destination: string) => {
    setNotice(`${destination} is ready to explore`);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const searchMatches = query ? allMedia.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <AppLayout active="home">
      <div className="nerdvault-home">
        <div className="relative z-30 mb-6">
          <div className="flex h-11 items-center gap-3 rounded-xl border border-white/[0.1] bg-[#121a1b]/85 px-3 text-[#839490] shadow-[0_12px_35px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <Search size={16} className="shrink-0 text-[#55e5c0]" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search movies, shows, anime, games..."
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[#eaf4f0] outline-none placeholder:text-[#657570]"
              aria-label="Search your entertainment universe"
            />
            {query ? <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} className="text-[#6f807b] transition hover:text-white" aria-label="Clear search"><X size={15} /></button> : null}
            <span className="vault-mono hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-[#687572] sm:inline">⌘ K</span>
          </div>
          {searchOpen ? (
            <div className="vault-glass absolute left-0 right-0 top-14 rounded-2xl p-2 shadow-2xl">
              <div className="flex items-center justify-between px-3 pb-2 pt-2">
                <span className="vault-mono text-[9px] uppercase tracking-[0.16em] text-[#63736f]">{query ? "Matching titles" : "Quick search"}</span>
                <button type="button" onClick={() => setSearchOpen(false)} className="text-[#6d7d79] transition hover:text-white" aria-label="Close search suggestions"><X size={14} /></button>
              </div>
              {(query ? searchMatches : suggestions).length ? (query ? searchMatches : filteredSuggestions).map((item) => {
                const title = typeof item === "string" ? item : item.title;
                return (
                  <button key={title} type="button" onClick={() => { setQuery(title); setSearchOpen(false); setNotice(`Opening ${title}`); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-[#c9d7d3] transition hover:bg-white/[0.06] hover:text-[#55e5c0]">
                    <span className="flex items-center gap-3"><Search size={13} className="text-[#58736e]" />{title}</span>
                    <ChevronRight size={14} className="text-[#54635f]" />
                  </button>
                );
              }) : <p className="px-3 py-4 text-[12px] text-[#82918d]">No titles found. Try a different phrase.</p>}
            </div>
          ) : null}
        </div>

        <section className="home-hero" aria-labelledby="featured-title">
          <div className="hero-art" style={{ backgroundImage: `url("${featured.src}")` }} />
          <div className="hero-copy">
            <p className="hero-brow">Tonight's featured discovery</p>
            <h1 id="featured-title" className="hero-title">A story<br /><em>worth staying for.</em></h1>
            <p className="hero-description">{featured.description}</p>
            <div className="hero-meta">
              {featured.meta.map((item) => <span key={item}>{item}</span>)}
              <RatingPill value="9.1" />
            </div>
            <div className="hero-actions">
              <button type="button" onClick={() => toggleSaved(featured.title)} className="hero-action primary">
                {savedTitles.includes(featured.title) ? <Check size={15} /> : <Bookmark size={15} />}
                {savedTitles.includes(featured.title) ? "In your vault" : "Add to vault"}
              </button>
              <button type="button" onClick={() => setShowInfo(true)} className="hero-action secondary"><Play size={14} fill="currentColor" /> Watch trailer</button>
            </div>
          </div>
          <div className="hero-credit">Warner Bros. Pictures · 2024</div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="The pulse right now" title="Trending across your universe" action="Open Discover" onAction={() => browse("Discover")} />
          <div className="media-rail">
            {trending.map((media, index) => <MediaTile key={media.title} media={media} delay={index * 55} saved={savedTitles.includes(media.title)} onSave={() => toggleSaved(media.title)} />)}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="Fresh signal" title="Recently added" action="View My Vault" onAction={() => browse("My Vault")} />
          <div className="media-rail">
            {newlyAdded.map((media, index) => <MediaTile key={media.title} media={media} delay={index * 55} saved={savedTitles.includes(media.title)} onSave={() => toggleSaved(media.title)} />)}
          </div>
        </section>

        <section className="mt-12 pb-3">
          <div className="spotlight-grid">
            <div className="week-panel">
              <SectionHeading eyebrow="A good week for stories" title="Popular this week" />
              <div>
                {weekly.map((item, index) => (
                  <div className="week-row" key={item.title}>
                    <span className="week-number">0{index + 1}</span>
                    <div className="week-poster"><img src={item.src} alt={`${item.title} cover`} className="h-full w-full object-cover" loading="lazy" /></div>
                    <div className="week-copy"><strong>{item.title}</strong><span>{item.meta}</span></div>
                    <span className="week-score">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="activity-panel">
              <SectionHeading eyebrow="Your rhythm" title="Keep the streak alive" />
              <div className="activity-top">
                <div className="activity-icon"><Flame size={17} /></div>
                <p className="activity-copy"><strong>Three stories logged this week.</strong><br />One more and you hit your Sunday goal.</p>
              </div>
              <div className="activity-progress">
                <div className="mb-2 flex justify-between text-[10px] text-[#71817e]"><span>Weekly goal</span><span className="vault-mono text-[#b7ef7d]">3 / 4</span></div>
                <div className="activity-progress-bar"><span /></div>
              </div>
              <button type="button" onClick={() => browse("My Vault")} className="mt-5 flex items-center gap-2 text-[11px] font-bold text-[#55e5c0] transition hover:text-[#b7ef7d]">Choose something to log <ArrowRight size={14} /></button>
            </div>
          </div>
        </section>

        {showInfo ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050909]/75 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Dune trailer">
            <div className="vault-glass w-full max-w-[480px] rounded-3xl p-6">
              <div className="flex items-start justify-between gap-5">
                <div><p className="section-label text-[#55e5c0]">Preview moment</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em] text-[#f3f7f5]">Dune: Part Two</h2></div>
                <button type="button" onClick={() => setShowInfo(false)} className="rounded-full border border-white/10 p-2 text-[#8b9b97] transition hover:bg-white/10 hover:text-white" aria-label="Close trailer preview"><X size={16} /></button>
              </div>
              <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-[#0c1213]">
                <img src={featured.src} alt="Dune: Part Two cinematic still" className="h-full w-full object-cover opacity-65" />
                <div className="absolute" />
                <div className="relative -mt-[32%] flex justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#55e5c0] text-[#071311]"><Play size={18} fill="currentColor" /></div></div>
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-[#9aaba6]">A two-minute look at Denis Villeneuve's desert epic. Press play when you're ready.</p>
              <button type="button" onClick={() => { setShowInfo(false); setNotice("Trailer queued for your next session"); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#55e5c0] py-3 text-[11px] font-extrabold text-[#071311] transition hover:bg-[#b7ef7d]"><Play size={14} fill="currentColor" /> Queue trailer</button>
            </div>
          </div>
        ) : null}

        {notice ? <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-[#55e5c0]/25 bg-[#122321]/95 px-4 py-2.5 text-[11px] font-bold text-[#d8f8e9] shadow-2xl backdrop-blur-xl">{notice}</div> : null}
      </div>
    </AppLayout>
  );
}

function RatingPill({ value }: { value: string }) {
  return <span className="flex items-center gap-1.5"><Sparkles size={11} className="text-[#b7ef7d]" /><b>{value}</b></span>;
}