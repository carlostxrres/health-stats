import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "../../shared/validation/index.js";

const mealTypeDescription = MEAL_TYPES.map((t) => `${t} (${MEAL_TYPE_LABELS[t]})`).join(", ");

const nutritionComplianceItemSchema = z.object({
  label: z.string().max(200).describe("Alimento o ítem concreto que contribuye a este objetivo."),
  quantity: z.number().optional(),
  quantityUnit: z.string().max(50).optional(),
  matchedAt: z.iso
    .datetime({ offset: true })
    .optional()
    .describe("Fecha y hora de la comida en la que apareció, si se puede determinar."),
  mealType: z
    .enum(MEAL_TYPES)
    .optional()
    .describe(`Tipo de comida, EXACTAMENTE uno de estos códigos: ${mealTypeDescription}.`),
  note: z.string().max(300).optional(),
});

export const nutritionComplianceResultSchema = z.object({
  results: z.array(
    z.object({
      goalId: z
        .string()
        .describe("El id EXACTO del objetivo, tal cual aparece en la lista proporcionada."),
      achievedQuantity: z
        .number()
        .min(0)
        .describe(
          "Cantidad total estimada alcanzada en las unidades del objetivo, a partir de las comidas del periodo.",
        ),
      items: z.array(nutritionComplianceItemSchema).default([]),
    }),
  ),
});

export function buildNutritionComplianceTool(): Anthropic.Tool {
  const { $schema, ...inputSchema } = z.toJSONSchema(nutritionComplianceResultSchema);
  return {
    name: "nutrition_compliance",
    description: "Registrar el cumplimiento estimado de cada objetivo nutricional del periodo.",
    input_schema: inputSchema as Anthropic.Tool.InputSchema,
  };
}

export type NutritionGoalForPrompt = {
  id: string;
  subjectLabel: string;
  subjectType: string;
  limitType: string;
  targetQuantity: string;
  unit: string;
  clarification: string | null;
};

export function buildNutritionComplianceSystemPrompt(
  goals: NutritionGoalForPrompt[],
  digest: string,
): string {
  const goalLines = goals.map((goal) => {
    const limitLabel = goal.limitType === "min" ? "mínimo" : "máximo";
    const clarificationSuffix = goal.clarification ? ` — aclaración: "${goal.clarification}"` : "";
    return `- id: ${goal.id} | ${goal.subjectLabel} (${goal.subjectType}) | ${limitLabel} ${goal.targetQuantity} ${goal.unit}${clarificationSuffix}`;
  });

  const instructions = [
    "Eres un asistente que evalúa el cumplimiento de objetivos nutricionales a partir del",
    "registro de comidas del usuario en un periodo concreto, en español.",
    "",
    "Objetivos activos para este periodo:",
    ...goalLines,
    "",
    "Para cada objetivo de la lista, estima la cantidad total alcanzada en sus unidades,",
    "basándote SOLO en las comidas listadas a continuación, y qué ítems concretos",
    "contribuyen (con hora y tipo de comida cuando sea posible). Para macro/micronutrientes,",
    "usa tu conocimiento nutricional general para estimar a partir de los alimentos",
    "registrados; no inventes alimentos que no aparezcan en el registro. Si un objetivo no",
    "tiene ninguna coincidencia, devuelve achievedQuantity: 0 e items: []. Devuelve",
    "EXACTAMENTE un resultado por cada id de objetivo listado arriba, usando ese id tal cual.",
    "",
    "Comidas registradas en el periodo:",
    digest,
  ];

  return instructions.join("\n");
}
