import { z } from "zod";

export const medicationInputSchema = z.object({
  title: z.string().min(1).max(200),
  takenAt: z.iso.datetime({ offset: true }),
  location: z.string().max(200).optional(),
});

export type MedicationInput = z.infer<typeof medicationInputSchema>;
