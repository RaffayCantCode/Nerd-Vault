import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const mediaTable = sqliteTable("media", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  overview: text("overview"),
  type: text("type").notNull(), // 'movie' | 'show' | 'anime' | 'game'
  status: text("status"),
  releaseYear: integer("release_year"),
  runtime: integer("runtime"),
  rating: real("rating"),
  coverUrl: text("cover_url"),
  backdropUrl: text("backdrop_url"),
  trailerUrl: text("trailer_url"),
  language: text("language").default("en"),
  source: text("source").notNull(), // 'tmdb' | 'anilist' | 'igdb' | 'rawg' | 'local'
  sourceId: text("source_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const genresTable = sqliteTable("genres", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const mediaGenresTable = sqliteTable("media_genres", {
  mediaId: text("media_id").notNull().references(() => mediaTable.id, { onDelete: "cascade" }),
  genreId: text("genre_id").notNull().references(() => genresTable.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.mediaId, t.genreId] }),
]);

export type Media = typeof mediaTable.$inferSelect;
export type InsertMedia = typeof mediaTable.$inferInsert;
export type Genre = typeof genresTable.$inferSelect;
