import { Bell, CheckCircle2, Compass, Gamepad2, Home, Library, PlayCircle, Search, Sparkles, Star, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import "./../_group.css";

export type VaultSection = "home" | "vault" | "discover" | "friends" | "profile";

const navItems: Array<{ id: VaultSection; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "vault", label: "My Vault", icon: Library },
  { id: "friends", label: "Friends", icon: Users },
];

const art = {
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
};

export function Poster({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      loading="lazy"
    />
  );
}

export function Rating({ value, label = "Nerd score" }: { value: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#55e5c0] text-[11px] font-extrabold text-[#071311]">
        {value}
      </span>
      <span className="vault-mono text-[10px] uppercase tracking-[0.16em] text-[#8a9795]">{label}</span>
    </div>
  );
}

export function MediaCard({
  title,
  meta,
  src,
  type = "Movie",
  score,
  compact = false,
}: {
  title: string;
  meta: string;
  src: string;
  type?: string;
  score?: string;
  compact?: boolean;
}) {
  return (
    <article className={`group min-w-0 ${compact ? "w-[154px] shrink-0" : ""}`}>
      <div className={`relative overflow-hidden rounded-[14px] bg-[#171d1f] ${compact ? "aspect-[2/3]" : "aspect-[2/3]"}`}>
        <Poster src={src} alt={`${title} poster`} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />
        {score ? (
          <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/65 px-1.5 text-[11px] font-bold text-[#b7ef7d] backdrop-blur">
            {score}
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/45 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
          {type}
        </span>
      </div>
      <h3 className="mt-3 truncate text-[13px] font-bold tracking-[-0.01em] text-[#f3f7f5]">{title}</h3>
      <p className="mt-1 truncate text-[11px] text-[#8a9795]">{meta}</p>
    </article>
  );
}

export function AppLayout({
  active,
  children,
  eyebrow = "Your entertainment universe",
  title,
  action,
}: {
  active: VaultSection;
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="vault-app vault-noise min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1510px]">
        <aside className="hidden w-[234px] shrink-0 flex-col border-r border-white/[0.07] px-7 py-8 lg:flex">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#55e5c0] text-[#071311] shadow-[0_0_28px_rgba(85,229,192,0.22)]">
              <Gamepad2 size={19} strokeWidth={2.4} />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#b7ef7d]" />
            </div>
            <div>
              <div className="text-[18px] font-extrabold tracking-[-0.06em] text-white">Nerd<span className="text-[#55e5c0]">Vault</span></div>
              <div className="vault-mono text-[8px] uppercase tracking-[0.22em] text-[#60706d]">curate your universe</div>
            </div>
          </div>

          <div className="mt-14">
            <p className="vault-mono mb-4 px-3 text-[9px] uppercase tracking-[0.24em] text-[#5b6866]">Workspace</p>
            <nav className="space-y-1">
              {navItems.map(({ id, label, icon: Icon }) => {
                const selected = active === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${
                      selected ? "bg-white/[0.08] text-[#f3f7f5]" : "text-[#7e8b89] hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <Icon size={17} strokeWidth={selected ? 2.3 : 1.8} className={selected ? "text-[#55e5c0]" : ""} />
                    {label}
                    {id === "friends" ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ff846d]" /> : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-12">
            <p className="vault-mono mb-4 px-3 text-[9px] uppercase tracking-[0.24em] text-[#5b6866]">Your collections</p>
            <div className="space-y-1 text-[12px] font-semibold text-[#7e8b89]">
              {[
                [PlayCircle, "Currently watching", "#b7ef7d"],
                [Star, "Wishlist", "#8cc8ff"],
                [CheckCircle2, "Completed", "#55e5c0"],
                [Sparkles, "Favorites", "#ff846d"],
              ].map(([Icon, label, color]) => (
                <button type="button" key={label} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04] hover:text-white">
                  <Icon size={15} style={{ color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <div className="rounded-2xl border border-[#55e5c0]/15 bg-[#55e5c0]/[0.06] p-4">
              <div className="flex items-start justify-between">
                <span className="vault-mono text-[9px] uppercase tracking-[0.2em] text-[#55e5c0]">Weekly goal</span>
                <Sparkles size={15} className="text-[#b7ef7d]" />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[#a3b4b0]">One more great story<br />before Sunday.</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#55e5c0]/10">
                <div className="h-full w-3/4 rounded-full bg-[#55e5c0]" />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#71817e]"><span>3 of 4 logged</span><span>75%</span></div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 pb-16 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between border-b border-white/[0.07] py-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-[240px] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[#71817e] sm:w-[300px]">
                <Search size={16} />
                <span className="text-[12px]">Search your universe</span>
                <span className="vault-mono ml-auto hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-[#687572] sm:inline">⌘ K</span>
              </div>
              <button type="button" className="hidden h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-[12px] font-semibold text-[#91a09d] transition hover:bg-white/[0.04] md:flex">
                <Compass size={15} /> Explore
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" className="relative text-[#82908e] transition hover:text-white">
                <Bell size={18} strokeWidth={1.8} />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#ff846d]" />
              </button>
              <div className="h-8 w-8 overflow-hidden rounded-full border border-[#55e5c0]/35 bg-[#1c3a38]">
                <Poster src={art.avatar} alt="Alex Morgan avatar" />
              </div>
              <span className="hidden text-[12px] font-semibold text-[#d5dfdc] sm:inline">alexmorgan</span>
            </div>
          </header>

          <div className="pt-10">
            {title ? (
              <div className="mb-9 flex items-end justify-between gap-6">
                <div>
                  <p className="vault-mono mb-3 text-[10px] uppercase tracking-[0.24em] text-[#55e5c0]">{eyebrow}</p>
                  <h1 className="text-3xl font-extrabold tracking-[-0.06em] text-[#f3f7f5] sm:text-[42px]">{title}</h1>
                </div>
                {action}
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DetailTopBar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-6 lg:px-12">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#55e5c0] text-[#071311]"><Gamepad2 size={19} /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#b7ef7d]" /></div>
        <div className="text-[18px] font-extrabold tracking-[-0.06em] text-white">Nerd<span className="text-[#55e5c0]">Vault</span></div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden h-10 w-[250px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[#9aa9a5] backdrop-blur md:flex">
          <Search size={16} /><span className="text-[12px]">Find something to log</span>
        </div>
        <button onClick={onClose} type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
      </div>
    </div>
  );
}