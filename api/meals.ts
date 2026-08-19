import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { mealIngredients, mealPhotos, meals } from "../db/schema/index.js";
import { mealInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler, parseLimit } from "./_lib/http.js";

async function list(req: VercelRequest, res: VercelResponse) {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const limit = parseLimit(req.query.limit);

  const rows = await db.query.meals.findMany({
    where: and(from ? gte(meals.eatenAt, from) : undefined, to ? lt(meals.eatenAt, to) : undefined),
    orderBy: desc(meals.eatenAt),
    limit,
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
        mealType: input.mealType,
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
        mealType: input.mealType,
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

async function remove(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(meals).where(eq(meals.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
