import { sql } from "drizzle-orm";
import { boolean, check, date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources";

export const sleepSessions = pgTable(
  "sleep_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wentToBedAt: timestamp("went_to_bed_at", { withTimezone: true, mode: "string" }).notNull(),
    wokeUpAt: timestamp("woke_up_at", { withTimezone: true, mode: "string" }).notNull(),
    isNap: boolean("is_nap").notNull().default(false),
    qualityRating: integer("quality_rating"), // subjective scale, 1-5
    wakeFeeling: integer("wake_feeling"), // 1-5, per README
    notes: text("notes"),
    source: text("source")
      .notNull()
      .default("manual")
      .references(() => sources.code),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [check("sleep_sessions_time_check", sql`${table.wokeUpAt} > ${table.wentToBedAt}`)],
);

export const healthEpisodes = pgTable("health_episodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  episodeType: text("episode_type").notNull(), // 'injury' | 'illness'
  title: text("title").notNull(),
  description: text("description"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull(),
  recoveredAt: date("recovered_at"), // null = ongoing
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
