import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  code: text("code").primaryKey(), // 'manual' | 'withings' (future) | ...
  label: text("label").notNull(),
  kind: text("kind").notNull(), // 'manual' | 'api' | 'import'
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
