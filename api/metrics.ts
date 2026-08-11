import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { metricEntries } from "../db/schema";
import { METRIC_DEFINITIONS } from "../shared/metricCatalog";
import { metricEntryInputSchema } from "../shared/validation";
import { db } from "./_lib/db";
import { createHandler } from "./_lib/http";

async function list(req: VercelRequest, res: VercelResponse) {
  const metricType = typeof req.query.metricType === "string" ? req.query.metricType : undefined;

  const rows = await db.query.metricEntries.findMany({
    where: metricType ? eq(metricEntries.metricType, metricType) : undefined,
    orderBy: desc(metricEntries.recordedAt),
    limit: 100,
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = metricEntryInputSchema.parse(req.body);

  // z.iso.datetime({ offset: true }) preserves the sender's UTC offset, so
  // the date portion of the raw string IS the local calendar date the user
  // meant — no timezone conversion needed (and converting would risk
  // shifting a late-night entry into the wrong day).
  const recordedDate = input.recordedAt.slice(0, 10);
  const definition = METRIC_DEFINITIONS.find((m) => m.code === input.metricType);
  if (!definition) {
    res.status(400).json({ error: `Unknown metric type: ${input.metricType}` });
    return;
  }

  const [row] = await db
    .insert(metricEntries)
    .values({
      metricType: input.metricType,
      value: String(input.value),
      valueSecondary: input.valueSecondary !== undefined ? String(input.valueSecondary) : null,
      bodySite: input.bodySite,
      unit: definition.defaultUnit,
      recordedAt: input.recordedAt,
      recordedDate,
      notes: input.notes,
    })
    .returning();

  res.status(201).json(row);
}

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

async function remove(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(metricEntries).where(eq(metricEntries.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
