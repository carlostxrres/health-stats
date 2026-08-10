import type {
  bodyPhotoFiles,
  bodyPhotos,
  healthEpisodes,
  mealIngredients,
  mealPhotos,
  meals,
  medications,
  metricEntries,
  sleepSessions,
  workoutMetrics,
  workoutPhotos,
  workoutSets,
  workouts,
} from "../db/schema";

export type MetricEntry = typeof metricEntries.$inferSelect;

export type Meal = typeof meals.$inferSelect;
export type MealIngredient = typeof mealIngredients.$inferSelect;
export type MealPhoto = typeof mealPhotos.$inferSelect;
export type MealWithDetails = Meal & { ingredients: MealIngredient[]; photos: MealPhoto[] };

export type Medication = typeof medications.$inferSelect;

export type Workout = typeof workouts.$inferSelect;
export type WorkoutMetric = typeof workoutMetrics.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type WorkoutPhoto = typeof workoutPhotos.$inferSelect;
export type WorkoutWithDetails = Workout & {
  metrics: WorkoutMetric[];
  sets: WorkoutSet[];
  photos: WorkoutPhoto[];
};

export type SleepSession = typeof sleepSessions.$inferSelect;
export type HealthEpisode = typeof healthEpisodes.$inferSelect;

export type BodyPhoto = typeof bodyPhotos.$inferSelect;
export type BodyPhotoFile = typeof bodyPhotoFiles.$inferSelect;
export type BodyPhotoWithFiles = BodyPhoto & { files: BodyPhotoFile[] };
