import { sqliteTable, text, primaryKey, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { mediaTable } from "./media";

export const foldersTable = sqliteTable("folders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  visibility: text("visibility").notNull().default("public"), // 'public' | 'friends' | 'private'
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  unique().on(t.userId, t.slug),
]);

export const folderItemsTable = sqliteTable("folder_items", {
  folderId: text("folder_id").notNull().references(() => foldersTable.id, { onDelete: "cascade" }),
  mediaId: text("media_id").notNull().references(() => mediaTable.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  primaryKey({ columns: [t.folderId, t.mediaId] }),
]);

export type Folder = typeof foldersTable.$inferSelect;
export type InsertFolder = typeof foldersTable.$inferInsert;
export type FolderItem = typeof folderItemsTable.$inferSelect;
