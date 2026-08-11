import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { metricEntries } from "../../db/schema";
import { METRIC_DEFINITIONS } from "../../shared/metricCatalog";
import { metricEntryInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = metricEntryInputSchema.parse(req.body);

  const definition = METRIC_DEFINITIONS.find((m) => m.code === input.metricType);
  if (!definition) {
    res.status(400).json({ error: `Unknown metric type: ${input.metricType}` });
    return;
  }

  // Same rationale as create: the offset in the ISO string IS the local
  // calendar date the user meant, no timezone conversion needed.
  const recordedDate = input.recordedAt.slice(0, 10);

  const [row] = await db
    .update(metricEntries)
    .set({
      metricType: input.metricType,
      value: String(input.value),
      valueSecondary: input.valueSecondary !== undefined ? String(input.valueSecondary) : null,
      bodySite: input.bodySite ?? null,
      unit: definition.defaultUnit,
      recordedAt: input.recordedAt,
      recordedDate,
      notes: input.notes ?? null,
      // Drizzle's `.defaultNow()` only applies on INSERT, not UPDATE.
      updatedAt: new Date().toISOString(),
    })
    .where(eq(metricEntries.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json(row);
}

export default createHandler({ PATCH: update });
