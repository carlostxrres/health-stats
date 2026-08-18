import { z } from "zod";

const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsUpdateSchema = z
  .object({
    displayName: z.string().trim().max(80).nullable().optional(),
    heightCm: z.number().positive().max(300).nullable().optional(),
    birthDate: z.iso.date().nullable().optional(),
    timeZone: z.string().min(1).max(100).optional(),
    weekStartDay: z.number().int().min(0).max(6).optional(),
    chartHue: z.number().int().min(0).max(359).optional(),
    sleepGoalMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    bedtimeGoal: z.string().regex(TIME_HHMM).nullable().optional(),
    wakeTimeGoal: z.string().regex(TIME_HHMM).nullable().optional(),
    weightGoalMinKg: z.number().positive().max(500).nullable().optional(),
    weightGoalMaxKg: z.number().positive().max(500).nullable().optional(),
  })
  .refine(
    (data) =>
      data.weightGoalMinKg == null ||
      data.weightGoalMaxKg == null ||
      data.weightGoalMinKg <= data.weightGoalMaxKg,
    { message: "El peso mínimo no puede ser mayor que el máximo.", path: ["weightGoalMinKg"] },
  );

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
