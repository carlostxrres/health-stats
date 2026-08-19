import type {
  MealWithDetails,
  PoopEntryWithPhotos,
  SleepSession,
  WorkoutWithDetails,
} from "@shared/types";

export type WeekEventRow =
  | {
      id: string;
      day: string;
      range: [number, number];
      startLabel: string;
      endLabel: string;
      kind: "sleep";
      data: SleepSession;
    }
  | {
      id: string;
      day: string;
      range: [number, number];
      startLabel: string;
      endLabel: string;
      kind: "meal";
      data: MealWithDetails;
    }
  | {
      id: string;
      day: string;
      range: [number, number];
      startLabel: string;
      endLabel: string;
      kind: "workout";
      data: WorkoutWithDetails;
    }
  | {
      id: string;
      day: string;
      range: [number, number];
      startLabel: string;
      endLabel: string;
      kind: "poop";
      data: PoopEntryWithPhotos;
    };
