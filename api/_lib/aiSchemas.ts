import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ENTRY_TYPES, type EntryTypeCode } from "../../shared/entryTypes.js";
import {
  BODY_SITE_LABELS,
  BODY_SITES,
  METRIC_CODES,
  METRIC_DEFINITIONS,
  WORKOUT_TYPE_CODES,
  WORKOUT_TYPES,
} from "../../shared/metricCatalog.js";
import { EPISODE_TYPE_LABELS, HEALTH_EPISODE_TYPES } from "../../shared/validation/index.js";

// Zod schemas that describe what the AI is allowed to extract from free text,
// per entry type. These are intentionally separate from shared/validation's
// *InputSchema: they drop fields the AI can never produce (photo storage
// paths, the server-derived metric `unit`) and drop the superRefine business
// rules (composite/bodySite requirement, wake > bed ordering) — those are
// re-checked by the real InputSchema when the user hits "Guardar", which is
// the actual save gate. Datetime fields are optional here; the adapter below
// defaults them to the caller-provided "now" when the model omits them.

const metricTypeDescription = METRIC_DEFINITIONS.map((m) => `${m.code} (${m.label})`).join(", ");
const bodySiteDescription = BODY_SITES.map((s) => `${s} (${BODY_SITE_LABELS[s]})`).join(", ");
const workoutTypeDescription = WORKOUT_TYPES.map((w) => `${w.code} (${w.label})`).join(", ");
const episodeTypeDescription = HEALTH_EPISODE_TYPES.map(
  (t) => `${t} (${EPISODE_TYPE_LABELS[t]})`,
).join(", ");

const aiMetricSchema = z.object({
  metricType: z
    .enum(METRIC_CODES)
    .describe(`Tipo de indicador. Valores: ${metricTypeDescription}.`),
  value: z
    .number()
    .describe("Valor numérico principal. Para blood_pressure, la presión sistólica."),
  valueSecondary: z
    .number()
    .optional()
    .describe("Solo para blood_pressure: la presión diastólica."),
  bodySite: z
    .enum(BODY_SITES)
    .optional()
    .describe(`Solo para body_circumference. Valores: ${bodySiteDescription}.`),
  recordedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe(
      "Fecha y hora en ISO-8601 con offset, ej. 2026-08-11T14:30:00+02:00. Omite este campo si el texto no menciona cuándo.",
    ),
  notes: z.string().max(2000).optional(),
});

const aiMealSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eatenAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora ISO-8601 con offset. Omite si el texto no la menciona."),
  location: z.string().max(200).optional(),
  ingredients: z
    .array(
      z.object({
        ingredient: z.string().min(1).max(200),
        quantityValue: z.number().optional(),
        quantityUnit: z.string().max(50).optional(),
      }),
    )
    .default([]),
});

const aiMedicationSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .describe("Nombre del medicamento o suplemento, con dosis si se menciona."),
  takenAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora ISO-8601 con offset. Omite si el texto no la menciona."),
  location: z.string().max(200).optional(),
});

const aiWorkoutSchema = z.object({
  workoutType: z
    .enum(WORKOUT_TYPE_CODES)
    .describe(`Tipo de entrenamiento. Valores: ${workoutTypeDescription}.`),
  startedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora ISO-8601 con offset. Omite si el texto no la menciona."),
  durationMinutes: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  metrics: z
    .array(
      z.object({
        metricType: z.string().min(1).max(50).describe("ej. distance_km, avg_heart_rate, calories"),
        value: z.number(),
        unit: z.string().min(1).max(20),
      }),
    )
    .default([]),
  sets: z
    .array(
      z.object({
        exerciseName: z.string().min(1).max(200),
        setNumber: z.number().int().min(1),
        reps: z.number().int().min(0).optional(),
        weightKg: z.number().min(0).optional(),
      }),
    )
    .default([]),
});

