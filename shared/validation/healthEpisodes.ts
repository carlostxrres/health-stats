import { z } from "zod";

export const HEALTH_EPISODE_TYPES = ["injury", "illness"] as const;

export const EPISODE_TYPE_LABELS: Record<(typeof HEALTH_EPISODE_TYPES)[number], string> = {
  injury: "Lesión",
  illness: "Enfermedad",
};

export const healthEpisodeInputSchema = z.object({
  episodeType: z.enum(HEALTH_EPISODE_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startedAt: z.iso.datetime({ offset: true }),
  recoveredAt: z.iso.date().optional(), // null/omitted = ongoing
});

export type HealthEpisodeInput = z.infer<typeof healthEpisodeInputSchema>;
