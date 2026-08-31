import { useState } from "react";
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Film,
  Gamepad2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AppLayout, MediaCard, Poster } from "./_shared/AppLayout";
import "./Friends.css";

const art = {
  maya: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
  theo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
  june: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
  sam: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=85",
  city: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85",
  theater: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85",
  night: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85",
  controller: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=85",
  film: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=85",
  ocean: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
};

type Friend = {
  name: string;
  handle: string;
  avatar: string;
  note: string;
  online?: boolean;
  action?: string;
};

const friends: Friend[] = [
  { name: "Maya Chen", handle: "@mayac", avatar: art.maya, note: "Watching Severance", online: true },
  { name: "Theo Alvarez", handle: "@theo_a", avatar: art.theo, note: "Last seen 18m ago", action: "Follow back" },
  { name: "June Park", handle: "@junebug", avatar: art.june, note: "Playing Hades II", online: true },
  { name: "Sam Okafor", handle: "@samokafor", avatar: art.sam, note: "Last seen yesterday", action: "Follow back" },
];

const recentlyWatched = [
  { title: "Severance", meta: "S2 · Episode 4", src: art.city, type: "Series", score: "9.1" },
  { title: "Perfect Days", meta: "2023 · Wim Wenders", src: art.ocean, type: "Movie", score: "8.7" },
  { title: "Hades II", meta: "Melinoë run · 2h", src: art.controller, type: "Game", score: "9.4" },
  { title: "The Green Knight", meta: "2021 · David Lowery", src: art.night, type: "Movie", score: "8.2" },
];

const recommendations = [
  { title: "The Fall", meta: "Maya · Movie", src: art.film, type: "Movie", score: "8.9" },
  { title: "Tunic", meta: "June · Game", src: art.controller, type: "Game", score: "9.0" },
  { title: "The Bear", meta: "Theo · Series", src: art.theater, type: "Series", score: "8.8" },
];

function Avatar({ src, name, className = "" }: { src: string; name: string; className?: string }) {
  return (
    <div className={`friend-avatar h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#243936] ${className}`}>
      <Poster src={src} alt={`${name} avatar`} />
    </div>
  );
}

