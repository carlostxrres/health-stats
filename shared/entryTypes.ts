// Canonical catalog of the 7 kinds of entries the app knows how to log.
// Single source of truth for the type selector in LogPage, the badges in
// LogsPage, and the domain mapping in the api/entries aggregator.

export const ENTRY_TYPES = [
  {
    code: "metric",
    label: "Indicador (peso, perímetro, biomarcador, pasos, ánimo…)",
    shortLabel: "Indicador",
    apiPath: "/metrics",
  },
  { code: "meal", label: "Comida", shortLabel: "Comida", apiPath: "/meals" },
  {
    code: "medication",
    label: "Medicamento / suplemento",
    shortLabel: "Medicamento",
    apiPath: "/medications",
  },
  {
    code: "workout",
    label: "Entrenamiento / deporte",
    shortLabel: "Entrenamiento",
    apiPath: "/workouts",
  },
  { code: "sleep", label: "Sueño", shortLabel: "Sueño", apiPath: "/sleep-sessions" },
  {
    code: "poop",
    label: "Deposición",
    shortLabel: "Deposición",
    apiPath: "/poop-entries",
  },
  {
    code: "health_episode",
    label: "Lesión / enfermedad",
    shortLabel: "Lesión/enfermedad",
    apiPath: "/health-episodes",
  },
  {
    code: "body_photo",
    label: "Foto corporal",
    shortLabel: "Foto corporal",
    apiPath: "/body-photos",
  },
] as const;

export type EntryTypeCode = (typeof ENTRY_TYPES)[number]["code"];

export const ENTRY_TYPE_CODES = ENTRY_TYPES.map((t) => t.code) as [
  EntryTypeCode,
  ...EntryTypeCode[],
];
