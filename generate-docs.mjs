import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, TableRow, TableCell,
  Table, WidthType, BorderStyle, AlignmentType, PageBreak, ShadingType,
  Header, Footer, PageNumber, NumberFormat
} from "docx";
import { writeFileSync } from "fs";

const BRAND_COLOR = "4F46E5";
const ACCENT_COLOR = "7C3AED";
const DARK_BG = "0F172A";
const TABLE_HEADER_BG = "1E293B";
const TABLE_ROW_ALT = "F1F5F9";

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 24,
        color: BRAND_COLOR,
        font: "Poppins",
      }),
    ],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        size: opts.size || 22,
        font: "Calibri",
        color: opts.color || "334155",
        bold: opts.bold || false,
        italics: opts.italics || false,
      }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [
      new TextRun({ text, size: 22, font: "Calibri", color: "334155" }),
    ],
  });
}

function boldBullet(label, description, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label + ": ", size: 22, font: "Calibri", color: "1E293B", bold: true }),
      new TextRun({ text: description, size: 22, font: "Calibri", color: "334155" }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
    children: [],
  });
}

function makeTable(headers, rows) {
  const headerCells = headers.map(h =>
    new TableCell({
      shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR },
      width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 20, font: "Calibri", color: "FFFFFF" })]
      })],
    })
  );
  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          shading: ri % 2 === 1 ? { fill: TABLE_ROW_ALT, type: ShadingType.CLEAR } : undefined,
          width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell), size: 20, font: "Calibri", color: "334155" })]
          })],
        })
      ),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

