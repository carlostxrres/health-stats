import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources.js";

export const poopEntries = pgTable("poop_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
  location: text("location"),
  bristolScale: integer("bristol_scale"), // 1-7
  urgency: integer("urgency"), // 1-5
  effort: integer("effort"), // 1-5
  feltComplete: boolean("felt_complete"), // null = sin especificar
  color: text("color"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const poopEntryPhotos = pgTable("poop_entry_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  poopEntryId: uuid("poop_entry_id")
    .notNull()
    .references(() => poopEntries.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  position: integer("position").notNull().default(0),
});

export const poopEntriesRelations = relations(poopEntries, ({ many }) => ({
  photos: many(poopEntryPhotos),
}));

export const poopEntryPhotosRelations = relations(poopEntryPhotos, ({ one }) => ({
  poopEntry: one(poopEntries, {
    fields: [poopEntryPhotos.poopEntryId],
    references: [poopEntries.id],
  }),
}));
