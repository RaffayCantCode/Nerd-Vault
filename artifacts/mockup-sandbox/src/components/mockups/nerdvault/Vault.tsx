import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Folder,
  Heart,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  Play,
  Plus,
  X,
} from "lucide-react";
import { AppLayout, Poster, Rating } from "./_shared/AppLayout";
import "./Vault.css";

type MediaKind = "Movie" | "TV" | "Anime" | "Game";

type MediaItem = {
  title: string;
  meta: string;
  kind: MediaKind;
  score: string;
  image: string;
};

const images = {
  dune: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=85",
  portrait: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=85",
  city: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85",
  mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=85",
  neon: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85",
  ocean: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85",
  game: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=85",
  controller: "https://images.unsplash.com/photo-1603481546238-487240415921?auto=format&fit=crop&w=800&q=85",
  film: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=85",
  noir: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=85",
};

const favorites: MediaItem[] = [
  { title: "The Grand Budapest Hotel", meta: "2014 · 1h 40m", kind: "Movie", score: "9.4", image: images.film },
  { title: "Scavengers Reign", meta: "2023 · 1 season", kind: "TV", score: "9.1", image: images.mountains },
  { title: "Frieren: Beyond Journey’s End", meta: "2023 · 28 episodes", kind: "Anime", score: "9.6", image: images.portrait },
  { title: "Hades II", meta: "Early Access · PC", kind: "Game", score: "9.2", image: images.game },
];

const continueItems = [
  { title: "Shōgun", detail: "Episode 6 of 10", progress: 62, image: images.city, kind: "TV" as MediaKind, accent: "#55e5c0" },
  { title: "Alan Wake 2", detail: "Chapter 5 · 14h played", progress: 44, image: images.noir, kind: "Game" as MediaKind, accent: "#b7ef7d" },
  { title: "Monster", detail: "Episode 31 of 74", progress: 41, image: images.dune, kind: "Anime" as MediaKind, accent: "#8cc8ff" },
];

const wishlist: MediaItem[] = [
  { title: "Civil War", meta: "Movie · 2024", kind: "Movie", score: "8.3", image: images.ocean },
  { title: "The Bear", meta: "TV · 3 seasons", kind: "TV", score: "8.9", image: images.city },
  { title: "Metaphor: ReFantazio", meta: "Game · Coming Oct 11", kind: "Game", score: "—", image: images.controller },
  { title: "Look Back", meta: "Anime · 2024", kind: "Anime", score: "8.8", image: images.portrait },
];

const completed = [
  { title: "Perfect Days", meta: "Movie · completed yesterday", image: images.mountains },
  { title: "Blue Eye Samurai", meta: "TV · completed May 18", image: images.neon },
  { title: "Animal Well", meta: "Game · completed May 14", image: images.game },
  { title: "Delicious in Dungeon", meta: "Anime · completed May 09", image: images.dune },
];

const recommendations = [
  { title: "The Green Knight", meta: "Because you liked Dune", image: images.mountains, label: "MOODY EPIC", tint: "#b7ef7d" },
  { title: "Kentucky Route Zero", meta: "A slow-burn game for your shelf", image: images.controller, label: "ODD & TENDER", tint: "#8cc8ff" },
  { title: "A Place Further Than the Universe", meta: "Your next hopeful anime", image: images.ocean, label: "WARM HEART", tint: "#ff846d" },
];

