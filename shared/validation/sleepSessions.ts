import { z } from "zod";

export const sleepSessionInputSchema = z
  .object({
    wentToBedAt: z.iso.datetime({ offset: true }),
    wokeUpAt: z.iso.datetime({ offset: true }),
    isNap: z.boolean().default(false),
    qualityRating: z.number().int().min(1).max(5).optional(),
    wakeFeeling: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.wokeUpAt) <= new Date(data.wentToBedAt)) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de levantarse debe ser posterior a la de acostarse.",
        path: ["wokeUpAt"],
      });
    }
  });

export type SleepSessionInput = z.infer<typeof sleepSessionInputSchema>;
