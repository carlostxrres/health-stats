import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { mealIngredients, mealPhotos, meals } from "../../db/schema";
import { mealInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = mealInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [meal] = await tx
      .update(meals)
      .set({
        title: input.title,
        description: input.description ?? null,
        eatenAt: input.eatenAt,
        location: input.location ?? null,
      })
      .where(eq(meals.id, id))
      .returning();

    if (!meal) {
      return undefined;
    }

    await tx.delete(mealIngredients).where(eq(mealIngredients.mealId, meal.id));
    await tx.delete(mealPhotos).where(eq(mealPhotos.mealId, meal.id));

    if (input.ingredients.length > 0) {
      await tx.insert(mealIngredients).values(
        input.ingredients.map((ingredient, position) => ({
          mealId: meal.id,
          ingredient: ingredient.ingredient,
          quantityValue:
            ingredient.quantityValue !== undefined ? String(ingredient.quantityValue) : null,
          quantityUnit: ingredient.quantityUnit,
          quantityRaw: ingredient.quantityRaw,
          position,
        })),
      );
    }

    if (input.photoStoragePaths.length > 0) {
      await tx.insert(mealPhotos).values(
        input.photoStoragePaths.map((storagePath, position) => ({
          mealId: meal.id,
          storagePath,
          position,
        })),
      );
    }

    return meal;
  });

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json(row);
}

export default createHandler({ PATCH: update });
