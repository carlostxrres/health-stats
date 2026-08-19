import type {
  MealWithDetails,
  PoopEntryWithPhotos,
  SleepSession,
  WorkoutWithDetails,
} from "@shared/types";
import { apiClient } from "@/lib/api-client";
import { formatBoundaryOffset, splitByBoundaryDay } from "@/lib/dayBoundary";
import { addDays } from "@/lib/localTime";
import type { WeekEventRow } from "./types";

const MEAL_DURATION_MINUTES = 30; // meals have no end time, so they're always shown as a fixed 30min bar

// Fallback when a workout has no recorded duration — matches the meal
// convention above; not an explicit spec requirement, just a reasonable
// default so an undurationed workout still shows as a visible bar.
const DEFAULT_WORKOUT_DURATION_MINUTES = 30;

// Same idea for poop entries without a recorded duration — shorter than the
// meal/workout default since these are typically quick events.
const DEFAULT_POOP_DURATION_MINUTES = 10;

function addMinutesIso(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

// The week view's day-splitting is always at plain midnight.
const BOUNDARY_HOUR = 0;

export async function fetchWeekEvents(weekDays: string[]): Promise<WeekEventRow[]> {
  // Coarse, deliberately-padded prefilter (a full day of slack on each
  // side) — the authoritative per-day bucketing happens client-side via
  // splitByBoundaryDay, which is timezone-correct via localDayKey/
  // localHourOfDay. This window only needs to be wide enough to never
  // exclude an event that actually belongs in the selected week; a day of
  // slack absorbs any timezone/DST offset between the browser's clock and
  // the app's display timezone.
  const from = `${addDays(weekDays[0], -1)}T00:00:00.000Z`;
  const to = `${addDays(weekDays[weekDays.length - 1], 2)}T00:00:00.000Z`;
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const [sessions, meals, workouts, poopEntries] = await Promise.all([
    apiClient.get<SleepSession[]>(`/sleep-sessions?${query}`),
    apiClient.get<MealWithDetails[]>(`/meals?${query}`),
    apiClient.get<WorkoutWithDetails[]>(`/workouts?${query}`),
    apiClient.get<PoopEntryWithPhotos[]>(`/poop-entries?${query}`),
  ]);

  const rows: WeekEventRow[] = [];

  for (const session of sessions) {
    const segments = splitByBoundaryDay(
      { start: session.wentToBedAt, end: session.wokeUpAt },
      BOUNDARY_HOUR,
    );
    segments.forEach((segment, index) => {
      rows.push({
        id: `sleep:${session.id}:${index}`,
        day: segment.day,
        range: segment.range,
        startLabel: formatBoundaryOffset(segment.range[0], BOUNDARY_HOUR),
        endLabel: formatBoundaryOffset(segment.range[1], BOUNDARY_HOUR),
        kind: "sleep",
        data: session,
      });
    });
  }

  for (const meal of meals) {
    const segments = splitByBoundaryDay(
      { start: meal.eatenAt, end: addMinutesIso(meal.eatenAt, MEAL_DURATION_MINUTES) },
      BOUNDARY_HOUR,
    );
    segments.forEach((segment, index) => {
      rows.push({
        id: `meal:${meal.id}:${index}`,
        day: segment.day,
        range: segment.range,
        startLabel: formatBoundaryOffset(segment.range[0], BOUNDARY_HOUR),
        endLabel: formatBoundaryOffset(segment.range[1], BOUNDARY_HOUR),
        kind: "meal",
        data: meal,
      });
    });
  }

  for (const workout of workouts) {
    const durationMinutes = workout.durationMinutes ?? DEFAULT_WORKOUT_DURATION_MINUTES;
    const segments = splitByBoundaryDay(
      { start: workout.startedAt, end: addMinutesIso(workout.startedAt, durationMinutes) },
      BOUNDARY_HOUR,
    );
    segments.forEach((segment, index) => {
      rows.push({
        id: `workout:${workout.id}:${index}`,
        day: segment.day,
        range: segment.range,
        startLabel: formatBoundaryOffset(segment.range[0], BOUNDARY_HOUR),
        endLabel: formatBoundaryOffset(segment.range[1], BOUNDARY_HOUR),
        kind: "workout",
        data: workout,
      });
    });
  }

  for (const entry of poopEntries) {
    const durationMinutes = entry.durationMinutes ?? DEFAULT_POOP_DURATION_MINUTES;
    const segments = splitByBoundaryDay(
      { start: entry.occurredAt, end: addMinutesIso(entry.occurredAt, durationMinutes) },
      BOUNDARY_HOUR,
    );
    segments.forEach((segment, index) => {
      rows.push({
        id: `poop:${entry.id}:${index}`,
        day: segment.day,
        range: segment.range,
        startLabel: formatBoundaryOffset(segment.range[0], BOUNDARY_HOUR),
        endLabel: formatBoundaryOffset(segment.range[1], BOUNDARY_HOUR),
        kind: "poop",
        data: entry,
      });
    });
  }

  return rows;
}
