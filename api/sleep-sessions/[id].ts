import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { sleepSessions } from "../../db/schema";
import { sleepSessionInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

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

export default createHandler({ PATCH: update });
