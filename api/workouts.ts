import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { workoutMetrics, workoutPhotos, workoutSets, workouts } from "../db/schema/index.js";
import { workoutInputSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler, parseLimit } from "./_lib/http.js";
import { isTypeHiddenFrom } from "./_lib/privacy.js";

async function list(req: VercelRequest, res: VercelResponse) {
  if (await isTypeHiddenFrom(req, "workout")) {
    res.status(200).json([]);
    return;
  }

  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const limit = parseLimit(req.query.limit);

  const rows = await db.query.workouts.findMany({
    where: and(
      from ? gte(workouts.startedAt, from) : undefined,
      to ? lt(workouts.startedAt, to) : undefined,
    ),
    orderBy: desc(workouts.startedAt),
    limit,
    with: { metrics: true, sets: true, photos: true },
  });
  res.status(200).json(rows);
}

async function create(req: VercelRequest, res: VercelResponse) {
  const input = workoutInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({
        startedAt: input.startedAt,
        durationMinutes: input.durationMinutes,
        workoutType: input.workoutType,
        location: input.location,
        notes: input.notes,
      })
      .returning();

    if (input.metrics.length > 0) {
      await tx.insert(workoutMetrics).values(
        input.metrics.map((metric) => ({
          workoutId: workout.id,
          metricType: metric.metricType,
          value: String(metric.value),
          unit: metric.unit,
        })),
      );
    }

    if (input.sets.length > 0) {
      await tx.insert(workoutSets).values(
        input.sets.map((set, position) => ({
          workoutId: workout.id,
          exerciseName: set.exerciseName,
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg !== undefined ? String(set.weightKg) : null,
          position,
        })),
      );
    }

    if (input.photoStoragePaths.length > 0) {
      await tx.insert(workoutPhotos).values(
        input.photoStoragePaths.map((storagePath, position) => ({
          workoutId: workout.id,
          storagePath,
          position,
        })),
      );
    }

    return workout;
  });

  res.status(201).json(row);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const input = workoutInputSchema.parse(req.body);

  const row = await db.transaction(async (tx) => {
    const [workout] = await tx
      .update(workouts)
      .set({
        startedAt: input.startedAt,
        durationMinutes: input.durationMinutes ?? null,
        workoutType: input.workoutType,
        location: input.location ?? null,
        notes: input.notes ?? null,
      })
      .where(eq(workouts.id, id))
      .returning();

    if (!workout) {
      return undefined;
    }

    await tx.delete(workoutMetrics).where(eq(workoutMetrics.workoutId, workout.id));
    await tx.delete(workoutSets).where(eq(workoutSets.workoutId, workout.id));
    await tx.delete(workoutPhotos).where(eq(workoutPhotos.workoutId, workout.id));

    if (input.metrics.length > 0) {
      await tx.insert(workoutMetrics).values(
        input.metrics.map((metric) => ({
          workoutId: workout.id,
          metricType: metric.metricType,
          value: String(metric.value),
          unit: metric.unit,
        })),
      );
    }

    if (input.sets.length > 0) {
      await tx.insert(workoutSets).values(
        input.sets.map((set, position) => ({
          workoutId: workout.id,
          exerciseName: set.exerciseName,
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg !== undefined ? String(set.weightKg) : null,
          position,
        })),
      );
    }

    if (input.photoStoragePaths.length > 0) {
      await tx.insert(workoutPhotos).values(
        input.photoStoragePaths.map((storagePath, position) => ({
          workoutId: workout.id,
          storagePath,
          position,
        })),
      );
    }

    return workout;
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
  await db.delete(workouts).where(eq(workouts.id, id));
  res.status(204).end();
}

export default createHandler({ GET: list, POST: create, PATCH: update, DELETE: remove });
