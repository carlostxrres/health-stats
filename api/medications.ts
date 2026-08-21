import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { medications } from "../db/schema/index.js";
import { medicationInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";
import { isTypeHiddenFrom } from "./_lib/privacy.js";

async function list(req: VercelRequest, res: VercelResponse) {
  if (await isTypeHiddenFrom(req, "medication")) {
    res.status(200).json([]);
    return;
  }

  const rows = await db.query.medications.findMany({
    orderBy: desc(medications.takenAt),
    limit: 50,
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = medicationInputSchema.parse(req.body);
  const [row] = await db.insert(medications).values(input).returning();
  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = medicationInputSchema.parse(req.body);

  const [row] = await db
    .update(medications)
    .set({
      title: input.title,
      takenAt: input.takenAt,
      location: input.location ?? null,
    })
    .where(eq(medications.id, id))
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
  await db.delete(medications).where(eq(medications.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
