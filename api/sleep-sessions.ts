import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { sleepSessions } from "../db/schema/index.js";
import { sleepSessionInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

async function list(req: VercelRequest, res: VercelResponse) {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  const rows = await db.query.sleepSessions.findMany({
    where: and(
      from ? gte(sleepSessions.wentToBedAt, from) : undefined,
      to ? lt(sleepSessions.wentToBedAt, to) : undefined,
    ),
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
