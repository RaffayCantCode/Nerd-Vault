# NerdVault V2 — Reincarnated

NerdVault is a sleek, modern entertainment tracking and social platform that lets users track, organize, and discover Movies, TV Shows, Anime, and Games in one unified sanctuary.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/nerdvault run dev` — run the frontend Vite dev server (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Database: Cloudflare D1 (connected via REST API in dev and direct binding in Cloudflare Pages/Workers)

## Stack

- Frontend: React 19, TypeScript 5.9, Vite, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Wouter, TanStack React Query
- API: Express 5 + Web Standards
- DB: Cloudflare D1 + Drizzle ORM (SQLite Core)
- Media Sources: TMDB (Movies/Series), AniList (Anime), IGDB (Games) + High-Speed In-Memory Cache

## Where things live

- `artifacts/nerdvault` — The React 19 Frontend application
  - `src/pages/` — `HomePage`, `VaultPage`, `DiscoverPage`, `MediaDetailPage`, `FriendsPage`, `ProfilePage`
  - `src/components/` — Modular layout, media cards, shelves, social activity, and auth modals
  - `src/context/` — `AuthContext` and `VaultContext` for global session and tracking state
  - `src/lib/api.ts` — Type-safe client communication
- `artifacts/api-server` — Backend Express REST API server
  - `src/routes/` — `auth`, `catalog`, `vault`, `shelves`, `social`, `profile`
  - `src/services/` — `tmdb`, `anilist`, `igdb`, `cache`, `mock-catalog`, `catalog-aggregator`
- `lib/db` — Data access layer and Drizzle schema for Cloudflare D1
  - `src/schema/` — `users`, `media`, `vault` (watched & wishlist), `folders` (shelves), `social` (friendships, requests, notifications)
  - `src/client.ts` — Dual-mode Cloudflare D1 query runner & Drizzle adapter
  - `src/repository.ts` — Data access methods

## Architecture decisions

1. **Dual-Mode D1 Access**: Queries Cloudflare D1 remotely over HTTPS during local development while supporting zero-overhead native D1 bindings when deployed on Cloudflare Pages/Workers.
2. **Aggregated Media Catalog**: Single unified `UnifiedMedia` interface harmonizes Movies, TV Shows, Anime, and Video Games.
3. **Smart In-Memory Caching & In-Flight Deduplication**: Eliminates duplicate upstream API requests to TMDB/AniList/IGDB, protecting rate limits and reducing latency to milliseconds.
4. **Optimistic UI Updates**: Vault additions, status changes, ratings, and shelf mutations reflect instantly on the UI with automated background sync.
