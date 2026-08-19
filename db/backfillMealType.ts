import { asc, eq } from "drizzle-orm";
import { localClock, localDayKey, localHourOfDay } from "../src/lib/localTime.js";
import { client, db } from "./client.js";
import { appSettings, meals } from "./schema/index.js";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Slot = "breakfast" | "lunch" | "dinner";

const TIME_WINDOWS: Record<
  Slot,
  { coreStart: number; coreEnd: number; extStart: number; extEnd: number; canonical: number }
> = {
  breakfast: { coreStart: 6, coreEnd: 10, extStart: 5, extEnd: 11, canonical: 8 },
  lunch: { coreStart: 13, coreEnd: 16, extStart: 12, extEnd: 17, canonical: 14 },
  dinner: { coreStart: 20, coreEnd: 22, extStart: 19, extEnd: 23, canonical: 21 },
};

const KEYWORDS: Record<Slot, string[]> = {
  breakfast: [
    "tostada",
    "tostadas",
    "cafe",
    "cereales",
    "cereal",
    "yogur",
    "zumo",
    "avena",
    "magdalena",
    "croissant",
    "tortitas",
    "mermelada",
    "muesli",
  ],
  lunch: [
    "ensalada",
    "arroz",
    "pollo",
    "pasta",
    "lentejas",
    "garbanzos",
    "guiso",
    "filete",
    "merluza",
    "patatas",
    "cocido",
    "paella",
    "macarrones",
    "ternera",
    "menestra",
    "potaje",
    "comida",
  ],
  dinner: ["sopa", "crema de", "tortilla", "revuelto", "consome", "caldo"],
};

const EXPLICIT_LABELS: Record<Slot, RegExp> = {
  breakfast: /\bdesayuno\b/,
  lunch: /\balmuerzo\b/,
  dinner: /\bcena\b/,
};

const EXPLICIT_SNACK = /\b(merienda|tentempie|snack)\b/;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function timeScore(slot: Slot, hour: number): number {
  const w = TIME_WINDOWS[slot];
  if (hour >= w.coreStart && hour < w.coreEnd) return 2;
  if (hour >= w.extStart && hour < w.extEnd) return 1;
  return 0;
}

function keywordScore(slot: Slot, text: string): number {
  return Math.min(KEYWORDS[slot].filter((kw) => text.includes(kw)).length, 3);
}

type MealRow = {
  id: string;
  eatenAt: string;
  title: string;
  description: string | null;
  source: string;
  mealType: string | null;
  ingredients: { ingredient: string }[];
};

type Triple = { mealId: string; slot: Slot; score: number; hour: number; eatenAt: string };

// Manual corrections reviewed and confirmed by the user for cases where the
// heuristic's explicit-label bonus outranked the better-fitting candidate —
// specifically 2026-08-19, where "Desayuno de media mañana habitual" (11:00)
// beat "Tostadas de queso y jamón" (08:05) for the breakfast slot; the user
// wants it the other way around. Applied after classifyDay, keyed by meal id.
const MANUAL_OVERRIDES: Record<string, MealType> = {
  "a37b122f-92d2-499d-a454-796df7f14258": "breakfast", // Tostadas de queso y jamón, 08:05
  "29d2df97-f637-4347-89cc-bbae427f6097": "snack", // Desayuno de media mañana habitual, 11:00
};

// At most one breakfast/lunch/dinner per day: build every (meal, slot) pair
// with a positive score, then resolve them all at once in a single greedy
// pass (highest score first, ties broken by closeness to the slot's
// canonical time) rather than resolving each slot independently — a
// borderline meal can be a candidate for two slots, and resolving slots in a
// fixed order would bias which one it lands in.
function classifyDay(dayMeals: MealRow[], timeZone: string): Map<string, MealType> {
  const result = new Map<string, MealType>();
  const triples: Triple[] = [];

  for (const meal of dayMeals) {
    const text = normalize(
      [meal.title, meal.description ?? "", ...meal.ingredients.map((i) => i.ingredient)].join(" "),
    );

    if (EXPLICIT_SNACK.test(text)) {
      result.set(meal.id, "snack");
      continue;
    }

    result.set(meal.id, "snack"); // default unless claimed below
    const hour = localHourOfDay(meal.eatenAt, timeZone);

    for (const slot of ["breakfast", "lunch", "dinner"] as Slot[]) {
      const explicit = EXPLICIT_LABELS[slot].test(text) ? 5 : 0;
      const score = timeScore(slot, hour) + keywordScore(slot, text) + explicit;
      if (score > 0) {
        triples.push({ mealId: meal.id, slot, score, hour, eatenAt: meal.eatenAt });
      }
    }
  }

  triples.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const distA = Math.abs(a.hour - TIME_WINDOWS[a.slot].canonical);
    const distB = Math.abs(b.hour - TIME_WINDOWS[b.slot].canonical);
    if (distA !== distB) return distA - distB;
    if (a.eatenAt !== b.eatenAt) return a.eatenAt < b.eatenAt ? -1 : 1;
    return a.mealId < b.mealId ? -1 : 1;
  });

  const claimedSlots = new Set<Slot>();
  const claimedMeals = new Set<string>();
  for (const t of triples) {
    if (claimedSlots.has(t.slot) || claimedMeals.has(t.mealId)) continue;
    result.set(t.mealId, t.slot);
    claimedSlots.add(t.slot);
    claimedMeals.add(t.mealId);
  }

  return result;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [settingsRow] = await db.select().from(appSettings).where(eq(appSettings.id, "default"));
  const timeZone = settingsRow?.timeZone ?? "Europe/Madrid";

  const rows = (await db.query.meals.findMany({
    orderBy: asc(meals.eatenAt),
    with: { ingredients: true },
  })) as MealRow[];

  const nonManual = rows.filter((r) => r.source !== "manual");
  if (nonManual.length > 0) {
    console.warn(
      `Aviso: ${nonManual.length} meal(s) con source distinto de "manual" — se clasifican con la misma heurística.`,
    );
  }

  const byDay = new Map<string, MealRow[]>();
  for (const row of rows) {
    const day = localDayKey(row.eatenAt, timeZone);
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  const assignments = new Map<string, MealType>();
  for (const dayMeals of byDay.values()) {
    for (const [id, type] of classifyDay(dayMeals, timeZone)) {
      assignments.set(id, type);
    }
  }
  for (const [id, type] of Object.entries(MANUAL_OVERRIDES)) {
    assignments.set(id, type);
  }

  console.log(`Zona horaria usada: ${timeZone}\n`);
  console.table(
    rows.map((row) => ({
      fecha: localDayKey(row.eatenAt, timeZone),
      hora: localClock(row.eatenAt, timeZone),
      titulo: row.title,
      ingredientes: row.ingredients
        .map((i) => i.ingredient)
        .join(", ")
        .slice(0, 60),
      tipoAsignado: assignments.get(row.id),
      yaTeniaTipo: row.mealType ?? "-",
    })),
  );

  const counts = [...assignments.values()].reduce<Record<string, number>>((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Resumen:", counts);

  if (!apply) {
    console.log("\nDry run. Ejecuta con --apply para escribir los cambios.");
    return;
  }

  const toUpdate = rows.filter((row) => row.mealType === null);
  await db.transaction(async (tx) => {
    for (const row of toUpdate) {
      const mealType = assignments.get(row.id);
      if (!mealType) continue;
      await tx.update(meals).set({ mealType }).where(eq(meals.id, row.id));
    }
  });

  console.log(`Aplicado — ${toUpdate.length} meal(s) actualizados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
