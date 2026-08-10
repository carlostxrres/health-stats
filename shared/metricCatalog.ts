// Canonical catalog of simple time-series indicators (the `metric_entries` EAV
// table) and workout types. This is the single source of truth: db/seed.ts
// seeds the database from it, and the frontend/validation derive their
// dropdowns and enums from it. Adding a new indicator later (VO2Max, a blood
// panel marker, ...) is just a new entry here + a re-run of `db:seed`.

export const METRIC_DEFINITIONS = [
  { code: "weight", label: "Peso", category: "body_composition", defaultUnit: "kg" },
  {
    code: "body_circumference",
    label: "Perímetro corporal",
    category: "circumference",
    defaultUnit: "cm",
    requiresBodySite: true,
  },
  {
    code: "body_fat_pct",
    label: "% de grasa corporal",
    category: "body_composition",
    defaultUnit: "%",
  },
  {
    code: "blood_pressure",
    label: "Presión arterial",
    category: "biomarker",
    defaultUnit: "mmHg",
    valueKind: "composite",
  },
  {
    code: "resting_heart_rate",
    label: "Frecuencia cardíaca en reposo",
    category: "biomarker",
    defaultUnit: "bpm",
  },
  { code: "hrv", label: "HRV", category: "biomarker", defaultUnit: "ms" },
  {
    code: "body_temperature",
    label: "Temperatura corporal",
    category: "biomarker",
    defaultUnit: "°C",
  },
  { code: "blood_glucose", label: "Glucosa", category: "biomarker", defaultUnit: "mg/dL" },
  { code: "steps", label: "Pasos", category: "daily_aggregate", defaultUnit: "pasos" },
  {
    code: "outdoor_time_minutes",
    label: "Horas al aire libre",
    category: "daily_aggregate",
    defaultUnit: "min",
  },
  {
    code: "walking_distance_km",
    label: "Distancia caminada",
    category: "daily_aggregate",
    defaultUnit: "km",
  },
  { code: "work_hours", label: "Horas de trabajo", category: "daily_aggregate", defaultUnit: "h" },
  { code: "energy", label: "Energía", category: "subjective", defaultUnit: "/10" },
  { code: "mood", label: "Estado de ánimo", category: "subjective", defaultUnit: "/10" },
  { code: "stress", label: "Estrés", category: "subjective", defaultUnit: "/10" },
  { code: "pain", label: "Dolor / molestias", category: "subjective", defaultUnit: "/10" },
  {
    code: "hunger_satiety",
    label: "Hambre / saciedad",
    category: "subjective",
    defaultUnit: "/10",
  },
] as const;

export type MetricCode = (typeof METRIC_DEFINITIONS)[number]["code"];

export const METRIC_CODES = METRIC_DEFINITIONS.map((m) => m.code) as [MetricCode, ...MetricCode[]];

export const COMPOSITE_METRIC_CODES = METRIC_DEFINITIONS.filter(
  (m) => "valueKind" in m && m.valueKind === "composite",
).map((m) => m.code);

export const BODY_SITE_METRIC_CODES = METRIC_DEFINITIONS.filter(
  (m) => "requiresBodySite" in m && m.requiresBodySite,
).map((m) => m.code);

export const BODY_SITES = ["waist", "chest", "arm", "thigh", "hips", "other"] as const;
export type BodySite = (typeof BODY_SITES)[number];

export const BODY_SITE_LABELS: Record<BodySite, string> = {
  waist: "Cintura",
  chest: "Pecho",
  arm: "Brazo",
  thigh: "Muslo",
  hips: "Cadera",
  other: "Otro",
};

export const WORKOUT_TYPES = [
  { code: "strength", label: "Fuerza" },
  { code: "running", label: "Carrera" },
  { code: "cycling", label: "Bici" },
  { code: "walking", label: "Caminar" },
  { code: "swimming", label: "Natación" },
  { code: "other", label: "Otro" },
] as const;

export type WorkoutTypeCode = (typeof WORKOUT_TYPES)[number]["code"];

export const WORKOUT_TYPE_CODES = WORKOUT_TYPES.map((w) => w.code) as [
  WorkoutTypeCode,
  ...WorkoutTypeCode[],
];
