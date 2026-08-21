import type {
  bodyPhotoFiles,
  bodyPhotos,
  healthEpisodes,
  mealIngredients,
  mealPhotos,
  meals,
  medications,
  metricEntries,
  nutritionGoals,
  poopEntries,
  poopEntryPhotos,
  sleepSessions,
  workoutMetrics,
  workoutPhotos,
  workoutSets,
  workouts,
} from "../db/schema/index.js";
import type {
  NUTRITION_GOAL_LIMIT_TYPES,
  NUTRITION_GOAL_SUBJECT_TYPES,
} from "./validation/nutritionGoals.js";

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

export type PoopEntry = typeof poopEntries.$inferSelect;
export type PoopEntryPhoto = typeof poopEntryPhotos.$inferSelect;
export type PoopEntryWithPhotos = PoopEntry & { photos: PoopEntryPhoto[] };

export type BodyPhoto = typeof bodyPhotos.$inferSelect;
export type BodyPhotoFile = typeof bodyPhotoFiles.$inferSelect;
export type BodyPhotoWithFiles = BodyPhoto & { files: BodyPhotoFile[] };

export type NutritionGoal = typeof nutritionGoals.$inferSelect;

export type NutritionComplianceMatchedItem = {
  label: string;
  quantity?: number;
  quantityUnit?: string;
  matchedAt?: string;
  mealType?: string;
  note?: string;
};

// One goal's evaluation for a period, as returned by both the cached-read
// endpoint (GET /entries?resource=nutrition-compliance) and the
// AI-triggering endpoint (POST /ai/parse?kind=nutritionCompliance) — the
// latter's rows lack the goal metadata columns the former joins in.
export type NutritionComplianceEvaluation = {
  goalId: string;
  achievedQuantity: number;
  percentComplete: number;
  met: boolean;
  matchedItems: NutritionComplianceMatchedItem[];
  evaluatedAt: string;
};

export type NutritionComplianceRow = NutritionComplianceEvaluation & {
  periodKey: string;
  subjectLabel: string;
  subjectType: (typeof NUTRITION_GOAL_SUBJECT_TYPES)[number];
  unit: string;
  limitType: (typeof NUTRITION_GOAL_LIMIT_TYPES)[number];
  targetQuantity: string;
};
