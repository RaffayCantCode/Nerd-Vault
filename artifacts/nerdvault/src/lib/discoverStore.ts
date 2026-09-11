import { UnifiedMedia } from "./api";

export interface DiscoverSessionState {
  items: UnifiedMedia[];
  page: number;
  hasMore: boolean;
  scrollY: number;
  visitSeed: number;
  query: string;
  debouncedQuery: string;
  genre: string;
  type: string;
  sort: string;
  curation: string;
  mood: string | null;
  seenIds: Set<string>;
  seenTitles: Set<string>;
  isInitialized: boolean;
}

function createFreshSession(): DiscoverSessionState {
  return {
    items: [],
    page: 1,
    hasMore: true,
    scrollY: 0,
    visitSeed: Math.floor(Math.random() * 100000),
    query: "",
    debouncedQuery: "",
    genre: "All genres",
    type: "All types",
    sort: "Recommended",
    curation: "All curations",
    mood: null,
    seenIds: new Set<string>(),
    seenTitles: new Set<string>(),
    isInitialized: false,
  };
}

class DiscoverStore {
  private session: DiscoverSessionState = createFreshSession();

  getState(): DiscoverSessionState {
    return this.session;
  }

  updateState(partial: Partial<DiscoverSessionState>): void {
    Object.assign(this.session, partial);
  }

  setScroll(y: number): void {
    this.session.scrollY = Math.max(0, y);
  }

  getScroll(): number {
    return this.session.scrollY;
  }

  isInitialized(): boolean {
    return this.session.isInitialized;
  }

  markInitialized(val: boolean = true): void {
    this.session.isInitialized = val;
  }

  resetForShuffle(): number {
    const newSeed = Math.floor(Math.random() * 100000);
    this.session.items = [];
    this.session.page = 1;
    this.session.hasMore = true;
    this.session.scrollY = 0;
    this.session.visitSeed = newSeed;
    this.session.seenIds.clear();
    this.session.seenTitles.clear();
    this.session.isInitialized = true;
    return newSeed;
  }

  resetForFilterChange(): void {
    this.session.items = [];
    this.session.page = 1;
    this.session.hasMore = true;
    this.session.scrollY = 0;
    this.session.seenIds.clear();
    this.session.seenTitles.clear();
  }
}

export const discoverStore = new DiscoverStore();
