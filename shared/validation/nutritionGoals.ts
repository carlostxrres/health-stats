import { z } from "zod";

export const NUTRITION_GOAL_SUBJECT_TYPES = ["macro", "micro", "ingredient", "category"] as const;

export const NUTRITION_GOAL_SUBJECT_TYPE_LABELS: Record<
  (typeof NUTRITION_GOAL_SUBJECT_TYPES)[number],
  string
> = {
  macro: "Macronutriente",
  micro: "Micronutriente",
  ingredient: "Ingrediente",
  category: "Categoría de alimento",
};

export const NUTRITION_GOAL_LIMIT_TYPES = ["min", "max"] as const;

export const NUTRITION_GOAL_TIMESPANS = ["daily", "weekly"] as const;

export const nutritionGoalInputSchema = z.object({
  subjectLabel: z.string().trim().min(1).max(200),
  subjectType: z.enum(NUTRITION_GOAL_SUBJECT_TYPES),
  clarification: z.string().trim().max(500).nullable().optional(),
  limitType: z.enum(NUTRITION_GOAL_LIMIT_TYPES),
  targetQuantity: z.number().positive(),
  unit: z.string().trim().min(1).max(50),
  timespan: z.enum(NUTRITION_GOAL_TIMESPANS),
  active: z.boolean().default(true),
});

export type NutritionGoalInput = z.infer<typeof nutritionGoalInputSchema>;

export const nutritionGoalUpdateSchema = nutritionGoalInputSchema.partial();

export type NutritionGoalUpdateInput = z.infer<typeof nutritionGoalUpdateSchema>;

export const nutritionGoalReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const nutritionComplianceQuerySchema = z.object({
  timespan: z.enum(NUTRITION_GOAL_TIMESPANS),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const nutritionComplianceRequestSchema = z.object({
  timespan: z.enum(NUTRITION_GOAL_TIMESPANS),
  periodKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  now: z.iso.datetime({ offset: true }),
});
