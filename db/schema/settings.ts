import { date, integer, jsonb, numeric, pgTable, text, time, timestamp } from "drizzle-orm/pg-core";

// Single-user app: this table only ever has one row, keyed by the fixed id
// "default" (same singleton idiom as picking a fixed PK value rather than
// adding real multi-row semantics nothing here needs).
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("default"),
  displayName: text("display_name"),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  birthDate: date("birth_date"),
  timeZone: text("time_zone").notNull().default("Europe/Madrid"),
  // Matches Date#getDay()'s convention: 0=Sun..6=Sat.
  weekStartDay: integer("week_start_day").notNull().default(1),
  // Base hue (0-359) for --chart-highlight; --chart-highlight-2 and beyond
  // are derived from it at (hue + 137.508) % 360 per step (golden angle).
  chartHue: integer("chart_hue").notNull().default(30),
  sleepGoalMinutes: integer("sleep_goal_minutes"),
  bedtimeGoal: time("bedtime_goal"),
  wakeTimeGoal: time("wake_time_goal"),
  weightGoalMinKg: numeric("weight_goal_min_kg", { precision: 5, scale: 1 }),
  weightGoalMaxKg: numeric("weight_goal_max_kg", { precision: 5, scale: 1 }),
  // Entry types hidden from unauthenticated requests (read access is public
  // by default, see api/_lib/http.ts's createHandler). Whole-type granularity
  // only, matching the app's existing EntryTypeCode concept — not per-entry.
  privateEntryTypes: jsonb("private_entry_types").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
