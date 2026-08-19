import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, gte, lt } from "drizzle-orm";
import { poopEntries } from "../db/schema/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

// A dedicated read-only, low-payload endpoint for the regularity heatmap:
// just id/occurredAt/bristolScale, no photos/notes/location, and a much
// higher cap than parseLimit's 100 (see api/_lib/http.ts) since the caller
// needs a full year of rows to bucket client-side, not a paginated feed.
const MAX_SUMMARY_LIMIT = 5000;

async function list(req: VercelRequest, res: VercelResponse) {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  const rows = await db.query.poopEntries.findMany({
    columns: { id: true, occurredAt: true, bristolScale: true },
    where: and(
      from ? gte(poopEntries.occurredAt, from) : undefined,
      to ? lt(poopEntries.occurredAt, to) : undefined,
    ),
    orderBy: desc(poopEntries.occurredAt),
    limit: MAX_SUMMARY_LIMIT,
  });
  res.status(200).json(rows);
}

export default createHandler({ GET: list });
