# Afterglow Archive

A real Next.js foundation for the media-vault website:

- cinematic landing page
- browse catalog
- profile archive
- media detail pages
- Google auth scaffold
- Postgres + Prisma schema for the full product

## Stack

- Next.js App Router
- React 19
- Prisma + Postgres
- Auth.js with Google

## First setup

1. Install dependencies

```bash
npm install
```

2. Create a local env file

```bash
copy .env.example .env.local
```

3. Fill in:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

4. Generate Prisma client

```bash
npm run prisma:generate
```

5. Run the app

```bash
npm run dev
```

6. Test the first real catalog source

Open:

```text
http://localhost:3000/api/catalog/bootstrap
```

If `TMDB_API_KEY` is set, this route will return a starter movie/show import payload from TMDB.

7. Open the real browse page

```text
http://localhost:3000/browse
```

If TMDB is configured, the browse page now prefers live TMDB movie/show data.
If TMDB fails, it falls back to the local mock catalog so the UI still works.

8. Test the paginated browse API directly

```text
http://localhost:3000/api/catalog/browse?type=all&page=1
http://localhost:3000/api/catalog/browse?type=movie&page=2
http://localhost:3000/api/catalog/browse?type=show&page=1&query=dark
```

9. Test anime browse

```text
http://localhost:3000/api/catalog/browse?type=anime&page=1
```

Anime now uses Jikan and does not require an extra API key.

10. Test game browse after IGDB setup

```text
http://localhost:3000/api/catalog/browse?type=game&page=1
```

Games use IGDB and require:

- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`

You can also provide `TWITCH_APP_ACCESS_TOKEN` manually, but it is optional because the server can request one from Twitch using the client id and secret.

## What is real already

- App Router structure in `src/app`
- proper route layout
- sign-in page scaffold
- Google provider wiring in `src/lib/auth.ts`
- normalized Prisma schema in `prisma/schema.prisma`
- richer media detail route in `src/app/media/[slug]/page.tsx`

## What is still mocked

- catalog data in `src/lib/mock-catalog.ts`
- watched / wishlist content
- folders content
- browse search source

## Catalog plan

Use these sources through server-side ingestion routes:

- TMDB for movies and TV
- Jikan for anime
- IGDB for games

Then normalize them into the `Media`, `Genre`, `Person`, and join tables in Prisma.

## What you need to do

You need to provide these pieces before the real catalog can happen:

1. Install Node.js and run `npm install`
2. Create `.env.local`
3. Add a Postgres database URL
4. Create a TMDB API key
5. Create Google OAuth credentials for `http://localhost:3000`
6. Later add IGDB client credentials for games

Without those credentials, the app shell works, but the real external catalog cannot be imported yet.

## Recommended next build order

1. Connect Postgres
2. Run first Prisma migration
3. Finish Google sign-in on `localhost`
4. Replace mock catalog with TMDB movie + TV ingestion
5. Add anime ingestion with Jikan
6. Add games ingestion with IGDB through server-side token flow
7. Add real watched / wishlist / folder actions
8. Add recommendations from user genre history
