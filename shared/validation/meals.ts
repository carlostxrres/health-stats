import { z } from "zod";

export const mealIngredientInputSchema = z.object({
  ingredient: z.string().min(1).max(200),
  quantityValue: z.number().optional(),
  quantityUnit: z.string().max(50).optional(),
  quantityRaw: z.string().max(100).optional(),
});

export const mealInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eatenAt: z.iso.datetime({ offset: true }),
  location: z.string().max(200).optional(),
  ingredients: z.array(mealIngredientInputSchema).default([]),
  photoStoragePaths: z.array(z.string().min(1)).default([]),
});

export type MealInput = z.infer<typeof mealInputSchema>;
