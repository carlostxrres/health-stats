import { z } from "zod";

export const QUALITY_RATING_VALUES = [1, 2, 3, 4, 5] as const;

export const QUALITY_RATING_INFO: Record<
  (typeof QUALITY_RATING_VALUES)[number],
  { name: string; description: string }
> = {
  1: {
    name: "Muy mala",
    description:
      "Noche muy perturbada o insuficiente. Dormir ha sido muy difícil y/o el sueño ha estado muy fragmentado o ha resultado claramente poco reparador.",
  },
  2: {
    name: "Mala",
    description:
      "Noche con problemas apreciables. Ha habido dificultades relevantes para conciliar o mantener el sueño, una duración insuficiente o un descanso claramente peor de lo habitual.",
  },
  3: {
    name: "Normal",
    description:
      "Noche normal. Has dormido de forma razonablemente satisfactoria, sin problemas importantes, pero tampoco ha sido una noche especialmente buena.",
  },
  4: {
    name: "Buena",
    description:
      "Noche claramente reparadora. Te has dormido con facilidad, el sueño ha sido bastante continuo y has dormido lo suficiente, con pocos o ningún problema relevante.",
  },
  5: {
    name: "Excelente",
    description:
      "Noche excepcionalmente reparadora. Conciliación muy fácil, sueño prácticamente continuo, duración adecuada y prácticamente ningún aspecto negativo destacable.",
  },
};

export const QUALITY_RATING_QUESTION = "¿Cómo fue la calidad de mi sueño esta noche?";

export const QUALITY_RATING_SCALE_NOTE =
  "Escala propia inspirada en PSQI/LSEQ, no una escala validada clínicamente. No tengas en cuenta cómo te sientes al levantarte para decidir este número: puedes haber dormido estupendamente y despertarte cansado, eso es responsabilidad del campo de sensación al despertar.";

export const WAKE_FEELING_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const WAKE_FEELING_INFO: Record<
  (typeof WAKE_FEELING_VALUES)[number],
  { name: string; description: string }
> = {
  1: {
    name: "Extremadamente alerta",
    description: "Extremadamente alerta. Me siento completamente despierto y muy activado.",
  },
  2: {
    name: "Muy alerta",
    description: "Muy alerta. Estoy claramente despierto y atento.",
  },
  3: {
    name: "Alerta",
    description: "Alerta. Me siento despierto y funcional, sin somnolencia apreciable.",
  },
  4: {
    name: "Bastante alerta",
    description: "Bastante alerta. Estoy despierto, aunque no especialmente activado.",
  },
  5: {
    name: "Ni alerta ni somnoliento",
    description:
      "Ni alerta ni somnoliento. Estado intermedio; no siento una tendencia clara hacia estar más despierto o más dormido.",
  },
  6: {
    name: "Algunos signos de somnolencia",
    description:
      "Ligeramente somnoliento. Empiezo a notar sueño, pero no tengo dificultad para mantenerme despierto.",
  },
  7: {
    name: "Somnoliento",
    description: "Somnoliento. Tengo sueño, pero puedo mantenerme despierto sin dificultad.",
  },
  8: {
    name: "Muy somnoliento",
    description: "Muy somnoliento. Me cuesta mantenerme despierto y tengo que hacer un esfuerzo.",
  },
  9: {
    name: "Extremadamente somnoliento",
    description:
      "Extremadamente somnoliento. Estoy luchando contra el sueño y tengo muchas dificultades para mantenerme despierto.",
  },
};

export const WAKE_FEELING_QUESTION = "¿Qué nivel de somnolencia tengo ahora mismo?";

export const WAKE_FEELING_SCALE_NOTE = "Karolinska Sleepiness Scale (KSS).";

export const sleepSessionInputSchema = z
  .object({
    wentToBedAt: z.iso.datetime({ offset: true }),
    wokeUpAt: z.iso.datetime({ offset: true }),
    isNap: z.boolean().default(false),
    qualityRating: z.number().int().min(1).max(5).optional(),
    wakeFeeling: z.number().int().min(1).max(9).optional(),
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
