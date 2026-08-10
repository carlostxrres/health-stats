import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources";

export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true, mode: "string" }).notNull(),
  location: text("location"),
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
