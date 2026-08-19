-- =========================================================
-- NERDVAULT CLOUDFLARE D1 DATABASE SCHEMA
-- Migration: 0001_initial_schema.sql
-- =========================================================

-- 1. NextAuth / Auth.js Core Tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  emailVerified TEXT,
  image TEXT,
  bio TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'USER',
  has_seen_onboarding INTEGER DEFAULT 0,
  watched_visibility TEXT DEFAULT 'public',
  wishlist_visibility TEXT DEFAULT 'friends',
  folders_default_visibility TEXT DEFAULT 'public',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  oauth_token_secret TEXT,
  oauth_token TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verificationTokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Site Configuration & CMS
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  hero_title TEXT,
  hero_subtitle TEXT,
  featured_media_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Media Catalog & Metadata
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  type TEXT NOT NULL,
  status TEXT,
  release_year INTEGER,
  runtime INTEGER,
  rating REAL,
  cover_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  language TEXT DEFAULT 'en',
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS media_genres (
  media_id TEXT NOT NULL,
  genre_id TEXT NOT NULL,
  PRIMARY KEY (media_id, genre_id),
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- 4. User Vault Tracking (Watched & Wishlist)
CREATE TABLE IF NOT EXISTS watched_items (
  user_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rating INTEGER,
  notes TEXT,
  PRIMARY KEY (user_id, media_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  priority INTEGER,
  PRIMARY KEY (user_id, media_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- 5. Custom Shelves / Folders / Lists
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS folder_items (
  folder_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (folder_id, media_id),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- 6. Social & Friends
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_user_id, to_user_id),
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_user_id TEXT,
  media_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

-- 7. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_source ON media(source, source_id);
CREATE INDEX IF NOT EXISTS idx_media_slug ON media(slug);
CREATE INDEX IF NOT EXISTS idx_watched_items_user ON watched_items(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
