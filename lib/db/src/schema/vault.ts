import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { mediaTable } from "./media";

export const watchedItemsTable = sqliteTable("watched_items", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mediaId: text("media_id").notNull().references(() => mediaTable.id, { onDelete: "cascade" }),
  watchedAt: text("watched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  rating: integer("rating"),
  notes: text("notes"),
}, (t) => [
  primaryKey({ columns: [t.userId, t.mediaId] }),
]);

export const wishlistItemsTable = sqliteTable("wishlist_items", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mediaId: text("media_id").notNull().references(() => mediaTable.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  priority: integer("priority"),
}, (t) => [
  primaryKey({ columns: [t.userId, t.mediaId] }),
]);

export type WatchedItem = typeof watchedItemsTable.$inferSelect;
export type InsertWatchedItem = typeof watchedItemsTable.$inferInsert;
export type WishlistItem = typeof wishlistItemsTable.$inferSelect;
export type InsertWishlistItem = typeof wishlistItemsTable.$inferInsert;
