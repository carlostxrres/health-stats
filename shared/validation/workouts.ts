import { z } from "zod";
import { WORKOUT_TYPE_CODES } from "../metricCatalog.js";

export const workoutMetricInputSchema = z.object({
  metricType: z.string().min(1).max(50),
  value: z.number(),
  unit: z.string().min(1).max(20),
});

export const workoutSetInputSchema = z.object({
  exerciseName: z.string().min(1).max(200),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional(),
});

export const workoutInputSchema = z.object({
  startedAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int().min(0).optional(),
  workoutType: z.enum(WORKOUT_TYPE_CODES),
  notes: z.string().max(2000).optional(),
  metrics: z.array(workoutMetricInputSchema).default([]),
  sets: z.array(workoutSetInputSchema).default([]),
  photoStoragePaths: z.array(z.string().min(1)).default([]),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;
