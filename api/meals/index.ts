import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { mealIngredients, mealPhotos, meals } from "../../db/schema";
import { mealInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

async function list(_req: VercelRequest, res: VercelResponse) {
  const rows = await db.query.meals.findMany({
    orderBy: desc(meals.eatenAt),
    limit: 50,
    with: { ingredients: true, photos: true },
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = mealInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [meal] = await tx
      .insert(meals)
      .values({
        title: input.title,
        description: input.description,
        eatenAt: input.eatenAt,
        location: input.location,
      })
      .returning();

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

  res.status(201).json(row);
}

async function remove(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(meals).where(eq(meals.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, DELETE: remove });
