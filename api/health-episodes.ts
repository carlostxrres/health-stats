import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { healthEpisodes } from "../db/schema/index.js";
import { healthEpisodeInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

async function list(_req: VercelRequest, res: VercelResponse) {
  const rows = await db.query.healthEpisodes.findMany({
    orderBy: desc(healthEpisodes.startedAt),
    limit: 50,
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = healthEpisodeInputSchema.parse(req.body);
  const [row] = await db.insert(healthEpisodes).values(input).returning();
  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = healthEpisodeInputSchema.parse(req.body);

  const [row] = await db
    .update(healthEpisodes)
    .set({
      episodeType: input.episodeType,
      title: input.title,
      description: input.description ?? null,
      startedAt: input.startedAt,
      recoveredAt: input.recoveredAt ?? null,
    })
    .where(eq(healthEpisodes.id, id))
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
  await db.delete(healthEpisodes).where(eq(healthEpisodes.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
