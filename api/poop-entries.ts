import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { poopEntries, poopEntryPhotos } from "../db/schema/index.js";
import { poopEntryInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler, parseLimit } from "./_lib/http.js";
import { isTypeHiddenFrom } from "./_lib/privacy.js";

// Cap for `?summary=1` requests (see listSummary below) — well above
// parseLimit's normal 100-row cap since the caller needs a full year of
// rows to bucket client-side, not a paginated feed.
const MAX_SUMMARY_LIMIT = 5000;

async function list(req: VercelRequest, res: VercelResponse) {
  if (await isTypeHiddenFrom(req, "poop")) {
    res.status(200).json([]);
    return;
  }

  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  if (req.query.summary === "1") {
    await listSummary(req, res, from, to);
    return;
  }

  const limit = parseLimit(req.query.limit);
  const rows = await db.query.poopEntries.findMany({
    where: and(
      from ? gte(poopEntries.occurredAt, from) : undefined,
      to ? lt(poopEntries.occurredAt, to) : undefined,
    ),
    orderBy: desc(poopEntries.occurredAt),
    limit,
    with: { photos: true },
  });
  res.status(200).json(rows);
}

// A read-only, low-payload variant for the regularity heatmap: just
// id/occurredAt/bristolScale, no photos/notes/location. Shares the
// serverless function with `list` above (Vercel's Hobby plan caps
// deployments at 12 functions) rather than living at its own path.
async function listSummary(
  _req: VercelRequest,
  res: VercelResponse,
  from: string | undefined,
  to: string | undefined,
) {
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

async function create(req: VercelRequest, res: VercelResponse) {
  const input = poopEntryInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(poopEntries)
      .values({
        occurredAt: input.occurredAt,
        location: input.location ?? null,
        bristolScale: input.bristolScale ?? null,
        urgency: input.urgency ?? null,
        effort: input.effort ?? null,
        feltComplete: input.feltComplete ?? null,
        color: input.color ?? null,
        durationMinutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    if (input.photoStoragePaths.length > 0) {
      await tx.insert(poopEntryPhotos).values(
        input.photoStoragePaths.map((storagePath, position) => ({
          poopEntryId: entry.id,
          storagePath,
          position,
        })),
      );
    }

    return entry;
  });

  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = poopEntryInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [entry] = await tx
      .update(poopEntries)
      .set({
        occurredAt: input.occurredAt,
        location: input.location ?? null,
        bristolScale: input.bristolScale ?? null,
        urgency: input.urgency ?? null,
        effort: input.effort ?? null,
        feltComplete: input.feltComplete ?? null,
        color: input.color ?? null,
        durationMinutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
      })
      .where(eq(poopEntries.id, id))
      .returning();

    if (!entry) {
      return undefined;
    }

    await tx.delete(poopEntryPhotos).where(eq(poopEntryPhotos.poopEntryId, entry.id));

    if (input.photoStoragePaths.length > 0) {
      await tx.insert(poopEntryPhotos).values(
        input.photoStoragePaths.map((storagePath, position) => ({
          poopEntryId: entry.id,
          storagePath,
          position,
        })),
      );
    }

    return entry;
  });

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
  await db.delete(poopEntries).where(eq(poopEntries.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