const doc = new Document({
  creator: "NerdVault",
  title: "NerdVault — Full Project Documentation",
  description: "Comprehensive documentation of the NerdVault platform covering features, architecture, API, database, and roadmap.",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: "334155" },
      },
    },
  },
  sections: [
    // ─── COVER PAGE ───
    {
      properties: {},
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "NERDVAULT", size: 72, bold: true, color: BRAND_COLOR, font: "Poppins" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: "NV", size: 96, bold: true, color: ACCENT_COLOR, font: "Poppins" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Full Project Documentation", size: 32, color: "64748B", font: "Poppins" })],
        }),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "Your Universe of Entertainment", size: 26, italics: true, color: "475569", font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "Movies · TV Shows · Anime · Games · Books — All in One Vault", size: 22, color: "64748B", font: "Calibri" })],
        }),
        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Version 0.1.0  |  May 2026  |  Solo Developer: Raffay", size: 20, color: "94A3B8", font: "Calibri" })],
        }),
      ],
    },

    // ─── MAIN CONTENT ───
    {
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "NerdVault Documentation", size: 16, color: "94A3B8", italics: true, font: "Calibri" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 16, color: "94A3B8", font: "Calibri" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "94A3B8", font: "Calibri" }),
            ],
          })],
        }),
      },
      children: [
        // ─── TABLE OF CONTENTS ───
        heading("Table of Contents"),
        ...[
          "1. Project Overview",
          "2. Technology Stack",
          "3. Project Structure",
          "4. Core Features",
          "   4.1 Personal Media Library",
          "   4.2 Smart Folders (Playlist System)",
          "   4.3 Social System",
          "   4.4 Discovery & Browse",
          "   4.5 Home Feed & Recommendations",
          "   4.6 Media Detail Pages",
          "   4.7 Books & Reading Room",
          "   4.8 User Profiles",
          "   4.9 Authentication System",
          "   4.10 Notifications",
          "5. API Reference",
          "6. Database Schema",
          "7. External API Integrations",
          "8. UI/UX Design Philosophy",
          "9. Performance & Caching Strategy",
          "10. Environment Configuration",
          "11. Roadmap & Future Enhancements",
          "12. Developer Notes",
        ].map(t => para(t, { size: 22 })),
        divider(),

        // ─── 1. PROJECT OVERVIEW ───
        heading("1. Project Overview"),
        para("NerdVault (NV) is a sleek, modern web platform that allows users to track, organize, and discover all forms of entertainment media in one place. Instead of using separate platforms for movies, games, anime, and shows, users can manage everything inside a unified \"vault.\" The platform combines personal media tracking, social interaction, and intelligent recommendations into a single seamless experience."),
        spacer(),
        boldBullet("Project Name", "NerdVault (NV) — internally named \"afterglow-archive\""),
        boldBullet("Version", "0.1.0 (Active Beta)"),
        boldBullet("Project Type", "Modern Web Application — Media Tracking + Social Platform"),
        boldBullet("Developer", "Raffay (Solo Developer)"),
        boldBullet("Build Tools", "Built with Codex, developed in Cursor IDE"),
        boldBullet("Goal", "Create a unified, visually stunning, and socially engaging platform where users can manage their entire entertainment life, discover new content, and connect with others through shared interests."),
        divider(),

        // ─── 2. TECHNOLOGY STACK ───
        heading("2. Technology Stack"),
        heading("2.1 Frontend", HeadingLevel.HEADING_3),
        makeTable(
          ["Technology", "Version", "Purpose"],
          [
            ["Next.js", "^16.0.0", "Full-stack React framework with App Router"],
            ["React", "^19.1.0", "UI library with concurrent features"],
            ["React DOM", "^19.1.0", "DOM rendering"],
            ["TypeScript", "^5.8.3", "Type-safe development"],
            ["Lucide React", "^0.511.0", "Icon library"],
            ["clsx", "^2.1.1", "Conditional CSS class utility"],
            ["Zod", "^3.24.4", "Schema validation for forms & API"],
          ]
        ),
        spacer(),
        heading("2.2 Backend & Auth", HeadingLevel.HEADING_3),
        makeTable(
          ["Technology", "Version", "Purpose"],
          [
            ["Next.js API Routes", "—", "Server-side API endpoints"],
            ["Prisma", "^6.7.0", "Type-safe ORM for PostgreSQL"],
            ["NextAuth.js", "^5.0.0-beta.29", "Authentication (credentials + Google OAuth)"],
            ["@auth/prisma-adapter", "^2.11.1", "Prisma adapter for NextAuth sessions"],
            ["bcryptjs", "^3.0.3", "Password hashing for credential auth"],
          ]
        ),
        spacer(),
        heading("2.3 Database", HeadingLevel.HEADING_3),
        para("PostgreSQL via Prisma ORM. Schema includes 14 models and 8 enums covering users, media, social features, and authentication."),
        spacer(),
        heading("2.4 External APIs", HeadingLevel.HEADING_3),
        makeTable(
          ["API", "Media Type", "Purpose"],
          [
            ["TMDB (The Movie Database)", "Movies, TV Shows", "Catalog browsing, details, collections, franchise data"],
            ["Jikan (MyAnimeList)", "Anime, Anime Movies", "Catalog browsing, details, franchise/season grouping"],
            ["IGDB (Internet Game DB)", "Games", "Catalog browsing, details, franchise & similar games"],
            ["Gutendex (Project Gutenberg)", "Books", "Free ebook catalog, in-app reading"],
          ]
        ),
        divider(),

        // ─── 3. PROJECT STRUCTURE ───
        heading("3. Project Structure"),
        para("The project follows Next.js App Router conventions with a clear separation of concerns:"),
        spacer(),
        ...[
          "prisma/ — Database schema (schema.prisma)",
          "public/ — Static assets (logo.jpg, logo1.png)",
          "src/app/ — Next.js App Router pages & API routes",
          "src/app/api/ — Server-side API endpoints",
          "src/app/books/ — Books browsing & reading pages",
          "src/app/browse/ — Media discovery/catalog page",
          "src/app/home/ — Authenticated home feed page",
          "src/app/media/[slug]/ — Individual media detail page",
          "src/app/profile/ — User profile page",
          "src/app/sign-in/ — Authentication (login/signup) page",
          "src/app/support/ — Support & bug reporting page",
          "src/components/ — Reusable React components (39 files)",
          "src/lib/ — Business logic, utilities, and data layer (34 files)",
          "src/lib/sources/ — External API integration modules (TMDB, Jikan, IGDB)",
          "src/types/ — TypeScript type declarations",
        ].map(t => bullet(t)),
        divider(),

        // ─── 4. CORE FEATURES ───
        heading("4. Core Features"),

        // 4.1 Personal Media Library
        heading("4.1 Personal Media Library", HeadingLevel.HEADING_2),
        para("The heart of NerdVault. Users can add movies, TV shows, anime, and games to their personal library with the following statuses:"),
        ...[
          "Watched/Played — Media the user has completed, with optional rating (1–5 stars) and text review",
          "Wishlist — Media the user wants to experience next, with optional priority ranking",
          "Automatic deduplication — Adding to Watched auto-removes from Wishlist",
        ].map(t => bullet(t)),
        spacer(),
        para("Library data is persisted both server-side (PostgreSQL via Prisma) for authenticated users and client-side (localStorage) as a fallback. The vault-client module provides a unified API that handles both seamlessly with a 60-second client-side cache and deduplication of in-flight requests."),
        spacer(),
        boldBullet("Watched Items", "Stored in the WatchedItem table with userId + mediaId composite key, rating, notes, and timestamp"),
        boldBullet("Wishlist Items", "Stored in the WishlistItem table with userId + mediaId composite key and priority field"),
        boldBullet("Sorting", "Library can be sorted by: Recent, Title, or Rating"),
        boldBullet("Filtering", "Library can be filtered by media type: All, Movie, Show, Anime, Game"),
        boldBullet("Search", "Full-text search across title, original title, genres, and overview"),

        // 4.2 Smart Folders
        heading("4.2 Smart Folders (Playlist System)", HeadingLevel.HEADING_2),
        para("Users can create custom folders — similar to playlists in music apps — to organize media in any way they choose:"),
        ...[
          "Create folders with custom name, description, and cover image",
          "Add any media item to any number of folders",
          "Folders support privacy levels: Public, Friends Only, or Private",
          "Default folder visibility is configurable per user",
          "Folder cover images can be adjusted via the Image Adjuster Modal",
          "Folders appear in the sidebar for quick navigation",
          "Folder slugs are auto-generated from names for clean URLs",
        ].map(t => bullet(t)),
        spacer(),
        para("Examples: \"Best Story Games\", \"Weekend Movies\", \"Top Anime\", \"Chill Vibes\". Folders are stored in the Folder and FolderItem tables with cascade deletion."),

        // 4.3 Social System
        heading("4.3 Social System", HeadingLevel.HEADING_2),
        para("NerdVault includes a complete social layer for connecting with other entertainment enthusiasts:"),
        spacer(),
        boldBullet("Friend Requests", "Send, accept, and decline friend requests. Stored in FriendRequest table with pending/accepted/declined status"),
        boldBullet("Friend Management", "Friendship records are bidirectional in the Friendship table. Remove friends with cascade cleanup"),
        boldBullet("User Search", "Search for users by name or handle via /api/social/search endpoint"),
        boldBullet("Recommendations", "Send media recommendations directly to friends via inbox system. Includes the media item and optional rating snapshot"),
        boldBullet("Activity Feed", "Friends' recent watched/played media shown on the home feed"),
        boldBullet("Profile Viewing", "View other users' profiles with privacy-respecting visibility rules (watched list, wishlist, folders each have independent privacy levels)"),
        boldBullet("Showcase", "User profiles display showcase sections for watched, wishlist, and folders (capped at 48 media items and 18 folders)"),

        // 4.4 Discovery & Browse
        heading("4.4 Discovery & Browse", HeadingLevel.HEADING_2),
        para("The Browse page is the primary discovery interface, offering a rich catalog experience:"),
        ...[
          "Mixed-catalog browsing across all 4 media types (Movies, Shows, Anime, Games) simultaneously",
          "Interleaved results — items from different sources are mixed for variety",
          "Genre filtering with 17 genre categories including RPG, Strategy, Simulation, Platformer for games",
          "Full-text search with fuzzy matching, prefix matching, and canonical title normalization",
          "Sort modes: Discovery (seed-based randomization), Newest, Rating, Title",
          "Pagination with 48 items per page and client-side caching (45-second TTL)",
          "Bootstrap catalog pre-loaded server-side for instant first paint",
          "Surfacing catalog for above-the-fold content with a separate discovery seed that rotates every 10 minutes",
          "Browse state preserved via URL search params for shareable links and back-navigation",
          "Detail return context — returning from a media detail page scrolls back to the exact position",
        ].map(t => bullet(t)),

        // 4.5 Home Feed
        heading("4.5 Home Feed & Recommendations", HeadingLevel.HEADING_2),
        para("The Home page delivers a personalized feed based on the user's library:"),
        ...[
          "Personalized greeting based on time of day and user name",
          "Sectioned feed: Movies, Anime, and Games — each with recommendations based on watched/wishlist signals",
          "Signal-based recommendation engine: extracts title roots, studio names, and genre signals from user's library to find related content",
          "Upcoming continuations: detects sequels, new seasons, and next installments in franchises the user is watching",
          "Watched counts per media type displayed in the hero section",
          "Empty-state prompts guide users to add their first item per category",
          "Upcoming items are auto-converted to inbox notifications (deduped server-side)",
          "Home feed is built server-side via /api/home-feed with parallel database calls for performance",
        ].map(t => bullet(t)),

        // 4.6 Media Detail Pages
        heading("4.6 Media Detail Pages", HeadingLevel.HEADING_2),
        para("Each media item has a rich detail page at /media/[slug] with extensive information and interactions:"),
        ...[
          "Full metadata: title, original title, overview, year, rating, runtime, status, language",
          "Genre tags with canonical label normalization",
          "Credits section: actors, voice actors, directors, writers, developers, publishers, studios",
          "Image gallery with cover, backdrop, screenshots, and logos — deduplicated and lazy-loaded",
          "Trailer embed support (YouTube URLs)",
          "Franchise/Collection sections: groups related media from the same franchise or TMDB collection",
          "Anime franchise detection: separates seasons from movies, handles sequel/spin-off normalization",
          "Related media sections: similar games (IGDB), related by franchise (TMDB), show relations (spin-offs, etc.)",
          "Media actions panel: Mark as Watched/Played, Add to Wishlist, Add to Folder, Rate & Review, Recommend to Friend",
          "Back navigation with scroll position restoration via detail-return context",
          "Image adjuster modal for fine-tuning cover art positioning",
        ].map(t => bullet(t)),

        // 4.7 Books
        heading("4.7 Books & Reading Room", HeadingLevel.HEADING_2),
        para("A separate, quieter space for book lovers, intentionally isolated from the main media social layer:"),
        ...[
          "Powered by Project Gutenberg via Gutendex API — 75,000+ free classic ebooks",
          "Dedicated browse interface at /books with genre filtering (17 genre categories)",
          "In-app reader at /books/[id]/read with paginated content",
          "Reader settings: font scale, line height, page width, paragraph spacing, font family (serif/sans), theme (dark/light)",
          "Quick zoom levels: 90%, 100%, 112%, 124%, 136%, 150%",
          "Auto-save reading progress — resume exactly where you stopped",
          "Book wishlist (separate from media wishlist) — save titles to read later",
          "No social layer — no ratings, no recommendations to friends, no main-app crossover",
          "Separate sidebar navigation (BooksSidebar) with its own UX",
          "6-hour catalog cache with concurrent pre-loading (8 parallel requests)",
        ].map(t => bullet(t)),

        // 4.8 User Profiles
        heading("4.8 User Profiles", HeadingLevel.HEADING_2),
        para("User profiles serve as the personal hub and social identity:"),
        ...[
          "Display name, handle (auto-generated @handle), avatar, and bio",
          "Showcase sections: Watched, Wishlist, and Folders with configurable visibility",
          "Privacy controls: independent visibility settings for watched list, wishlist, and default folder visibility",
          "Profile settings: update display name, username, bio, and avatar",
          "View other users' profiles with privacy-aware access — only visible content is shown",
          "Friend list display with mutual friend indicators",
          "Inbox/notification panel within the profile context",
          "Guest mode: unauthenticated users see a prompt to sign in with limited browse access",
        ].map(t => bullet(t)),

        // 4.9 Auth
        heading("4.9 Authentication System", HeadingLevel.HEADING_2),
        para("NerdVault uses NextAuth.js v5 (beta) with a Prisma adapter for database-backed sessions:"),
        ...[
          "Credentials provider: Email + password sign-up and sign-in with Zod validation",
          "Google OAuth provider: Optional, auto-enabled when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are configured",
          "Password security: bcryptjs with 12 salt rounds",
          "Database session strategy: Sessions stored in PostgreSQL for server-side control",
          "Custom sign-in page at /sign-in with login/signup mode toggle",
          "Redirect protection: Safe redirect path validation prevents open redirect attacks",
          "OAuth transient cookie cleanup on Google sign-in",
          "Server actions: signInWithCredentials, signUpWithCredentials, signInWithGoogle, signOutUser",
          "Auth cookie reset component for client-side session synchronization",
          "Auth-required modal: Prompts guest users to sign in when attempting authenticated actions",
        ].map(t => bullet(t)),

        // 4.10 Notifications
        heading("4.10 Notifications", HeadingLevel.HEADING_2),
        para("A full notification system keeps users informed of social activity:"),
        ...[
          "Notification types: friend_request, friend_accepted, recommendation, info",
          "Notification status: unread / read — with mark-as-read and dismiss actions",
          "Recommendation notifications include the media item and a rating snapshot from the sender",
          "Upcoming franchise installments auto-generate info notifications (deduped server-side)",
          "Notifications are accessed via the top bar inbox panel",
          "REST API: PATCH /api/social/notifications/[id] (mark read), DELETE (dismiss)",
        ].map(t => bullet(t)),
        divider(),

        // ─── 5. API REFERENCE ───
        heading("5. API Reference"),
        para("All API routes follow Next.js App Router conventions. Authenticated endpoints require a valid session."),
        spacer(),

        heading("5.1 Authentication", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/auth/[...nextauth]", "GET/POST", "NextAuth.js catch-all handler"],
            ["/api/auth/me", "GET", "Returns current session user info"],
            ["/api/auth/clear-cookies", "POST", "Clears auth session cookies"],
          ]
        ),
        spacer(),

        heading("5.2 Library", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/library", "GET", "Get full library state (watched, wishlist, folders)"],
            ["/api/library/watched", "POST", "Add media to watched (with optional review)"],
            ["/api/library/watched", "DELETE", "Remove media from watched by source+sourceId"],
            ["/api/library/wishlist", "POST", "Add media to wishlist"],
            ["/api/library/wishlist", "DELETE", "Remove media from wishlist by source+sourceId"],
            ["/api/library/folders", "POST", "Create a new folder"],
            ["/api/library/folders/[folderId]", "PATCH", "Update folder (name, cover, description, visibility)"],
            ["/api/library/folders/[folderId]", "DELETE", "Delete a folder and its items"],
            ["/api/library/folders/[folderId]/items", "POST", "Add media item to folder"],
            ["/api/library/folders/[folderId]/items", "DELETE", "Remove media item from folder"],
          ]
        ),
        spacer(),

        heading("5.3 Social", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/social/friends/request", "POST", "Send a friend request to another user"],
            ["/api/social/friends/accept", "POST", "Accept a pending friend request"],
            ["/api/social/friends/decline", "POST", "Decline a pending friend request"],
            ["/api/social/friends/remove", "POST", "Remove an existing friend"],
            ["/api/social/search", "GET", "Search users by name/handle (query param)"],
            ["/api/social/recommend", "POST", "Send media recommendation to friends"],
            ["/api/social/notifications/[id]", "PATCH", "Mark notification as read"],
            ["/api/social/notifications/[id]", "DELETE", "Dismiss/delete a notification"],
          ]
        ),
        spacer(),

        heading("5.4 Catalog & Discovery", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/catalog/browse", "GET", "Paginated mixed-catalog browse with filters"],
            ["/api/catalog/bootstrap", "GET", "Pre-loaded bootstrap catalog for initial page load"],
            ["/api/home-feed", "GET", "Personalized home feed with recommendations (auth required)"],
          ]
        ),
        spacer(),

        heading("5.5 Books", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/books", "GET", "Browse books with pagination and genre filtering"],
            ["/api/books/[id]", "GET", "Get book details and reader content"],
            ["/api/books/progress", "GET", "Get reading progress for all books"],
            ["/api/books/progress", "POST", "Save reading progress for a book"],
          ]
        ),
        spacer(),

        heading("5.6 Profile", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/profile", "GET", "Get vault profile payload for a user"],
            ["/api/profile/display-name", "PATCH", "Update display name"],
            ["/api/profile/username", "PATCH", "Update username/handle"],
          ]
        ),
        spacer(),

        heading("5.7 Image Proxy", HeadingLevel.HEADING_3),
        makeTable(
          ["Endpoint", "Method", "Description"],
          [
            ["/api/image", "GET", "Proxy and optimize external images (url, width params)"],
          ]
        ),
        divider(),

        // ─── 6. DATABASE SCHEMA ───
        heading("6. Database Schema"),
        para("The PostgreSQL database is managed via Prisma ORM with 14 models and 8 enums:"),
        spacer(),

        heading("6.1 Models", HeadingLevel.HEADING_3),
        makeTable(
          ["Model", "Purpose", "Key Fields"],
          [
            ["User", "User accounts and profile", "id, name, email, bio, passwordHash, privacy settings"],
            ["Media", "All media items across sources", "id, slug, title, type, source, sourceId, coverUrl, backdropUrl"],
            ["Genre", "Genre categories", "id, name, slug"],
            ["MediaGenre", "Media ↔ Genre junction", "mediaId, genreId (composite PK)"],
            ["Person", "People (actors, directors, etc.)", "id, name, slug, imageUrl"],
            ["MediaPerson", "Media ↔ Person junction", "mediaId, personId, role, character (composite PK)"],
            ["MediaImage", "Additional media images", "id, mediaId, url, kind (cover/backdrop/screenshot/logo)"],
            ["WatchedItem", "User's watched/played media", "userId, mediaId (composite PK), rating, notes, watchedAt"],
            ["WishlistItem", "User's wishlist", "userId, mediaId (composite PK), priority"],
            ["Folder", "Custom user folders", "id, userId, name, slug, description, visibility, coverUrl"],
            ["FolderItem", "Media items in folders", "folderId, mediaId (composite PK)"],
            ["FriendRequest", "Friend request tracking", "id, fromUserId, toUserId, status (pending/accepted/declined)"],
            ["Friendship", "Established friendships", "userId, friendId (composite PK)"],
            ["Notification", "User notifications", "id, userId, fromUserId, type, message, status, mediaId"],
            ["Account", "OAuth account linking", "provider, providerAccountId (composite PK)"],
            ["Session", "Auth sessions", "sessionToken (PK), userId, expires"],
            ["VerificationToken", "Email verification", "identifier, token (composite PK)"],
          ]
        ),
        spacer(),

        heading("6.2 Enums", HeadingLevel.HEADING_3),
        makeTable(
          ["Enum", "Values", "Purpose"],
          [
            ["MediaType", "movie, show, anime, anime_movie, game", "Classifies the media item type"],
            ["MediaSource", "tmdb, igdb, jikan, local", "Identifies which external API provided the data"],
            ["PersonRole", "actor, voice_actor, director, creator, writer, developer, publisher, studio", "Role of a person in media production"],
            ["ImageKind", "cover, backdrop, screenshot, logo", "Type of media image"],
            ["PrivacyLevel", "public, friends, private", "Visibility setting for user content"],
            ["FriendRequestStatus", "pending, accepted, declined", "Status of a friend request"],
            ["NotificationType", "friend_request, friend_accepted, recommendation, info", "Type of notification"],
            ["NotificationStatus", "unread, read", "Read status of notification"],
          ]
        ),
        spacer(),
        para("Key constraints: Media has a unique constraint on (source, sourceId). Folder has a unique constraint on (userId, slug). FriendRequest has a unique constraint on (fromUserId, toUserId). All junction tables use composite primary keys. Cascade deletion is used throughout for referential integrity."),
        divider(),

        // ─── 7. EXTERNAL API INTEGRATIONS ───
        heading("7. External API Integrations"),
        para("NerdVault integrates with four external APIs, each with a dedicated module in src/lib/sources/:"),
        spacer(),

        heading("7.1 TMDB (The Movie Database)", HeadingLevel.HEADING_3),
        ...[
          "Source: src/lib/sources/tmdb.ts (~32K, largest integration module)",
          "Covers: Movies and TV Shows",
          "Functions: browseTmdbCatalog, getTmdbMediaDetails, getTmdbCollectionItems, getTmdbFranchiseEntries, getTmdbRelatedByFranchise, getTmdbShowRelations, getTmdbStarterCatalog",
          "Collection/franchise support: Groups movies in the same TMDB collection (e.g., Marvel phases)",
          "Show relations: Handles spin-offs, sequels, and related shows",
          "Image paths resolved against TMDB image CDN (image.tmdb.org/t/p/)",
          "API key required: TMDB_API_KEY environment variable",
        ].map(t => bullet(t)),
        spacer(),

        heading("7.2 Jikan (MyAnimeList Unofficial API)", HeadingLevel.HEADING_3),
        ...[
          "Source: src/lib/sources/jikan.ts (~26K)",
          "Covers: Anime and Anime Movies",
          "Functions: browseJikanAnime, getJikanAnimeDetails, getJikanAnimeFranchise",
          "Franchise grouping: Groups anime by series, separating seasons from movies and OVAs",
          "Rate limit handling: Built-in retry logic for Jikan's rate limits",
          "Image URLs from cdn.myanimelist.net",
          "No API key required (public API with rate limits)",
        ].map(t => bullet(t)),
        spacer(),

        heading("7.3 IGDB (Internet Game Database)", HeadingLevel.HEADING_3),
        ...[
          "Source: src/lib/sources/igdb.ts (~18K)",
          "Covers: Video Games",
          "Functions: browseIgdbGames, getIgdbGameDetails, getIgdbFranchiseEntries, getIgdbRelatedGamesByFranchise, getIgdbSimilarGamesForGame",
          "Uses Twitch App Access Token for authentication (OAuth2 client credentials flow)",
          "Franchise and similar game support",
          "Image URLs from images.igdb.com",
          "API credentials required: IGDB_CLIENT_ID, IGDB_CLIENT_SECRET, TWITCH_APP_ACCESS_TOKEN",
        ].map(t => bullet(t)),
        spacer(),

        heading("7.4 Gutendex (Project Gutenberg)", HeadingLevel.HEADING_3),
        ...[
          "Source: src/lib/books.ts (~13K)",
          "Covers: Free classic ebooks (75,000+ titles)",
          "Functions: Book browsing, detail retrieval, reader content loading",
          "Genre mapping: 17 genre categories mapped from Gutenberg subject terms",
          "Concurrent catalog pre-loading with 8 parallel requests",
          "6-hour server-side catalog cache",
          "No API key required (public API)",
        ].map(t => bullet(t)),
        divider(),

        // ─── 8. UI/UX DESIGN ───
        heading("8. UI/UX Design Philosophy"),
        para("NerdVault follows a deliberate design language that prioritizes immersion and visual comfort:"),
        ...[
          "Dark mode first — Theme color #060911, no light mode toggle for the main app",
          "Glassmorphism — Blurred backgrounds, transparent panels with glass-like effects",
          "Minimal & modern — Clean lines, generous spacing, no visual clutter",
          "Large media thumbnails — Inspired by streaming platforms like Netflix and Disney+",
          "Soft animations and transitions — Smooth state changes without jarring movement",
          "Poppins brand font — Used for headings and brand identity with variable weight (400–800)",
          "Calibri body font — Used for readable content text",
          "Color palette system — src/lib/color-palettes.ts provides dynamic color extraction from media covers",
          "Responsive layout — App shell with sidebar + main workspace pattern",
          "Loading states — Custom NVLoader component with branded animation",
          "Skeleton screens — Used for initial page loads to prevent layout shift",
          "Action feedback — Toast-style feedback for user actions (add to watched, folder created, etc.)",
          "Auth-required modal — Non-blocking prompt when guests attempt authenticated actions",
        ].map(t => bullet(t)),
        divider(),

        // ─── 9. PERFORMANCE ───
        heading("9. Performance & Caching Strategy"),
        para("NerdVault employs a multi-layer caching strategy for fast load times:"),
        spacer(),

        heading("9.1 Server-Side Caching", HeadingLevel.HEADING_3),
        ...[
          "Browse bootstrap catalog: 30-minute TTL in-memory cache",
          "Mixed catalog results: 10-minute TTL in-memory cache",
          "Book catalog: 6-hour TTL with concurrent pre-loading",
          "Home feed: Force-dynamic rendering with parallel DB calls",
          "Catalog API: 5-minute Cache-Control with 1-hour stale-while-revalidate",
          "Global pages: 1-hour Cache-Control with 24-hour stale-while-revalidate",
        ].map(t => bullet(t)),
        spacer(),

        heading("9.2 Client-Side Caching", HeadingLevel.HEADING_3),
        ...[
          "Vault client: 60-second request cache with in-flight deduplication",
          "Browse workspace: 45-second client-side cache per URL signature",
          "Custom events: nerdvault-data-change and afterglow-library-change for cross-component reactivity",
          "localStorage fallback: Library state persisted client-side for offline/guest access",
        ].map(t => bullet(t)),
        spacer(),

        heading("9.3 Image Optimization", HeadingLevel.HEADING_3),
        ...[
          "Next.js Image component with WebP + AVIF formats",
          "Minimum cache TTL: 86,400 seconds (24 hours)",
          "Image proxy API (/api/image) for external image optimization",
          "Resilient media image component with fallback chains",
          "Image preloader component for critical above-the-fold images",
          "Performance optimizer component for viewport-based prefetching",
        ].map(t => bullet(t)),
        spacer(),

        heading("9.4 Route Prefetching", HeadingLevel.HEADING_3),
        ...[
          "RoutePrefetcher component for intelligent link prefetching",
          "RouteLoader component for smooth page transitions",
          "Detail return context preserves scroll position when navigating back from detail pages",
        ].map(t => bullet(t)),
        divider(),

        // ─── 10. ENVIRONMENT ───
        heading("10. Environment Configuration"),
        para("Required environment variables (see .env.example):"),
        makeTable(
          ["Variable", "Required", "Description"],
          [
            ["DATABASE_URL", "Yes", "PostgreSQL connection string"],
            ["AUTH_SECRET", "Yes", "Long random string for NextAuth encryption"],
            ["AUTH_URL", "Yes", "Base URL of the application (e.g., http://localhost:3000)"],
            ["AUTH_GOOGLE_ID", "No", "Google OAuth Client ID (enables Google sign-in)"],
            ["AUTH_GOOGLE_SECRET", "No", "Google OAuth Client Secret"],
            ["TMDB_API_KEY", "Yes*", "TMDB API key for movies/TV data"],
            ["IGDB_CLIENT_ID", "Yes*", "IGDB/Twitch client ID for game data"],
            ["IGDB_CLIENT_SECRET", "Yes*", "IGDB/Twitch client secret"],
            ["TWITCH_APP_ACCESS_TOKEN", "Yes*", "Twitch app access token for IGDB auth"],
          ]
        ),
        spacer(),
        para("* Required for full functionality. The app gracefully degrades when individual API keys are missing.", { italics: true, size: 20 }),
        divider(),

        // ─── 11. ROADMAP ───
        heading("11. Roadmap & Future Enhancements"),
        para("The following features and improvements are planned for future releases:"),
        spacer(),

        heading("11.1 Near-Term (v0.2)", HeadingLevel.HEADING_3),
        ...[
          "Taste profiling system — Analyze user preferences across all media types to build a taste profile",
          "Mood-based recommendations — Suggest content based on mood tags (chill, action, emotional, etc.)",
          "Friend compatibility percentage — Calculate taste overlap between friends",
          "Enhanced review system — Rich text reviews with spoiler tags and community interaction",
          "Profile customization — Additional avatar options, banner images, and theme accents",
        ].map(t => bullet(t)),
        spacer(),

        heading("11.2 Mid-Term (v0.3–v0.5)", HeadingLevel.HEADING_3),
        ...[
          "Weekly activity summaries — Streaming-style stats (e.g., \"You watched 12 hours this week\")",
          "Advanced search — Multi-field search with filters for year range, rating range, source, etc.",
          "Collection milestones — Badges and achievements for library milestones (100th movie, etc.)",
          "Public profile sharing — Shareable profile links for social media",
          "Import from other platforms — Import watchlists from MAL, Letterboxd, Steam, etc.",
          "Real-time updates — WebSocket-based live notifications and friend activity",
          "Offline mode — Full PWA support with service worker and offline library access",
        ].map(t => bullet(t)),
        spacer(),

        heading("11.3 Long-Term (v1.0+)", HeadingLevel.HEADING_3),
        ...[
          "AI-powered recommendations — Machine learning model trained on user behavior",
          "Community features — Forums, discussion threads, watch parties",
          "Streaming integration — Deep links to streaming platforms (Netflix, Crunchyroll, etc.)",
          "Mobile app — React Native companion app with sync",
          "Premium tier — Advanced analytics, unlimited folders, priority support",
          "API for developers — Public API for third-party integrations",
          "Multi-language support — i18n for global audience",
        ].map(t => bullet(t)),
        divider(),

        // ─── 12. DEVELOPER NOTES ───
        heading("12. Developer Notes"),
        spacer(),

        heading("12.1 Getting Started", HeadingLevel.HEADING_3),
        ...[
          "Clone the repository",
          "Copy .env.example to .env and fill in required values",
          "Run npm install to install dependencies",
          "Run npx prisma migrate dev to set up the database",
          "Run npm run dev to start the development server on localhost:3000",
        ].map(t => bullet(t)),
        spacer(),

        heading("12.2 Available Scripts", HeadingLevel.HEADING_3),
        makeTable(
          ["Script", "Command", "Description"],
          [
            ["dev", "npm run dev", "Start Next.js development server"],
            ["build", "npm run build", "Create production build"],
            ["start", "npm run start", "Start production server"],
            ["lint", "npm run lint", "TypeScript type checking (tsc --noEmit)"],
            ["clean", "npm run clean", "Remove .next and tsconfig.tsbuildinfo"],
            ["clean:deep", "npm run clean:deep", "Remove .next, tsconfig.tsbuildinfo, and node_modules"],
            ["prisma:generate", "npm run prisma:generate", "Generate Prisma client"],
            ["prisma:migrate", "npm run prisma:migrate", "Run Prisma migrations"],
          ]
        ),
        spacer(),

        heading("12.3 Architecture Decisions", HeadingLevel.HEADING_3),
        ...[
          "App Router over Pages Router — Full adoption of Next.js 16 App Router with server components",
          "Server Components by default — Pages are server-rendered; client components are explicitly marked with 'use client'",
          "Dual storage strategy — Server-side PostgreSQL for authenticated users, localStorage fallback for guests",
          "Signal-based recommendations — Home feed uses title roots, studio names, and genre signals rather than collaborative filtering",
          "Franchise normalization — Custom title normalization handles anime season/part/cour patterns, TMDB collections, and IGDB franchises",
          "Privacy-first social — Three-tier privacy (public/friends/private) applied independently to watched, wishlist, and folders",
          "Books as a separate domain — Intentional isolation from the main media social layer for a focused reading experience",
        ].map(t => bullet(t)),
        spacer(),

        heading("12.4 Contact & Support", HeadingLevel.HEADING_3),
        para("For support requests, bug reports, or feedback:"),
        bullet("Email: asifraffy@gmail.com"),
        bullet("Support page: /support (includes bug report guidelines)"),
        bullet("GitHub: RaffayCantCode/Nerd-Vault"),
        spacer(),
        para("When reporting bugs, include: exact page and action sequence, expected vs actual result, device type and browser version, and a screenshot or recording if possible.", { italics: true }),
        spacer(),
        divider(),
        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "— End of Documentation —", size: 24, color: "94A3B8", italics: true, font: "Poppins" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80 },
          children: [new TextRun({ text: "NerdVault · Your Universe of Entertainment", size: 20, color: BRAND_COLOR, bold: true, font: "Poppins" })],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("NerdVault-Documentation.docx", buffer);
console.log("✅ NerdVault-Documentation.docx generated successfully!");
