import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { healthEpisodes } from "../../db/schema";
import { healthEpisodeInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

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

export default createHandler({ PATCH: update });
