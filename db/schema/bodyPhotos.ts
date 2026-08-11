import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources";

export const bodyPhotos = pgTable("body_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  takenAt: timestamp("taken_at", { withTimezone: true, mode: "string" }).notNull(),
  description: text("description"),
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const bodyPhotoFiles = pgTable("body_photo_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  bodyPhotoId: uuid("body_photo_id")
    .notNull()
    .references(() => bodyPhotos.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  position: integer("position").notNull().default(0),
});

export const bodyPhotosRelations = relations(bodyPhotos, ({ many }) => ({
  files: many(bodyPhotoFiles),
}));

export const bodyPhotoFilesRelations = relations(bodyPhotoFiles, ({ one }) => ({
  bodyPhoto: one(bodyPhotos, {
    fields: [bodyPhotoFiles.bodyPhotoId],
    references: [bodyPhotos.id],
  }),
}));
