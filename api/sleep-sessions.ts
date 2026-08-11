import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { sleepSessions } from "../db/schema";
import { sleepSessionInputSchema } from "../shared/validation";
import { db } from "./_lib/db";
import { createHandler } from "./_lib/http";

async function list(_req: VercelRequest, res: VercelResponse) {
  const rows = await db.query.sleepSessions.findMany({
    orderBy: desc(sleepSessions.wentToBedAt),
    limit: 50,
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = sleepSessionInputSchema.parse(req.body);
  const [row] = await db.insert(sleepSessions).values(input).returning();
  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = sleepSessionInputSchema.parse(req.body);

  const [row] = await db
    .update(sleepSessions)
    .set({
      wentToBedAt: input.wentToBedAt,
      wokeUpAt: input.wokeUpAt,
      isNap: input.isNap,
      qualityRating: input.qualityRating ?? null,
      wakeFeeling: input.wakeFeeling ?? null,
      notes: input.notes ?? null,
    })
    .where(eq(sleepSessions.id, id))
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
  await db.delete(sleepSessions).where(eq(sleepSessions.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
