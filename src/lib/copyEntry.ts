import type { EntryTypeCode } from "@shared/entryTypes";
import type { BodyPhotoInitialData } from "@/components/forms/BodyPhotoForm";
import type { HealthEpisodeInitialData } from "@/components/forms/HealthEpisodeForm";
import type { MealInitialData } from "@/components/forms/MealForm";
import type { MedicationInitialData } from "@/components/forms/MedicationForm";
import type { MetricEntryInitialData } from "@/components/forms/MetricEntryForm";
import type { PoopEntryInitialData } from "@/components/forms/PoopEntryForm";
import type { SleepSessionInitialData } from "@/components/forms/SleepSessionForm";
import type { WorkoutInitialData } from "@/components/forms/WorkoutForm";

// "Copy to new": reuse an existing entry as the starting point for a new
// one. Everything carries over except date/time (never makes sense to
// backdate a copy to when the original happened) and photos (can't be
// duplicated to a new storage path from here).
export function buildCopyInitialData(type: EntryTypeCode, data: unknown): unknown {
  const now = new Date().toISOString();
  switch (type) {
    case "metric":
      return { ...(data as MetricEntryInitialData), recordedAt: now };
    case "meal":
      return { ...(data as MealInitialData), eatenAt: now, photos: [] };
    case "medication":
      return { ...(data as MedicationInitialData), takenAt: now };
    case "workout":
      return { ...(data as WorkoutInitialData), startedAt: now, photos: [] };
    case "sleep":
      return { ...(data as SleepSessionInitialData), wentToBedAt: now, wokeUpAt: now };
    case "poop":
      return { ...(data as PoopEntryInitialData), occurredAt: now, photos: [] };
    case "health_episode":
      return { ...(data as HealthEpisodeInitialData), startedAt: now, recoveredAt: null };
    case "body_photo":
      return { ...(data as BodyPhotoInitialData), takenAt: now, files: [] };
  }
}
