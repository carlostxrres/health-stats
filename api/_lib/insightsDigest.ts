import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  meals,
  metricEntries,
  poopEntries,
  sleepSessions,
  workouts,
} from "../../db/schema/index.js";
import { db } from "./db.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: string, days: number): string {
  return new Date(new Date(now).getTime() - days * DAY_MS).toISOString();
}

function countBy<T>(rows: T[], key: (row: T) => string): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return "sin datos";
  return [...counts.entries()].map(([k, c]) => `${k}: ${c}`).join(", ");
}

// A compact, cronologically-ordered text summary of the user's last 30 days
// of meals, plus aggregate counts — deliberately not a raw DB dump (keeps
// the prompt small and lets the model reason over already-shaped text
// rather than JSON). Capped at 150 meals; 30 days at a realistic logging
// frequency stays well under that in practice.
export async function buildMealDigest(now: string): Promise<string> {
  const since = daysAgo(now, 30);
  const rows = await db.query.meals.findMany({
    where: gte(meals.eatenAt, since),
    orderBy: desc(meals.eatenAt),
    with: { ingredients: true },
    limit: 150,
  });

  if (rows.length === 0) {
    return "No hay comidas registradas en los últimos 30 días.";
  }

  const ingredientCounts = new Map<string, number>();
  for (const meal of rows) {
    for (const ingredient of meal.ingredients) {
      const key = ingredient.ingredient.trim().toLowerCase();
      ingredientCounts.set(key, (ingredientCounts.get(key) ?? 0) + 1);
    }
  }
  const topIngredients = [...ingredientCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => `${name} (${count})`)
    .join(", ");

  const lines = rows.map((meal) => {
    const time = meal.eatenAt.slice(0, 16).replace("T", " ");
    const ingredientList = meal.ingredients.map((i) => i.ingredient).join(", ");
    const suffix = [
      ingredientList && `— ${ingredientList}`,
      meal.description && `· "${meal.description}"`,
    ]
      .filter(Boolean)
      .join(" ");
    return `- ${time} (${meal.mealType}): ${meal.title}${suffix ? ` ${suffix}` : ""}`;
  });

  return [
    `Comidas registradas en los últimos 30 días: ${rows.length}.`,
    `Por tipo: ${countBy(rows, (m) => m.mealType)}.`,
    `Ingredientes más frecuentes: ${topIngredients || "sin datos"}.`,
    "",
    "Detalle cronológico (más reciente primero):",
    ...lines,
  ].join("\n");
}

// A broader, lighter-weight digest across every tracked domain, for
// open-ended "how am I doing overall" questions.
export async function buildGeneralDigest(now: string): Promise<string> {
  const since30 = daysAgo(now, 30);
  const since14 = daysAgo(now, 14);
  const parts: string[] = [];

  const weights = await db.query.metricEntries.findMany({
    where: and(eq(metricEntries.metricType, "weight"), gte(metricEntries.recordedAt, since30)),
    orderBy: asc(metricEntries.recordedAt),
  });
  if (weights.length > 0) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const delta = Number(last.value) - Number(first.value);
    parts.push(
      `Peso: ${weights.length} mediciones en los últimos 30 días, de ${first.value}kg ` +
        `(${first.recordedAt.slice(0, 10)}) a ${last.value}kg (${last.recordedAt.slice(0, 10)}), ` +
        `variación de ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}kg.`,
    );
  } else {
    parts.push("Peso: sin mediciones en los últimos 30 días.");
  }

  const sleeps = await db.query.sleepSessions.findMany({
    where: and(eq(sleepSessions.isNap, false), gte(sleepSessions.wentToBedAt, since14)),
  });
  if (sleeps.length > 0) {
    const avgHours =
      sleeps.reduce(
        (sum, s) =>
          sum + (new Date(s.wokeUpAt).getTime() - new Date(s.wentToBedAt).getTime()) / 3_600_000,
        0,
      ) / sleeps.length;
    parts.push(
      `Sueño: ${sleeps.length} noches registradas en los últimos 14 días, media de ${avgHours.toFixed(1)}h.`,
    );
  } else {
    parts.push("Sueño: sin noches registradas en los últimos 14 días.");
  }

  const recentMeals = await db.query.meals.findMany({ where: gte(meals.eatenAt, since30) });
  parts.push(
    `Comidas: ${recentMeals.length} registradas en los últimos 30 días (${countBy(recentMeals, (m) => m.mealType)}).`,
  );

  const recentWorkouts = await db.query.workouts.findMany({
    where: gte(workouts.startedAt, since30),
  });
  parts.push(
    `Entrenamientos: ${recentWorkouts.length} en los últimos 30 días (${countBy(recentWorkouts, (w) => w.workoutType)}).`,
  );

  const recentPoop = await db.query.poopEntries.findMany({
    where: gte(poopEntries.occurredAt, since30),
  });
  parts.push(`Deposiciones: ${recentPoop.length} registradas en los últimos 30 días.`);

  return parts.join("\n");
}
