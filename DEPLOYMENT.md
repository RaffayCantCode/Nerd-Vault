# Deploying NerdVault to Cloudflare Pages with Cloudflare D1

NerdVault is built to run natively on **Cloudflare Pages** backed by **Cloudflare D1** (serverless edge SQLite database) with high performance and global edge distribution.

---

## 1. Prerequisites

- A [Cloudflare Account](https://dash.cloudflare.com/)
- Node.js 20+ installed locally
- Cloudflare Wrangler CLI (installed with the project devDependencies)

---

## 2. Step 1: Create your Cloudflare D1 Database

Run the following command in your terminal to create your remote D1 database:

```bash
npx wrangler d1 create nerdvault-db
```

Output will display your database details:
```text
[[d1_databases]]
binding = "DB"
database_name = "nerdvault-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and paste it into [wrangler.toml](file:///c:/Users/asifr/Documents/GitHub/Nerd-Vault/wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "nerdvault-db"
database_id = "YOUR_CLOUDFLARE_D1_DATABASE_ID"
migrations_dir = "migrations"
```

---

## 3. Step 2: Apply Database Migrations to D1

Apply the initial schema to your remote Cloudflare D1 database:

```bash
npm run d1:migrate:remote
```

Or execute the SQL schema directly:

```bash
npm run d1:execute:remote
```

---

## 4. Step 3: Deploy via Cloudflare Dashboard (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository `Nerd-Vault`.
4. Configure Build settings:
   - **Framework preset**: `None` or `Next.js`
   - **Build command**: `npx @cloudflare/next-on-pages` (or `npm run build` if using OpenNext)
   - **Build output directory**: `.vercel/output/static`
   - **Compatibility date**: `2026-08-16`
   - **Compatibility flag**: `nodejs_compat`

### 5. Step 4: Configure D1 Binding & Secrets in Cloudflare

In your Pages project settings:

#### A. Bind Cloudflare D1
- Go to **Settings** > **Functions** > **D1 database bindings**.
- Click **Add binding**:
  - **Variable name**: `DB`
  - **D1 database**: Select `nerdvault-db`

#### B. Add Environment Variables
- Go to **Settings** > **Environment variables**:
  - `AUTH_SECRET`: A secure 32+ character random string
  - `AUTH_URL`: `https://your-domain.pages.dev` (or custom domain)
  - `AUTH_TRUST_HOST`: `true`
  - `TMDB_API_KEY`: Your TMDB API key
  - `RAWG_API_KEY`: Your RAWG API key
  - `IGDB_CLIENT_ID`: Your Twitch / IGDB Client ID
  - `IGDB_CLIENT_SECRET`: Your Twitch / IGDB Client Secret
  - `TWITCH_APP_ACCESS_TOKEN`: (Optional) Twitch OAuth Token
  - `GOOGLE_CLIENT_ID`: (Optional) For Google Sign In
  - `GOOGLE_CLIENT_SECRET`: (Optional) For Google Sign In

---

## 6. Step 5: Deploy via CLI (Alternative)

You can also deploy directly from your local terminal:

```bash
npm run pages:build
npm run pages:deploy
```

---

## 7. Local Development Options

### Option A: Local Dev with SQLite Fallback (Default)
Run `npm run dev`. The app will automatically initialize a local SQLite database in `.data/nerdvault-dev.sqlite` with zero configuration needed.

### Option B: Local Dev Connected to Remote Cloudflare D1
Add your Cloudflare credentials to `.env.local`:
```env
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_D1_DATABASE_ID="your-database-id"
CLOUDFLARE_API_TOKEN="your-api-token"
```
Run `npm run dev`. All reads and writes will immediately sync with your live remote Cloudflare D1 database over HTTPS.
