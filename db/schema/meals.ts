import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources";

export const meals = pgTable("meals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  eatenAt: timestamp("eaten_at", { withTimezone: true, mode: "string" }).notNull(),
  location: text("location"),
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const mealIngredients = pgTable("meal_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealId: uuid("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),
  quantityValue: numeric("quantity_value", { precision: 10, scale: 2 }),
  quantityUnit: text("quantity_unit"),
  quantityRaw: text("quantity_raw"), // fallback for "a handful", "to taste", etc.
  position: integer("position").notNull().default(0),
});

export const mealPhotos = pgTable("meal_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealId: uuid("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  position: integer("position").notNull().default(0),
});

export const mealsRelations = relations(meals, ({ many }) => ({
  ingredients: many(mealIngredients),
  photos: many(mealPhotos),
}));
