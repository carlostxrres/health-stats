import type { MealWithDetails, SleepSession, WorkoutWithDetails } from "@shared/types";

export type FeedItem =
  | { id: string; kind: "meal"; occurredAt: string; data: MealWithDetails }
  | { id: string; kind: "sleep"; occurredAt: string; data: SleepSession }
  | { id: string; kind: "workout"; occurredAt: string; data: WorkoutWithDetails };