const upcoming = [
  { title: "House of the Dragon", date: "Jun 16", type: "TV", image: images.city },
  { title: "Elden Ring: Shadow of the Erdtree", date: "Jun 21", type: "Game", image: images.game },
  { title: "The Boy and the Heron", date: "Jun 25", type: "Movie", image: images.dune },
];

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="vault-mono text-[9px] uppercase tracking-[0.24em] text-[#657572]">{eyebrow}</p>
        <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.04em] text-[#edf5f1]">{title}</h2>
      </div>
      {action ? (
        <button type="button" className="vault-inline-action">
          {action} <ArrowRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

function FavoriteCard({ item, liked, onToggle }: { item: MediaItem; liked: boolean; onToggle: () => void }) {
  return (
    <article className="vault-favorite-card group">
      <div className="relative aspect-[0.78] overflow-hidden rounded-[16px]">
        <Poster src={item.image} alt={`${item.title} cover`} className="transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07100f] via-transparent to-black/10" />
        <button
          type="button"
          aria-label={liked ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
          onClick={onToggle}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition ${
            liked ? "border-[#55e5c0]/70 bg-[#55e5c0] text-[#071311]" : "border-white/20 bg-black/30 text-white/80 hover:border-[#55e5c0]/60 hover:text-[#55e5c0]"
          }`}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="absolute bottom-3 left-3 rounded-md border border-white/15 bg-[#07100f]/65 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
          {item.kind}
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-bold text-[#eef5f2]">{item.title}</h3>
          <p className="mt-1 truncate text-[10px] text-[#7e8b89]">{item.meta}</p>
        </div>
        <Rating value={item.score} />
      </div>
    </article>
  );
}

function ContinueCard({ item, onPlay }: { item: (typeof continueItems)[number]; onPlay: () => void }) {
  return (
    <article className="vault-continue-card group">
      <div className="relative h-[134px] w-[94px] shrink-0 overflow-hidden rounded-xl">
        <Poster src={item.image} alt={`${item.title} cover`} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button type="button" onClick={onPlay} aria-label={`Continue ${item.title}`} className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#55e5c0] text-[#071311] transition hover:scale-105">
          <Play size={13} fill="currentColor" />
        </button>
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="vault-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: item.accent }}>{item.kind}</span>
          <MoreHorizontal size={15} className="text-[#64716e]" />
        </div>
        <h3 className="mt-3 truncate text-[15px] font-bold text-[#edf5f1]">{item.title}</h3>
        <p className="mt-1 text-[11px] text-[#85928f]">{item.detail}</p>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${item.progress}%`, backgroundColor: item.accent }} />
          </div>
          <span className="vault-mono text-[9px] text-[#82908e]">{item.progress}%</span>
        </div>
      </div>
    </article>
  );
}

function SmallMediaRow({ item, onAdd }: { item: MediaItem; onAdd: () => void }) {
  return (
    <div className="group flex items-center gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div className="h-[54px] w-[42px] shrink-0 overflow-hidden rounded-lg">
        <Poster src={item.image} alt={`${item.title} poster`} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[12px] font-bold text-[#e8f0ed]">{item.title}</h3>
        <p className="mt-1 truncate text-[10px] text-[#7d8b88]">{item.meta}</p>
      </div>
      <span className="vault-mono hidden text-[10px] text-[#b7ef7d] sm:block">{item.score}</span>
      <button type="button" onClick={onAdd} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[#768480] transition hover:border-[#55e5c0]/50 hover:text-[#55e5c0]" aria-label={`Add ${item.title}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}

export function Vault() {
  const [activeTab, setActiveTab] = useState<"All" | MediaKind>("All");
  const [liked, setLiked] = useState<string[]>(favorites.map((item) => item.title));
  const [notice, setNotice] = useState("");
  const [showFolders, setShowFolders] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const visibleFavorites = useMemo(
    () => (activeTab === "All" ? favorites : favorites.filter((item) => item.kind === activeTab)),
    [activeTab],
  );

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const toggleFavorite = (title: string) => {
    setLiked((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
    flash(liked.includes(title) ? "Removed from favorites" : "Saved to favorites");
  };

  return (
    <AppLayout
      active="vault"
      eyebrow="Your entertainment universe"
      title="My Vault"
      action={
        <button type="button" onClick={() => flash("New collection flow opened")} className="vault-primary-action">
          <Plus size={15} /> Add to vault
        </button>
      }
    >
      <div className="relative">
        {notice ? (
          <div className="vault-toast">
            <Check size={14} className="text-[#55e5c0]" /> {notice}
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={13} /></button>
          </div>
        ) : null}

        <section className="vault-overview-grid">
          <div className="vault-overview-hero">
            <div className="relative z-10 max-w-[510px]">
              <div className="flex items-center gap-2">
                <span className="vault-pulse-dot" />
                <span className="vault-mono text-[9px] uppercase tracking-[0.22em] text-[#b7ef7d]">Personal archive · updated today</span>
              </div>
              <h2 className="mt-5 max-w-[430px] text-[27px] font-extrabold leading-[1.05] tracking-[-0.06em] text-[#f3f7f5] sm:text-[34px]">
                A little corner of the internet that is entirely yours.
              </h2>
              <p className="mt-4 max-w-[410px] text-[12px] leading-relaxed text-[#a0b0ab]">Your watchlist has a point of view. Keep following the threads that make you curious.</p>
              <div className="mt-7 flex items-end gap-7">
                <div>
                  <div className="text-[45px] font-extrabold leading-none tracking-[-0.08em] text-[#55e5c0]">247</div>
                  <div className="vault-mono mt-2 text-[9px] uppercase tracking-[0.18em] text-[#7d8c88]">total items</div>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div>
                  <div className="text-[16px] font-bold text-[#edf5f1]">18h 42m</div>
                  <div className="vault-mono mt-2 text-[9px] uppercase tracking-[0.15em] text-[#7d8c88]">logged this month</div>
                </div>
              </div>
            </div>
            <div className="vault-overview-art">
              <img src={images.dune} alt="" />
              <div className="vault-overview-art-wash" />
              <div className="vault-art-caption"><span>01</span><span>stories worth keeping</span></div>
            </div>
          </div>
          <div className="vault-breakdown vault-glass">
            <div className="flex items-start justify-between">
              <div>
                <p className="vault-mono text-[9px] uppercase tracking-[0.2em] text-[#657572]">The shape of your vault</p>
                <h3 className="mt-2 text-[17px] font-bold text-[#edf5f1]">Your collection, in balance</h3>
              </div>
              <button type="button" onClick={() => flash("Vault insights are up to date")} className="text-[#778581] transition hover:text-[#55e5c0]" aria-label="View collection insights"><MoreHorizontal size={18} /></button>
            </div>
            <div className="mt-7 flex items-center gap-6">
              <div className="vault-donut"><div className="vault-donut-center"><strong>247</strong><span>items</span></div></div>
              <div className="min-w-0 flex-1 space-y-3">
                {[
                  ["Movies", "82", "33%", "#55e5c0"],
                  ["TV shows", "61", "25%", "#b7ef7d"],
                  ["Anime", "57", "23%", "#8cc8ff"],
                  ["Games", "47", "19%", "#ff846d"],
                ].map(([label, count, percentage, color]) => (
                  <div key={label} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[#9dacaa]">{label}</span>
                    <span className="ml-auto font-bold text-[#e7efec]">{count}</span>
                    <span className="vault-mono w-7 text-right text-[9px] text-[#677572]">{percentage}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 border-t border-white/[0.07] pt-4 text-[10px] text-[#75827f]">You added <span className="font-bold text-[#b7ef7d]">12 items</span> this month. That is a good month.</div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading eyebrow="The ones you return to" title="Favorite picks" action="View all favorites" />
          <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
            {(["All", "Movie", "TV", "Anime", "Game"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`vault-filter-pill ${activeTab === tab ? "is-active" : ""}`}>
                {tab === "All" ? "All media" : tab === "TV" ? "TV shows" : `${tab}s`}
              </button>
            ))}
            <div className="ml-auto hidden items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1 sm:flex">
              <button type="button" onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-white/10 text-[#55e5c0]" : "text-[#697875]"}`} aria-label="Grid view"><LayoutGrid size={14} /></button>
              <button type="button" onClick={() => setView("list")} className={`rounded-md p-1.5 ${view === "list" ? "bg-white/10 text-[#55e5c0]" : "text-[#697875]"}`} aria-label="List view"><ListFilter size={14} /></button>
            </div>
          </div>
          <div className={view === "grid" ? "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-5" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
            {visibleFavorites.map((item) => (
              <FavoriteCard key={item.title} item={item} liked={liked.includes(item.title)} onToggle={() => toggleFavorite(item.title)} />
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-12 xl:grid-cols-[1.35fr_0.65fr]">
          <div>
            <SectionHeading eyebrow="Pick up where you left off" title="Currently watching & playing" action="Open activity" />
            <div className="grid gap-3">
              {continueItems.map((item) => <ContinueCard key={item.title} item={item} onPlay={() => flash(`Resuming ${item.title}`)} />)}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Saved for a slower day" title="Wishlist" action="See wishlist" />
            <div className="vault-glass rounded-2xl px-4">
              {wishlist.map((item) => <SmallMediaRow key={item.title} item={item} onAdd={() => flash(`${item.title} added to your vault`)} />)}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-12 xl:grid-cols-[0.92fr_1.08fr]">
          <div>
            <SectionHeading eyebrow="A tidy little victory lap" title="Recently completed" action="Browse history" />
            <div className="vault-completed-list">
              {completed.map((item, index) => (
                <button type="button" key={item.title} onClick={() => flash(`${item.title} marked as a favorite`)} className="vault-completed-row group">
                  <span className="vault-mono w-5 text-[10px] text-[#53615e]">0{index + 1}</span>
                  <div className="h-12 w-9 overflow-hidden rounded-md"><Poster src={item.image} alt={`${item.title} cover`} /></div>
                  <span className="min-w-0 flex-1 text-left"><strong className="block truncate text-[12px] text-[#eaf2ef]">{item.title}</strong><small className="mt-1 block truncate text-[10px] text-[#7b8985]">{item.meta}</small></span>
                  <Check size={15} className="text-[#55e5c0] opacity-70 transition group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Your shelves, your rules" title="Custom folders" action="Manage folders" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Rainy day cinema", count: "18 titles", color: "#55e5c0", image: images.ocean },
                { title: "Cozy co-op nights", count: "12 games", color: "#b7ef7d", image: images.controller },
                { title: "Worlds with teeth", count: "24 titles", color: "#ff846d", image: images.noir },
              ].map((folder) => (
                <button type="button" key={folder.title} onClick={() => { setShowFolders(true); flash(`Opening ${folder.title}`); }} className="vault-folder-card group">
                  <div className="relative h-[106px] overflow-hidden rounded-xl"><Poster src={folder.image} alt="" className="transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#0d1414] to-transparent" /><Folder size={17} className="absolute bottom-3 left-3" style={{ color: folder.color }} /></div>
                  <div className="mt-3 text-left"><h3 className="truncate text-[12px] font-bold text-[#e7efec]">{folder.title}</h3><p className="mt-1 text-[10px] text-[#788581]">{folder.count}</p></div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading eyebrow="Picked for your particular taste" title="Recommendations" action="Tune recommendations" />
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.map((item) => (
              <button type="button" key={item.title} onClick={() => flash(`${item.title} saved for later`)} className="vault-recommendation-card group">
                <div className="relative h-[178px] overflow-hidden rounded-[15px]"><Poster src={item.image} alt={`${item.title} still`} className="transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#07100f] via-transparent to-transparent" /><span className="absolute bottom-3 left-3 rounded border border-white/15 bg-black/30 px-2 py-1 vault-mono text-[8px] tracking-[0.16em] backdrop-blur" style={{ color: item.tint }}>{item.label}</span></div>
                <div className="mt-3 text-left"><h3 className="text-[14px] font-bold text-[#ecf4f0]">{item.title}</h3><p className="mt-1 text-[10px] text-[#81908c]">{item.meta}</p></div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-14 pb-8">
          <SectionHeading eyebrow="Mark your calendar" title="Coming soon" action="See release calendar" />
          <div className="vault-upcoming-strip">
            {upcoming.map((item) => (
              <button type="button" key={item.title} onClick={() => flash(`Reminder set for ${item.title}`)} className="vault-upcoming-card group">
                <div className="relative h-[84px] w-[62px] shrink-0 overflow-hidden rounded-lg"><Poster src={item.image} alt={`${item.title} cover`} className="transition duration-500 group-hover:scale-105" /></div>
                <div className="min-w-0 text-left"><span className="vault-mono text-[9px] uppercase tracking-[0.18em] text-[#55e5c0]">{item.date} · {item.type}</span><h3 className="mt-2 truncate text-[12px] font-bold text-[#edf5f1]">{item.title}</h3><p className="mt-1 text-[10px] text-[#778581]">Tap to set a reminder</p></div>
                <Bookmark size={15} className="ml-auto shrink-0 text-[#6d7b77] transition group-hover:text-[#b7ef7d]" />
              </button>
            ))}
          </div>
        </section>

        {showFolders ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040807]/75 px-5 backdrop-blur-sm">
            <div className="vault-glass w-full max-w-[420px] rounded-2xl p-6">
              <div className="flex items-start justify-between"><div><p className="vault-mono text-[9px] uppercase tracking-[0.2em] text-[#55e5c0]">Collection manager</p><h2 className="mt-2 text-xl font-bold text-[#eef5f2]">Your custom folders</h2></div><button type="button" onClick={() => setShowFolders(false)} aria-label="Close folders" className="text-[#899692] hover:text-white"><X size={18} /></button></div>
              <div className="mt-6 space-y-2">{["Rainy day cinema", "Cozy co-op nights", "Worlds with teeth"].map((folder) => <button type="button" key={folder} onClick={() => { setShowFolders(false); flash(`${folder} selected`); }} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-left text-[12px] font-semibold text-[#dfe9e5] transition hover:border-[#55e5c0]/30 hover:bg-[#55e5c0]/[0.06]"><Folder size={15} className="text-[#55e5c0]" />{folder}<ChevronDown size={14} className="ml-auto rotate-[-90deg] text-[#687773]" /></button>)}</div>
              <button type="button" onClick={() => { setShowFolders(false); flash("New folder flow opened"); }} className="vault-primary-action mt-6 w-full justify-center"><Plus size={15} /> Create a folder</button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}