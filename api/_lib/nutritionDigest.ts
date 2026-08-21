import { and, asc, gte, lt } from "drizzle-orm";
import { meals } from "../../db/schema/index.js";
import { db } from "./db.js";

function formatIngredient(ingredient: {
  ingredient: string;
  quantityValue: string | null;
  quantityUnit: string | null;
  quantityRaw: string | null;
}): string {
  const quantity =
    ingredient.quantityValue != null
      ? `${ingredient.quantityValue}${ingredient.quantityUnit ? ` ${ingredient.quantityUnit}` : ""}`
      : ingredient.quantityRaw;
  return quantity ? `${ingredient.ingredient} (${quantity})` : ingredient.ingredient;
}

// A literal, itemized text digest of every meal logged in [periodStart,
// periodEnd) — deliberately not aggregated/summarized like
// insightsDigest.ts's buildMealDigest, since the model has to cite which
// specific meals/ingredients contribute to each goal, not just get a vibe
// for the period.
export async function buildNutritionPeriodDigest(
  periodStart: string,
  periodEnd: string,
): Promise<string> {
  const rows = await db.query.meals.findMany({
    where: and(gte(meals.eatenAt, periodStart), lt(meals.eatenAt, periodEnd)),
    orderBy: asc(meals.eatenAt),
    with: { ingredients: true },
  });

  if (rows.length === 0) {
    return "No hay comidas registradas en este periodo.";
  }

  const lines = rows.map((meal) => {
    const time = meal.eatenAt.slice(0, 16).replace("T", " ");
    const ingredientList = meal.ingredients.map(formatIngredient).join(", ");
    const suffix = [
      ingredientList && `— ${ingredientList}`,
      meal.description && `· "${meal.description}"`,
    ]
      .filter(Boolean)
      .join(" ");
    return `- ${time} (${meal.mealType}) "${meal.title}"${suffix ? ` ${suffix}` : ""}`;
  });

  return lines.join("\n");
}
