import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const nutritionGoals = pgTable("nutrition_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectLabel: text("subject_label").notNull(), // free text, e.g. "Proteína", "Sardinas en lata", "Fermentados"
  subjectType: text("subject_type").notNull(), // 'macro' | 'micro' | 'ingredient' | 'category'
  clarification: text("clarification"), // optional hint fed to the AI for ambiguous categories
  limitType: text("limit_type").notNull(), // 'min' | 'max'
  targetQuantity: numeric("target_quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // free text: "g", "piezas", "latas", "veces"...
  timespan: text("timespan").notNull(), // 'daily' | 'weekly'
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const nutritionGoalEvaluations = pgTable(
  "nutrition_goal_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => nutritionGoals.id, { onDelete: "cascade" }),
    // "YYYY-MM-DD" of the day (daily) or the week's start-day per
    // weekStartDay (weekly) — matches the app's existing day-string
    // convention (see localDayKey), and is the upsert/lookup key.
    periodKey: text("period_key").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "string" }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "string" }).notNull(),
    // { label, quantity?, quantityUnit?, matchedAt?, mealType?, note? }[]
    matchedItems: jsonb("matched_items").notNull().default([]),
    achievedQuantity: numeric("achieved_quantity", { precision: 10, scale: 2 }).notNull(),
    // percentComplete/met are computed server-side from achievedQuantity vs
    // targetQuantity/limitType, never trusted from the AI's own arithmetic.
    percentComplete: numeric("percent_complete", { precision: 6, scale: 2 }).notNull(),
    met: boolean("met").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [unique().on(table.goalId, table.periodKey)],
);

export const nutritionGoalsRelations = relations(nutritionGoals, ({ many }) => ({
  evaluations: many(nutritionGoalEvaluations),
}));

export const nutritionGoalEvaluationsRelations = relations(nutritionGoalEvaluations, ({ one }) => ({
  goal: one(nutritionGoals, {
    fields: [nutritionGoalEvaluations.goalId],
    references: [nutritionGoals.id],
  }),
}));