const aiSleepSchema = z.object({
  wentToBedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Hora de acostarse, ISO-8601 con offset. Omite si el texto no la menciona."),
  wokeUpAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Hora de levantarse, ISO-8601 con offset. Omite si el texto no la menciona."),
  isNap: z.boolean().default(false).describe("true si es una siesta, no el sueño de la noche."),
  qualityRating: z.number().int().min(1).max(5).optional(),
  wakeFeeling: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

const aiHealthEpisodeSchema = z.object({
  episodeType: z.enum(HEALTH_EPISODE_TYPES).describe(`Valores: ${episodeTypeDescription}.`),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora ISO-8601 con offset. Omite si el texto no la menciona."),
  recoveredAt: z.iso
    .date()
    .optional()
    .describe("Solo fecha (sin hora), formato YYYY-MM-DD. Omite si sigue en curso."),
});

const aiBodyPhotoSchema = z.object({
  takenAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora ISO-8601 con offset. Omite si el texto no la menciona."),
  description: z.string().max(2000).optional(),
});

type AiEntryConfig<Schema extends z.ZodTypeAny> = {
  code: EntryTypeCode;
  schema: Schema;
  buildInitialData: (input: z.infer<Schema>, now: string) => Record<string, unknown>;
};

function config<Schema extends z.ZodTypeAny>(
  c: AiEntryConfig<Schema>,
): AiEntryConfig<z.ZodTypeAny> {
  return c as AiEntryConfig<z.ZodTypeAny>;
}

export const AI_ENTRY_CONFIGS: AiEntryConfig<z.ZodTypeAny>[] = [
  config({
    code: "metric",
    schema: aiMetricSchema,
    buildInitialData: (input, now) => ({
      metricType: input.metricType,
      value: String(input.value),
      valueSecondary: input.valueSecondary != null ? String(input.valueSecondary) : null,
      bodySite: input.bodySite ?? null,
      recordedAt: input.recordedAt ?? now,
      notes: input.notes ?? null,
    }),
  }),
  config({
    code: "meal",
    schema: aiMealSchema,
    buildInitialData: (input, now) => ({
      title: input.title,
      description: input.description ?? null,
      eatenAt: input.eatenAt ?? now,
      location: input.location ?? null,
      ingredients: input.ingredients.map((i) => ({
        ingredient: i.ingredient,
        quantityValue: i.quantityValue != null ? String(i.quantityValue) : null,
        quantityUnit: i.quantityUnit ?? null,
      })),
      photos: [],
    }),
  }),
  config({
    code: "medication",
    schema: aiMedicationSchema,
    buildInitialData: (input, now) => ({
      title: input.title,
      takenAt: input.takenAt ?? now,
      location: input.location ?? null,
    }),
  }),
  config({
    code: "workout",
    schema: aiWorkoutSchema,
    buildInitialData: (input, now) => ({
      workoutType: input.workoutType,
      startedAt: input.startedAt ?? now,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      metrics: input.metrics.map((m) => ({
        metricType: m.metricType,
        value: String(m.value),
        unit: m.unit,
      })),
      sets: input.sets.map((s) => ({
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        reps: s.reps ?? null,
        weightKg: s.weightKg != null ? String(s.weightKg) : null,
      })),
      photos: [],
    }),
  }),
  config({
    code: "sleep",
    schema: aiSleepSchema,
    buildInitialData: (input, now) => ({
      wentToBedAt: input.wentToBedAt ?? now,
      wokeUpAt: input.wokeUpAt ?? now,
      isNap: input.isNap,
      qualityRating: input.qualityRating ?? null,
      wakeFeeling: input.wakeFeeling ?? null,
      notes: input.notes ?? null,
    }),
  }),
  config({
    code: "health_episode",
    schema: aiHealthEpisodeSchema,
    buildInitialData: (input, now) => ({
      episodeType: input.episodeType,
      title: input.title,
      description: input.description ?? null,
      startedAt: input.startedAt ?? now,
      recoveredAt: input.recoveredAt ?? null,
    }),
  }),
  config({
    code: "body_photo",
    schema: aiBodyPhotoSchema,
    buildInitialData: (input, now) => ({
      takenAt: input.takenAt ?? now,
      description: input.description ?? null,
      files: [],
    }),
  }),
];

export function buildAiTools(): Anthropic.Tool[] {
  return AI_ENTRY_CONFIGS.map(({ code, schema }) => {
    const { $schema, ...inputSchema } = z.toJSONSchema(schema);
    const label = ENTRY_TYPES.find((t) => t.code === code)?.label ?? code;
    return {
      name: code,
      description: `Registrar una entrada de tipo "${label}".`,
      input_schema: inputSchema as Anthropic.Tool.InputSchema,
    };
  });
}

export const parseEntryRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  now: z.iso.datetime({ offset: true }),
});
