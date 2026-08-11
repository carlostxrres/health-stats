import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sources } from "./sources.js";

export const workoutTypes = pgTable("workout_types", {
  code: text("code").primaryKey(), // 'strength' | 'running' | 'cycling' | 'walking' | ...
  label: text("label").notNull(),
});

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull(),
  durationMinutes: integer("duration_minutes"),
  workoutType: text("workout_type")
    .notNull()
    .references(() => workoutTypes.code),
  notes: text("notes"),
  source: text("source")
    .notNull()
    .default("manual")
    .references(() => sources.code),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

// Scalar values that vary by workout type: distance, calories, avg heart rate...
export const workoutMetrics = pgTable("workout_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(), // 'distance_km' | 'avg_heart_rate' | 'calories' | ...
  value: numeric("value", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
});

// Strength-specific: sets/reps/weight are inherently tabular, don't force into workoutMetrics.
export const workoutSets = pgTable("workout_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
  position: integer("position").notNull().default(0),
});

export const workoutPhotos = pgTable("workout_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  position: integer("position").notNull().default(0),
});

export const workoutsRelations = relations(workouts, ({ many }) => ({
  metrics: many(workoutMetrics),
  sets: many(workoutSets),
  photos: many(workoutPhotos),
}));

export const workoutMetricsRelations = relations(workoutMetrics, ({ one }) => ({
  workout: one(workouts, { fields: [workoutMetrics.workoutId], references: [workouts.id] }),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
}));

export const workoutPhotosRelations = relations(workoutPhotos, ({ one }) => ({
  workout: one(workouts, { fields: [workoutPhotos.workoutId], references: [workouts.id] }),
}));
