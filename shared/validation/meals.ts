import { z } from "zod";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const MEAL_TYPE_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export const mealIngredientInputSchema = z.object({
  ingredient: z.string().min(1).max(200),
  quantityValue: z.number().optional(),
  quantityUnit: z.string().max(50).optional(),
  quantityRaw: z.string().max(100).optional(),
});

export const mealInputSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eatenAt: z.iso.datetime({ offset: true }),
  location: z.string().max(200).optional(),
  ingredients: z.array(mealIngredientInputSchema).default([]),
  photoStoragePaths: z.array(z.string().min(1)).default([]),
});

export type MealInput = z.infer<typeof mealInputSchema>;
