import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: text("emailVerified"),
  image: text("image"),
  bio: text("bio"),
  passwordHash: text("password_hash"),
  role: text("role").default("USER"),
  hasSeenOnboarding: integer("has_seen_onboarding").default(0),
  watchedVisibility: text("watched_visibility").default("public"),
  wishlistVisibility: text("wishlist_visibility").default("friends"),
  foldersDefaultVisibility: text("folders_default_visibility").default("public"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const accountsTable = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  oauthTokenSecret: text("oauth_token_secret"),
  oauthToken: text("oauth_token"),
});

export const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(),
});

export const verificationTokensTable = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: text("expires").notNull(),
});

export const passwordResetTokensTable = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expires: text("expires").notNull(),
  used: integer("used").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type Session = typeof sessionsTable.$inferSelect;
