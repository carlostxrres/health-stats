import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sources } from "./sources.js";

// Reference table: every simple time-series indicator the app knows about.
// Adding a new indicator (VO2Max, blood panel markers, etc.) later is just a
// new row here plus entries in metricEntries — no migration needed.
export const metricDefinitions = pgTable("metric_definitions", {
  code: text("code").primaryKey(),
  // 'weight' | 'body_circumference' | 'body_fat_pct' | 'blood_pressure' |
  // 'resting_heart_rate' | 'hrv' | 'body_temperature' | 'blood_glucose' |
  // 'steps' | 'outdoor_time_minutes' | 'walking_distance_km' | 'work_hours' |
  // 'energy' | 'mood' | 'stress' | 'pain' | 'hunger_satiety'
  label: text("label").notNull(),
  category: text("category").notNull(), // body_composition | circumference | biomarker | daily_aggregate | subjective
  defaultUnit: text("default_unit").notNull(),
  valueKind: text("value_kind").notNull().default("simple"), // 'simple' | 'composite'
  requiresBodySite: boolean("requires_body_site").notNull().default(false),
});

export const metricEntries = pgTable(
  "metric_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricType: text("metric_type")
      .notNull()
      .references(() => metricDefinitions.code),
    value: numeric("value", { precision: 10, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    // Only populated for composite metrics (blood_pressure: diastolic).
    valueSecondary: numeric("value_secondary", { precision: 10, scale: 3 }),
    // Only populated for body_circumference: 'waist' | 'chest' | 'arm' | 'thigh' | ...
    bodySite: text("body_site"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" }).notNull(),
    // Calculated in the API from the local date/time entered by the user.
    // Deliberately NOT a generated column: timestamptz::date depends on the
    // Postgres session timezone (UTC on most managed providers), which can
    // shift a late-night entry into the wrong day.
    recordedDate: date("recorded_date").notNull(),
    source: text("source")
      .notNull()
      .default("manual")
      .references(() => sources.code),
    externalId: text("external_id"),
    metadata: jsonb("metadata").notNull().default({}),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("metric_entries_source_external_unique").on(table.source, table.externalId),
    index("metric_entries_type_recorded_at_idx").on(table.metricType, table.recordedAt),
  ],
);
