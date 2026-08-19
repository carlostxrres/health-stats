import { z } from "zod";

export const STOOL_COLORS = [
  "brown",
  "dark_black",
  "red_blood",
  "green",
  "yellow_pale",
  "other",
] as const;

export const STOOL_COLOR_LABELS: Record<(typeof STOOL_COLORS)[number], string> = {
  brown: "Marrón (normal)",
  dark_black: "Negro / oscuro",
  red_blood: "Rojo / con sangre",
  green: "Verde",
  yellow_pale: "Amarillo / pálido",
  other: "Otro",
};

export const BRISTOL_SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

export const BRISTOL_SCALE_LABELS: Record<(typeof BRISTOL_SCALE_VALUES)[number], string> = {
  1: "Tipo 1 — Bolas duras y separadas (estreñimiento severo)",
  2: "Tipo 2 — Forma de salchicha grumosa (estreñimiento leve)",
  3: "Tipo 3 — Salchicha con grietas en la superficie (normal)",
  4: "Tipo 4 — Salchicha lisa y blanda (normal, ideal)",
  5: "Tipo 5 — Trozos blandos con bordes definidos (falta de fibra)",
  6: "Tipo 6 — Trozos blandos y pastosos, bordes irregulares (diarrea leve)",
  7: "Tipo 7 — Totalmente líquido, sin trozos sólidos (diarrea)",
};

export const poopEntryInputSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  location: z.string().max(200).optional(),
  bristolScale: z.number().int().min(1).max(7).optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  effort: z.number().int().min(1).max(5).optional(),
  feltComplete: z.boolean().optional(),
  color: z.enum(STOOL_COLORS).optional(),
  durationMinutes: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photoStoragePaths: z.array(z.string().min(1)).default([]),
});

export type PoopEntryInput = z.infer<typeof poopEntryInputSchema>;
