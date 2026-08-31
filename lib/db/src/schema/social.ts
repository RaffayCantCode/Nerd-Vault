import { sqliteTable, text, primaryKey, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { mediaTable } from "./media";

export const friendshipsTable = sqliteTable("friendships", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  friendId: text("friend_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  primaryKey({ columns: [t.userId, t.friendId] }),
]);

export const friendRequestsTable = sqliteTable("friend_requests", {
  id: text("id").primaryKey(),
  fromUserId: text("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toUserId: text("to_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  unique().on(t.fromUserId, t.toUserId),
]);

export const notificationsTable = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  mediaId: text("media_id").references(() => mediaTable.id, { onDelete: "set null" }),
  type: text("type").notNull(), // 'friend_request' | 'recommendation' | 'activity' | 'system'
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // 'unread' | 'read'
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteSettingsTable = sqliteTable("site_settings", {
  id: text("id").primaryKey(),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  featuredMediaId: text("featured_media_id"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Friendship = typeof friendshipsTable.$inferSelect;
export type FriendRequest = typeof friendRequestsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type SiteSettings = typeof siteSettingsTable.$inferSelect;
