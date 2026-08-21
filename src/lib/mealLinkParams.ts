import { MEAL_TYPES, mealIngredientInputSchema } from "@shared/validation";
import { z } from "zod";
import type { MealInitialData } from "@/components/forms/MealForm";

// Lets an external site (e.g. a recipe site) deep-link into /log with a meal
// mostly filled in: /log?type=meal&title=...&ingredients=<json array>. Only
// meal is supported for now — this is a concrete, narrow use case, not a
// generic prefill mechanism for every entry type.
//
// eatenAt and photos are deliberately never read from the URL: the caller
// can't know when the user will actually eat this, and a photo can't
// reasonably round-trip through a URL.
const INGREDIENTS_PARAM_SCHEMA = z.array(mealIngredientInputSchema).max(50);

export function buildMealInitialDataFromParams(params: URLSearchParams): MealInitialData | null {
  if (params.get("type") !== "meal") return null;

  const mealTypeParam = params.get("mealType");
  const mealType = (MEAL_TYPES as readonly string[]).includes(mealTypeParam ?? "")
    ? (mealTypeParam as (typeof MEAL_TYPES)[number])
    : MEAL_TYPES[0];

  let ingredients: MealInitialData["ingredients"] = [];
  const ingredientsParam = params.get("ingredients");
  if (ingredientsParam) {
    try {
      ingredients = INGREDIENTS_PARAM_SCHEMA.parse(JSON.parse(ingredientsParam)).map((i) => ({
        ingredient: i.ingredient,
        quantityValue: i.quantityValue != null ? String(i.quantityValue) : null,
        quantityUnit: i.quantityUnit ?? null,
      }));
    } catch {
      // Malformed link — skip ingredients rather than blocking the page.
    }
  }

  return {
    mealType,
    title: params.get("title") ?? "",
    description: params.get("description"),
    eatenAt: new Date().toISOString(),
    location: params.get("location"),
    ingredients,
    photos: [],
  };
}