function ActivityHeader({
  friend,
  verb,
  time,
}: {
  friend: Friend;
  verb: string;
  time: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-3">
      <Avatar src={friend.avatar} name={friend.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-tight text-[#dce8e4]">
          <span className="font-bold text-[#f4f8f6]">{friend.name}</span>{" "}
          <span className="text-[#9cacA8]">{verb}</span>
        </p>
        <p className="vault-mono mt-1 text-[9px] uppercase tracking-[.14em] text-[#60706d]">{time}</p>
      </div>
      <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={`More options for ${friend.name}`} className="rounded-lg p-1.5 text-[#64726f] transition hover:bg-white/[.05] hover:text-[#dce8e4]">
        <MoreHorizontal size={16} />
      </button>
      {menuOpen ? <div className="absolute right-0 top-9 z-10 rounded-lg border border-white/[.1] bg-[#1a2525] px-3 py-2 text-[10px] font-semibold text-[#b7c7c1] shadow-xl">Activity options</div> : null}
    </div>
  );
}

function ActivityMedia({
  src,
  title,
  meta,
  type,
  score,
  accent = "#55e5c0",
}: {
  src: string;
  title: string;
  meta: string;
  type: string;
  score: string;
  accent?: string;
}) {
  return (
    <div className="mt-4 flex gap-4 rounded-xl border border-white/[.07] bg-[#101618]/75 p-2.5">
      <div className="relative h-[102px] w-[76px] shrink-0 overflow-hidden rounded-lg bg-[#1c2828]">
        <Poster src={src} alt={`${title} artwork`} />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute bottom-2 left-2 rounded border border-white/15 bg-black/45 px-1.5 py-1 text-[8px] font-bold uppercase tracking-[.13em] text-white/80">{type}</span>
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[14px] font-extrabold tracking-[-.025em] text-[#f2f7f4]">{title}</h3>
            <p className="mt-1 text-[11px] text-[#8a9795]">{meta}</p>
          </div>
          <div className="flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-[#081311]" style={{ backgroundColor: accent }}>{score}</div>
        </div>
        <p className="mt-4 line-clamp-2 text-[11px] leading-relaxed text-[#9caba7]">A smart little addition to the weekend queue. This one has stayed in my head all day.</p>
      </div>
    </div>
  );
}

export function Friends() {
  const [activeTab, setActiveTab] = useState<"activity" | "recent" | "recommendations">("activity");
  const [followed, setFollowed] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [reacted, setReacted] = useState<string[]>([]);
  const [inviteSent, setInviteSent] = useState(false);

  const toggleItem = (items: string[], setItems: (next: string[]) => void, item: string) => {
    setItems(items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  };

  return (
    <AppLayout
      active="friends"
      eyebrow="your people / shared watchlists"
      title="Friends"
      action={
        <button
          type="button"
          onClick={() => setInviteSent(true)}
          className="hidden items-center gap-2 rounded-xl border border-[#55e5c0]/20 bg-[#55e5c0]/[.09] px-4 py-2.5 text-[11px] font-bold text-[#9ef1d9] transition hover:border-[#55e5c0]/40 hover:bg-[#55e5c0]/[.15] sm:flex"
        >
          {inviteSent ? <Check size={15} /> : <UserPlus size={15} />}
          {inviteSent ? "Link copied" : "Invite a friend"}
        </button>
      }
    >
      <div className="friends-page">
        <section className="friends-card relative overflow-hidden rounded-[22px] p-5 sm:p-6">
          <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#55e5c0]/[.08] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-[450px]">
              <div className="flex items-center gap-2">
                <span className="pulse-dot h-2 w-2 rounded-full bg-[#b7ef7d]" />
                <span className="vault-mono text-[9px] uppercase tracking-[.2em] text-[#76e5bf]">The inner circle</span>
              </div>
              <h2 className="mt-3 text-[22px] font-extrabold tracking-[-.05em] text-[#f4f8f6] sm:text-[25px]">Good stories get better shared.</h2>
              <p className="mt-2 max-w-[390px] text-[12px] leading-relaxed text-[#95a6a1]">See what your people are watching, playing, and quietly obsessed with this week.</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="friend-avatar-stack flex items-center">
                {friends.map((friend) => <Avatar key={friend.handle} src={friend.avatar} name={friend.name} className="h-8 w-8" />)}
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#111719] bg-[#203331] text-[10px] font-bold text-[#9ee9d3]">+8</div>
              </div>
              <div className="hidden border-l border-white/[.1] pl-5 sm:block">
                <p className="text-[19px] font-extrabold tracking-[-.04em] text-[#eff7f4]">12</p>
                <p className="vault-mono mt-0.5 text-[9px] uppercase tracking-[.15em] text-[#63736f]">close friends</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 rounded-xl border border-white/[.07] bg-white/[.025] p-1">
                {[
                  ["activity", "Activity"],
                  ["recent", "Recently"],
                  ["recommendations", "For you"],
                ].map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${activeTab === tab ? "bg-[#d8f6e9] text-[#12221d]" : "text-[#7f8e8a] hover:bg-white/[.05] hover:text-[#dce8e4]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setActiveTab("activity")} className="hidden items-center gap-1.5 text-[10px] font-bold text-[#6e817b] transition hover:text-[#a8e9d2] sm:flex">
                <Clock3 size={13} /> This week <ChevronRight size={13} />
              </button>
            </div>

            {activeTab === "activity" ? (
              <div className="space-y-3.5">
                <article className="activity-card rounded-[18px] border border-white/[.08] bg-[#12191b]/70 p-4 sm:p-5">
                  <ActivityHeader friend={friends[0]} verb="rated" time="12 min ago" />
                  <ActivityMedia src={art.theater} title="The Substance" meta="2024 · Coralie Fargeat" type="Movie" score="9.2" accent="#b7ef7d" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] italic text-[#aab9b4]">“Beautifully gross. I need to talk about that third act.”</p>
                    <button type="button" onClick={() => toggleItem(reacted, setReacted, "substance")} className={`reaction-button flex shrink-0 items-center gap-1.5 text-[10px] font-semibold transition ${reacted.includes("substance") ? "text-[#ff9b88]" : "text-[#6f7e7a] hover:text-[#ff9b88]"}`}>
                      <Heart size={14} fill={reacted.includes("substance") ? "currentColor" : "none"} /> {reacted.includes("substance") ? "Liked" : "React"}
                    </button>
                  </div>
                </article>

                <article className="activity-card rounded-[18px] border border-white/[.08] bg-[#12191b]/70 p-4 sm:p-5">
                  <ActivityHeader friend={friends[2]} verb="started playing" time="Yesterday" />
                  <ActivityMedia src={art.controller} title="Hades II" meta="Supergiant Games · Early Access" type="Game" score="9.4" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[#9eada8]">“The soundtrack is doing dangerous things to my focus.”</p>
                    <button type="button" onClick={() => toggleItem(saved, setSaved, "hades")} className={`save-button flex shrink-0 items-center gap-1.5 text-[10px] font-semibold transition ${saved.includes("hades") ? "text-[#b7ef7d]" : "text-[#6f7e7a] hover:text-[#b7ef7d]"}`}>
                      {saved.includes("hades") ? <Check size={14} /> : <Bookmark size={14} />} {saved.includes("hades") ? "In vault" : "Save"}
                    </button>
                  </div>
                </article>

                <article className="activity-card rounded-[18px] border border-white/[.08] bg-[#12191b]/70 p-4 sm:p-5">
                  <ActivityHeader friend={friends[1]} verb="finished" time="2 days ago" />
                  <ActivityMedia src={art.night} title="The Green Knight" meta="2021 · David Lowery" type="Movie" score="8.6" accent="#8cc8ff" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[#9eada8]">Theo and 3 others added this to their favorites.</p>
                    <button type="button" onClick={() => toggleItem(saved, setSaved, "green-knight")} className={`save-button flex shrink-0 items-center gap-1.5 text-[10px] font-semibold transition ${saved.includes("green-knight") ? "text-[#b7ef7d]" : "text-[#6f7e7a] hover:text-[#b7ef7d]"}`}>
                      {saved.includes("green-knight") ? <Check size={14} /> : <Bookmark size={14} />} {saved.includes("green-knight") ? "In vault" : "Save"}
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === "recent" ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="vault-mono text-[9px] uppercase tracking-[.2em] text-[#55e5c0]">The group queue</p>
                    <h3 className="mt-2 text-[18px] font-extrabold tracking-[-.04em] text-[#eef6f2]">Recently watched & played</h3>
                  </div>
                  <span className="text-[10px] text-[#71817d]">Last 14 days</span>
                </div>
                <div className="friends-scroll flex gap-4 overflow-x-auto pb-3">
                  {recentlyWatched.map((item) => <div key={item.title} className="w-[150px] shrink-0"><MediaCard {...item} compact /></div>)}
                </div>
                <div className="mt-7 rounded-[18px] border border-white/[.08] bg-[#12191b]/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#55e5c0]/[.1] text-[#55e5c0]"><MessageCircle size={17} /></div>
                    <div><h3 className="text-[13px] font-bold text-[#edf7f2]">Start a group watch</h3><p className="mt-0.5 text-[11px] text-[#82918d]">Pick a title and let the group vote.</p></div>
                    <button type="button" onClick={() => setInviteSent(true)} className="ml-auto rounded-lg border border-white/[.1] px-3 py-2 text-[10px] font-bold text-[#b3c3be] transition hover:border-[#55e5c0]/30 hover:text-[#9ef1d9]">Create room</button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "recommendations" ? (
              <div>
                <div className="mb-4">
                  <p className="vault-mono text-[9px] uppercase tracking-[.2em] text-[#55e5c0]">Curated by people you trust</p>
                  <h3 className="mt-2 text-[18px] font-extrabold tracking-[-.04em] text-[#eef6f2]">Friends say you’ll like these</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
                  {recommendations.map((item) => <div key={item.title}><MediaCard {...item} /></div>)}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <section className="friends-card rounded-[19px] p-4">
              <div className="flex items-center justify-between">
                <div><p className="vault-mono text-[9px] uppercase tracking-[.18em] text-[#55e5c0]">Your circle</p><h3 className="mt-2 text-[16px] font-extrabold tracking-[-.035em] text-[#eff7f4]">Friends</h3></div>
                <button type="button" onClick={() => setInviteSent(true)} aria-label="Add a friend" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.09] text-[#8ba19a] transition hover:border-[#55e5c0]/30 hover:text-[#55e5c0]"><Plus size={15} /></button>
              </div>
              <div className="mt-4 space-y-1">
                {friends.map((friend) => {
                  const isFollowed = followed.includes(friend.handle);
                  return (
                    <div key={friend.handle} className="flex items-center gap-3 rounded-xl px-1.5 py-2.5 transition hover:bg-white/[.035]">
                      <div className="relative">
                        <Avatar src={friend.avatar} name={friend.name} className="h-9 w-9" />
                        {friend.online ? <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#182323] bg-[#b7ef7d]" /> : null}
                      </div>
                      <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-[#e6efeb]">{friend.name}</p><p className="mt-0.5 truncate text-[10px] text-[#758580]">{friend.note}</p></div>
                      {friend.action ? <button type="button" onClick={() => toggleItem(followed, setFollowed, friend.handle)} className={`rounded-lg border px-2 py-1.5 text-[9px] font-bold transition ${isFollowed ? "border-[#55e5c0]/20 bg-[#55e5c0]/[.08] text-[#8ce4c6]" : "border-white/[.1] text-[#82928c] hover:border-[#55e5c0]/30 hover:text-[#9cefd0]"}`}>{isFollowed ? "Following" : friend.action}</button> : <span className="vault-mono text-[8px] uppercase tracking-[.12em] text-[#4f625d]">{friend.online ? "online" : "following"}</span>}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setActiveTab("recent")} className="mt-3 flex w-full items-center justify-between border-t border-white/[.07] pt-3 text-[10px] font-bold text-[#7d918a] transition hover:text-[#9ce9d0]"><span>View all friends</span><ChevronRight size={14} /></button>
            </section>

            <section className="relative overflow-hidden rounded-[19px] border border-[#b7ef7d]/[.14] bg-[#b7ef7d]/[.055] p-4">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#b7ef7d]/[.1] blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[#b7ef7d]"><Sparkles size={14} /><span className="vault-mono text-[9px] uppercase tracking-[.18em]">Most saved this week</span></div>
                <div className="mt-4 flex gap-3">
                  <div className="h-[78px] w-[57px] shrink-0 overflow-hidden rounded-lg"><Poster src={art.film} alt="The Fall artwork" /></div>
                  <div><h3 className="text-[14px] font-extrabold text-[#f1f8e9]">The Fall</h3><p className="mt-1 text-[10px] text-[#9caf99]">Recommended by Maya</p><div className="mt-3 flex items-center gap-2"><Star size={12} className="fill-[#b7ef7d] text-[#b7ef7d]" /><span className="text-[11px] font-bold text-[#d7efc3]">8.9 average</span></div></div>
                </div>
                <button type="button" onClick={() => toggleItem(saved, setSaved, "the-fall")} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-[10px] font-bold transition ${saved.includes("the-fall") ? "border-[#b7ef7d]/30 bg-[#b7ef7d]/[.12] text-[#d8f3b9]" : "border-[#b7ef7d]/20 text-[#bdd6a5] hover:bg-[#b7ef7d]/[.1]"}`}>{saved.includes("the-fall") ? <Check size={13} /> : <Bookmark size={13} />} {saved.includes("the-fall") ? "Saved to your vault" : "Add to your vault"}</button>
              </div>
            </section>

            <section className="rounded-[19px] border border-white/[.07] bg-[#111719]/65 p-4">
              <div className="flex items-center gap-2"><UsersRound size={14} className="text-[#8cc8ff]" /><span className="vault-mono text-[9px] uppercase tracking-[.18em] text-[#8ba8bd]">Shared taste</span></div>
              <div className="mt-3 flex items-end justify-between"><div><p className="text-[12px] text-[#9baaa6]">You and Maya agree on</p><p className="mt-1 text-[21px] font-extrabold tracking-[-.05em] text-[#eaf5f0]">74 titles</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8cc8ff]/25 bg-[#8cc8ff]/[.08] text-[#8cc8ff]"><Film size={17} /></div></div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-[#71807d]"><Gamepad2 size={13} /> Your strongest overlap is indie games</div>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}