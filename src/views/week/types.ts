import type {
  MealWithDetails,
  PoopEntryWithPhotos,
  SleepSession,
  WorkoutWithDetails,
} from "@shared/types";

type WeekEventBase = {
  id: string;
  day: string;
  range: [number, number];
  startLabel: string;
  endLabel: string;
  // True when this row is only part of an event that straddles a day boundary,
  // so `range`'s corresponding edge is a midnight cut and not the real
  // start/end of the event.
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type WeekEventRow =
  | (WeekEventBase & { kind: "sleep"; data: SleepSession })
  | (WeekEventBase & { kind: "meal"; data: MealWithDetails })
  | (WeekEventBase & { kind: "workout"; data: WorkoutWithDetails })
  | (WeekEventBase & { kind: "poop"; data: PoopEntryWithPhotos });
