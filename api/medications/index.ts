import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { medications } from "../../db/schema";
import { medicationInputSchema } from "../../shared/validation";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

async function list(_req: VercelRequest, res: VercelResponse) {
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

async function remove(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  await db.delete(medications).where(eq(medications.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, DELETE: remove });
