import { z } from "zod";
import {
  BODY_SITE_METRIC_CODES,
  BODY_SITES,
  COMPOSITE_METRIC_CODES,
  METRIC_CODES,
} from "../metricCatalog.js";

export const metricEntryInputSchema = z
  .object({
    metricType: z.enum(METRIC_CODES),
    value: z.number(),
    valueSecondary: z.number().optional(),
    bodySite: z.enum(BODY_SITES).optional(),
    recordedAt: z.iso.datetime({ offset: true }),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const { metricType, valueSecondary, bodySite } = data;
    if ((COMPOSITE_METRIC_CODES as string[]).includes(metricType) && valueSecondary === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Este indicador necesita un valor secundario (ej. diastólica).",
        path: ["valueSecondary"],
      });
    }
    if ((BODY_SITE_METRIC_CODES as string[]).includes(metricType) && !bodySite) {
      ctx.addIssue({
        code: "custom",
        message: "Este indicador necesita una zona corporal.",
        path: ["bodySite"],
      });
    }
  });

export type MetricEntryInput = z.infer<typeof metricEntryInputSchema>;

export const metricEntryQuerySchema = z.object({
  metricType: z.enum(METRIC_CODES).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  bodySite: z.enum(BODY_SITES).optional(),
});
