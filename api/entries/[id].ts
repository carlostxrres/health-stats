import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import {
  bodyPhotos,
  healthEpisodes,
  meals,
  medications,
  metricEntries,
  sleepSessions,
  workouts,
} from "../../db/schema";
import type { EntryTypeCode } from "../../shared/entryTypes";
import { db } from "../_lib/db";
import { createHandler } from "../_lib/http";

const LOOKUPS: { type: EntryTypeCode; query: (id: string) => Promise<unknown | undefined> }[] = [
  {
    type: "metric",
    query: (id) => db.query.metricEntries.findFirst({ where: eq(metricEntries.id, id) }),
  },
  {
    type: "meal",
    query: (id) =>
      db.query.meals.findFirst({
        where: eq(meals.id, id),
        with: { ingredients: true, photos: true },
      }),
  },
  {
    type: "medication",
    query: (id) => db.query.medications.findFirst({ where: eq(medications.id, id) }),
  },
  {
    type: "workout",
    query: (id) =>
      db.query.workouts.findFirst({
        where: eq(workouts.id, id),
        with: { metrics: true, sets: true, photos: true },
      }),
  },
  {
    type: "sleep",
    query: (id) => db.query.sleepSessions.findFirst({ where: eq(sleepSessions.id, id) }),
  },
  {
    type: "health_episode",
    query: (id) => db.query.healthEpisodes.findFirst({ where: eq(healthEpisodes.id, id) }),
  },
  {
    type: "body_photo",
    query: (id) =>
      db.query.bodyPhotos.findFirst({ where: eq(bodyPhotos.id, id), with: { files: true } }),
  },
];

async function getById(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  for (const lookup of LOOKUPS) {
    const data = await lookup.query(id);
    if (data) {
      res.status(200).json({ type: lookup.type, data });
      return;
    }
  }

  res.status(404).json({ error: "Not found" });
}

export default createHandler({ GET: getById });
