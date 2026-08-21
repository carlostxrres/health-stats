import type { VercelRequest, VercelResponse } from "@vercel/node";
import { asc, eq, max } from "drizzle-orm";
import { appSettings, nutritionGoals } from "../db/schema/index.js";
import {
  nutritionGoalInputSchema,
  nutritionGoalReorderSchema,
  nutritionGoalUpdateSchema,
  settingsUpdateSchema,
} from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

const SETTINGS_ID = "default";

async function get(_req: VercelRequest, res: VercelResponse) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));
  if (!row) {
    res.status(404).json({ error: "Settings not seeded" });
    return;
  }
  res.status(200).json(row);
}

// numeric() columns take/return strings, not JS numbers (see metricEntries.value
// in db/schema/metrics.ts) — convert while preserving explicit nulls (clearing
// a field) vs undefined (field not sent, leave column untouched).
function numericOrNull(value: number | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : String(value);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const input = settingsUpdateSchema.parse(req.body);

  const [row] = await db
    .update(appSettings)
    .set({
      ...input,
      heightCm: numericOrNull(input.heightCm),
      weightGoalMinKg: numericOrNull(input.weightGoalMinKg),
      weightGoalMaxKg: numericOrNull(input.weightGoalMaxKg),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Settings not seeded" });
    return;
  }
  res.status(200).json(row);
}

// Nutrition goals are a separate, multi-row resource (not scalar settings
// fields), so they get their own CRUD branch here rather than a jsonb blob
// on the singleton — reusing this file instead of adding a new top-level
// api/*.ts one (Vercel Hobby's 12-function cap is already maxed out).

async function listGoals(_req: VercelRequest, res: VercelResponse) {
  const rows = await db.query.nutritionGoals.findMany({ orderBy: asc(nutritionGoals.position) });
  res.status(200).json(rows);
}

async function createGoal(req: VercelRequest, res: VercelResponse) {
  const input = nutritionGoalInputSchema.parse(req.body);

  const [{ maxPosition } = { maxPosition: null }] = await db
    .select({ maxPosition: max(nutritionGoals.position) })
    .from(nutritionGoals);

  const [row] = await db
    .insert(nutritionGoals)
    .values({
      subjectLabel: input.subjectLabel,
      subjectType: input.subjectType,
      clarification: input.clarification ?? null,
      limitType: input.limitType,
      targetQuantity: String(input.targetQuantity),
      unit: input.unit,
      timespan: input.timespan,
      active: input.active,
      position: (maxPosition ?? -1) + 1,
    })
    .returning();

  res.status(201).json(row);
}

async function updateGoal(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const { targetQuantity, ...rest } = nutritionGoalUpdateSchema.parse(req.body);

  const [row] = await db
    .update(nutritionGoals)
    .set({
      ...rest,
      targetQuantity: targetQuantity !== undefined ? String(targetQuantity) : undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(nutritionGoals.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json(row);
}

async function reorderGoals(req: VercelRequest, res: VercelResponse) {
  const { ids } = nutritionGoalReorderSchema.parse(req.body);

  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx
        .update(nutritionGoals)
        .set({ position, updatedAt: new Date().toISOString() })
        .where(eq(nutritionGoals.id, id));
    }
  });

  res.status(200).json({ ok: true });
}

async function updateGoalBranch(req: VercelRequest, res: VercelResponse) {
  if (req.query.action === "reorder") {
    await reorderGoals(req, res);
    return;
  }
  await updateGoal(req, res);
}

async function deleteGoal(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(nutritionGoals).where(eq(nutritionGoals.id, id));
  res.status(204).end();
}

export default createHandler({
  GET: (req, res) =>
    req.query.resource === "nutrition-goals" ? listGoals(req, res) : get(req, res),
  POST: createGoal,
  PATCH: (req, res) =>
    req.query.resource === "nutrition-goals" ? updateGoalBranch(req, res) : update(req, res),
  DELETE: deleteGoal,
});
