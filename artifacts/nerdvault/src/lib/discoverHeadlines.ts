export interface DiscoverHeadline {
  lead: string;
  accent: string;
}

export const DISCOVER_HEADLINES: DiscoverHeadline[] = [
  { lead: "Find your next", accent: "obsession." },
  { lead: "What are we", accent: "binging tonight?" },
  { lead: "One more episode,", accent: "zero regrets." },
  { lead: "Press start on", accent: "something new." },
  { lead: "Your backlog", accent: "just got bigger." },
  { lead: "Escape into", accent: "another universe." },
  { lead: "Skip the scrolling,", accent: "start the story." },
  { lead: "Tonight's rabbit hole", accent: "starts right here." },
  { lead: "Late night picks,", accent: "zero filler." },
  { lead: "Unlock your next", accent: "core memory." },
  { lead: "Queue up something", accent: "unforgettable." },
  { lead: "Plots that hit", accent: "different at 2 AM." },
  { lead: "Curated chaos for", accent: "every mood." },
  { lead: "Your next 5-star", accent: "is hiding here." },
  { lead: "Lose track of time", accent: "the right way." },
  { lead: "Fresh worlds,", accent: "ready to explore." },
  { lead: "Something brilliant", accent: "for the weekend." },
  { lead: "Dig deeper into", accent: "the vault." },
  { lead: "Hidden gems and", accent: "heavy hitters." },
  { lead: "Stories worth", accent: "staying up for." },
  { lead: "New quests, new arcs,", accent: "new favorites." },
  { lead: "Pick a portal,", accent: "jump right in." },
  { lead: "No algorithms,", accent: "just pure taste." },
  { lead: "For when you need", accent: "a masterpiece." },
  { lead: "Ready for your next", accent: "all-nighter?" },
  { lead: "From cult classics", accent: "to fresh drops." },
  { lead: "Your watchlist", accent: "is calling." },
  { lead: "Find the one you'll", accent: "recommend to everyone." },
  { lead: "Cinema, anime, games —", accent: "all in one orbit." },
  { lead: "Turn tonight into", accent: "a double feature." },
  { lead: "The next chapter", accent: "begins now." },
  { lead: "Feed your inner", accent: "critic and nerd." },
  { lead: "Discover something", accent: "dangerously good." },
  { lead: "Beyond the mainstream,", accent: "into the magic." },
  { lead: "Every great binge", accent: "starts with one click." },
  { lead: "Uncharted worlds", accent: "await your press." },
  { lead: "Where will your", accent: "mind travel tonight?" },
  { lead: "Handpicked fuel for", accent: "your imagination." },
  { lead: "Step outside reality", accent: "for a few hours." },
  { lead: "Bold stories,", accent: "zero compromises." },
  { lead: "Trade small talk for", accent: "epic lore." },
  { lead: "What's worthy of", accent: "your screen tonight?" },
  { lead: "Level up your", accent: "watchlist." },
  { lead: "Dive headfirst into", accent: "peak fiction." },
  { lead: "Wait until you see", accent: "what's next." },
  { lead: "Crafted for the", accent: "chronically curious." },
  { lead: "The good stuff,", accent: "minus the noise." },
  { lead: "Your next favorite", accent: "is one scroll away." },
  { lead: "Plot twists and", accent: "boss fights ahead." },
  { lead: "Chase the feeling of", accent: "a first watch." },
  { lead: "Something sharp,", accent: "strange, or sublime." },
  { lead: "Open the vault,", accent: "claim your night." },
  { lead: "For nights that deserve", accent: "a standing ovation." },
  { lead: "Four mediums,", accent: "infinite rabbit holes." },
];

const LAST_IDX_KEY = "nv_discover_headline_idx";

export function pickRandomDiscoverHeadline(): DiscoverHeadline {
  const count = DISCOVER_HEADLINES.length;
  let lastIdx = -1;
  try {
    const stored = sessionStorage.getItem(LAST_IDX_KEY);
    if (stored !== null) lastIdx = parseInt(stored, 10);
  } catch {}

  let nextIdx = Math.floor(Math.random() * count);
  if (count > 1 && nextIdx === lastIdx) {
    nextIdx = (nextIdx + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }

  try {
    sessionStorage.setItem(LAST_IDX_KEY, String(nextIdx));
  } catch {}

  return DISCOVER_HEADLINES[nextIdx];
}
