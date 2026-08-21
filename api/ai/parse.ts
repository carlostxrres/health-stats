import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, asc, eq, gt, gte, inArray, lt, or } from "drizzle-orm";
import {
  appSettings,
  meals,
  nutritionGoalEvaluations,
  nutritionGoals,
} from "../../db/schema/index.js";
import { nutritionComplianceRequestSchema } from "../../shared/validation/index.js";
import {
  AI_ENTRY_CONFIGS,
  aiMealSchema,
  buildAiTools,
  buildMealAiTool,
  buildMealInitialData,
  insightsRequestSchema,
  parseEntryRequestSchema,
  parseMealPhotoRequestSchema,
} from "../_lib/aiSchemas.js";
import { anthropic } from "../_lib/anthropic.js";
import { db } from "../_lib/db.js";
import { createHandler } from "../_lib/http.js";
import { buildGeneralDigest, buildMealDigest } from "../_lib/insightsDigest.js";
import {
  buildNutritionComplianceSystemPrompt,
  buildNutritionComplianceTool,
  nutritionComplianceResultSchema,
} from "../_lib/nutritionAiSchema.js";
import { buildNutritionPeriodDigest } from "../_lib/nutritionDigest.js";
import { resolvePeriod } from "../_lib/nutritionPeriod.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

function buildEntrySystemPrompt(now: string): string {
  return [
    "Eres un asistente que extrae datos estructurados de anotaciones de salud en español,",
    "escritas por el propio usuario, para rellenar un formulario. No guardas nada tú mismo.",
    `Ahora mismo son: ${now}. Usa este valor como referencia para resolver expresiones`,
    'relativas de tiempo ("ahora", "esta mañana", "ayer a las 9").',
    "Llama exactamente a una herramienta: la que mejor corresponda al tipo de registro descrito.",
    "Rellena solo los campos que el texto respalda; no inventes datos que no se mencionen.",
    'Los números decimales pueden venir con coma (formato español, ej. "87,75") — interprétalos',
    "como el número decimal equivalente.",
  ].join(" ");
}

function buildMealPhotoSystemPrompt(now: string): string {
  return [
    "Eres un asistente que analiza fotos de comida para rellenar un formulario de registro de",
    "comidas, en español. No guardas nada tú mismo.",
    `Ahora mismo son: ${now}. Úsalo como referencia si el usuario menciona una hora relativa.`,
    "El usuario puede añadir texto adicional junto a la(s) foto(s); combina ambas fuentes.",
    "Identifica el plato y, si es razonable a partir de la imagen, una lista de ingredientes",
    "visibles con cantidades aproximadas cuando sea posible.",
    "Llama exactamente a la herramienta 'meal'. No inventes datos que no se puedan inferir",
    "razonablemente de la imagen o del texto.",
  ].join(" ");
}

function buildInsightsSystemPrompt(digest: string): string {
  const instructions = [
    "Eres un asistente que ayuda a interpretar datos de salud personales registrados por el propio",
    "usuario, en español. A continuación tienes un resumen de sus datos recientes (no la base de",
    "datos completa). Da opiniones útiles y directas, señala patrones o tendencias cuando el resumen",
    "lo permita, y sé honesto sobre las limitaciones de los datos (por ejemplo, si hay pocos registros",
    "para concluir algo). No des diagnósticos ni sustituyas a un profesional médico — para temas de",
    "salud serios, sugiere consultarlo. Sé conciso pero específico, citando cifras del resumen cuando",
    "ayude.",
  ].join(" ");
  return `${instructions}\n\nResumen de datos:\n${digest}`;
}

async function generateInsights(req: VercelRequest, res: VercelResponse) {
  const { focus, question, history, now } = insightsRequestSchema.parse(req.body);

  const digest = focus === "meal" ? await buildMealDigest(now) : await buildGeneralDigest(now);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: buildInsightsSystemPrompt(digest),
    messages: [...history, { role: "user", content: question }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) {
    res.status(502).json({ error: "No se pudo generar una respuesta." });
    return;
  }

  res.status(200).json({ answer: textBlock.text });
}

async function parseEntry(req: VercelRequest, res: VercelResponse) {
  const { text, now } = parseEntryRequestSchema.parse(req.body);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: buildEntrySystemPrompt(now),
    messages: [{ role: "user", content: text }],
    tools: buildAiTools(),
    tool_choice: { type: "any", disable_parallel_tool_use: true },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    res.status(502).json({ error: "No se pudo interpretar el texto." });
    return;
  }

  const entry = AI_ENTRY_CONFIGS.find((c) => c.code === toolUse.name);
  if (!entry) {
    res.status(502).json({ error: "No se pudo interpretar el texto." });
    return;
  }

  const parsed = entry.schema.safeParse(toolUse.input);
  if (!parsed.success) {
    res.status(502).json({ error: "La IA devolvió datos con un formato inesperado." });
    return;
  }

  res.status(200).json({ type: entry.code, data: entry.buildInitialData(parsed.data, now) });
}

async function parseMealPhoto(req: VercelRequest, res: VercelResponse) {
  const { text, now, images } = parseMealPhotoRequestSchema.parse(req.body);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: buildMealPhotoSystemPrompt(now),
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
          })),
          {
            type: "text" as const,
            text: text?.trim() ? text.trim() : "Describe esta comida a partir de la(s) foto(s).",
          },
        ],
      },
    ],
    tools: [buildMealAiTool()],
    tool_choice: { type: "tool", name: "meal", disable_parallel_tool_use: true },
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    res.status(502).json({ error: "No se pudo interpretar la foto." });
    return;
  }

  const parsed = aiMealSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    res.status(502).json({ error: "La IA devolvió datos con un formato inesperado." });
    return;
  }

  res.status(200).json({ type: "meal", data: buildMealInitialData(parsed.data, now) });
}

type EvaluationRow = typeof nutritionGoalEvaluations.$inferSelect;
type ActiveGoal = typeof nutritionGoals.$inferSelect;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function hasNewMealSince(
  periodStart: string,
  periodEnd: string,
  since: Date,
): Promise<boolean> {
  const sinceIso = since.toISOString();
  const row = await db.query.meals.findFirst({
    where: and(
      gte(meals.eatenAt, periodStart),
      lt(meals.eatenAt, periodEnd),
      or(gt(meals.createdAt, sinceIso), gt(meals.updatedAt, sinceIso)),
    ),
  });
  return !!row;
}

function computeEvaluationRow(
  goal: ActiveGoal,
  aiResult: { achievedQuantity: number; items: unknown[] },
  periodKey: string,
  periodStart: string,
  periodEnd: string,
  now: string,
) {
  const achieved = aiResult.achievedQuantity;
  const target = Number(goal.targetQuantity);
  const met = goal.limitType === "min" ? achieved >= target : achieved <= target;
  const percentComplete = target > 0 ? round2((achieved / target) * 100) : achieved > 0 ? 100 : 0;
  return {
    goalId: goal.id,
    periodKey,
    periodStart,
    periodEnd,
    matchedItems: aiResult.items,
    achievedQuantity: String(achieved),
    percentComplete: String(percentComplete),
    met,
    evaluatedAt: now,
  };
}

function toEvaluationView(row: EvaluationRow | ReturnType<typeof computeEvaluationRow>) {
  return {
    goalId: row.goalId,
    achievedQuantity: Number(row.achievedQuantity),
    percentComplete: Number(row.percentComplete),
    met: row.met,
    matchedItems: row.matchedItems,
    evaluatedAt: row.evaluatedAt,
  };
}

function respondCompliance(
  res: VercelResponse,
  periodKey: string,
  timespan: string,
  periodStart: string,
  periodEnd: string,
  source: "cache" | "throttled" | "ai" | "none",
  rows: (EvaluationRow | ReturnType<typeof computeEvaluationRow>)[],
) {
  res.status(200).json({
    periodKey,
    timespan,
    periodStart,
    periodEnd,
    source,
    evaluations: rows.map(toEvaluationView),
  });
}

async function evaluateNutritionCompliance(req: VercelRequest, res: VercelResponse) {
  const { timespan, periodKey, now } = nutritionComplianceRequestSchema.parse(req.body);

  const [settingsRow] = await db.select({ timeZone: appSettings.timeZone }).from(appSettings);
  const timeZone = settingsRow?.timeZone ?? "Europe/Madrid";
  const { periodStart, periodEnd } = resolvePeriod(timespan, periodKey, timeZone);

  const activeGoals = await db.query.nutritionGoals.findMany({
    where: and(eq(nutritionGoals.active, true), eq(nutritionGoals.timespan, timespan)),
    orderBy: asc(nutritionGoals.position),
  });

  if (activeGoals.length === 0) {
    respondCompliance(res, periodKey, timespan, periodStart, periodEnd, "none", []);
    return;
  }

  const existingRows = await db.query.nutritionGoalEvaluations.findMany({
    where: and(
      inArray(
        nutritionGoalEvaluations.goalId,
        activeGoals.map((g) => g.id),
      ),
      eq(nutritionGoalEvaluations.periodKey, periodKey),
    ),
  });
  const existingByGoal = new Map(existingRows.map((r) => [r.goalId, r]));
  const isClosed = new Date(periodEnd).getTime() <= new Date(now).getTime();

  let goalsToEvaluate: ActiveGoal[];

  if (isClosed) {
    // Closed periods are permanently immutable: only ever fill gaps (a goal
    // created after this period already closed), never re-call for a goal
    // that already has a cached row.
    goalsToEvaluate = activeGoals.filter((g) => !existingByGoal.has(g.id));
    if (goalsToEvaluate.length === 0) {
      respondCompliance(res, periodKey, timespan, periodStart, periodEnd, "cache", existingRows);
      return;
    }
  } else {
    const everyGoalHasRow = activeGoals.every((g) => existingByGoal.has(g.id));
    if (everyGoalHasRow) {
      const lastEvaluatedAt = existingRows.reduce(
        (latest, r) => (new Date(r.evaluatedAt) > latest ? new Date(r.evaluatedAt) : latest),
        new Date(0),
      );
      const elapsedMs = new Date(now).getTime() - lastEvaluatedAt.getTime();
      const eligible =
        elapsedMs >= ONE_HOUR_MS &&
        (await hasNewMealSince(periodStart, periodEnd, lastEvaluatedAt));
      if (!eligible) {
        respondCompliance(
          res,
          periodKey,
          timespan,
          periodStart,
          periodEnd,
          "throttled",
          existingRows,
        );
        return;
      }
    }
    // Either a goal has never been evaluated for this period (bypasses the
    // throttle — a new goal's first look shouldn't wait an hour) or the
    // throttle/new-meal checks passed: refresh the whole batch in one call.
    goalsToEvaluate = activeGoals;
  }

  const digest = await buildNutritionPeriodDigest(periodStart, periodEnd);
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    // A batch can cover dozens of goals in one call (by design, to keep API
    // usage low) — 4096 was truncating mid-JSON for large batches. Haiku 4.5
    // supports up to 64000; 16000 gives generous headroom without routinely
    // generating anywhere near that in the common case (most goals resolve
    // to a terse achievedQuantity: 0, items: [] when there's no match).
    max_tokens: 16000,
    system: buildNutritionComplianceSystemPrompt(
      goalsToEvaluate.map((g) => ({
        id: g.id,
        subjectLabel: g.subjectLabel,
        subjectType: g.subjectType,
        limitType: g.limitType,
        targetQuantity: g.targetQuantity,
        unit: g.unit,
        clarification: g.clarification,
      })),
      digest,
    ),
    messages: [{ role: "user", content: "Evalúa el cumplimiento de los objetivos indicados." }],
    tools: [buildNutritionComplianceTool()],
    tool_choice: { type: "tool", name: "nutrition_compliance", disable_parallel_tool_use: true },
  });

  if (message.stop_reason === "max_tokens") {
    console.error(
      `nutritionCompliance: response truncated at max_tokens for ${goalsToEvaluate.length} goals`,
    );
    res.status(502).json({ error: "La respuesta de la IA se cortó por ser demasiado larga." });
    return;
  }

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    res.status(502).json({ error: "No se pudo evaluar el cumplimiento." });
    return;
  }
  const parsed = nutritionComplianceResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    console.error(
      "nutritionCompliance: unexpected tool_use shape",
      parsed.error.issues,
      toolUse.input,
    );
    res.status(502).json({ error: "La IA devolvió datos con un formato inesperado." });
    return;
  }

  const resultsByGoal = new Map(parsed.data.results.map((r) => [r.goalId, r]));
  const computedRows: ReturnType<typeof computeEvaluationRow>[] = [];
  for (const goal of goalsToEvaluate) {
    const aiResult = resultsByGoal.get(goal.id);
    // The model omitted this goal — leave any existing row untouched rather
    // than caching a false zero, especially critical for closed periods.
    if (!aiResult) continue;
    computedRows.push(computeEvaluationRow(goal, aiResult, periodKey, periodStart, periodEnd, now));
  }

  if (computedRows.length > 0) {
    await db.transaction(async (tx) => {
      for (const row of computedRows) {
        await tx
          .insert(nutritionGoalEvaluations)
          .values(row)
          .onConflictDoUpdate({
            target: [nutritionGoalEvaluations.goalId, nutritionGoalEvaluations.periodKey],
            set: {
              periodStart: row.periodStart,
              periodEnd: row.periodEnd,
              matchedItems: row.matchedItems,
              achievedQuantity: row.achievedQuantity,
              percentComplete: row.percentComplete,
              met: row.met,
              evaluatedAt: row.evaluatedAt,
            },
          });
      }
    });
  }

  const mergedByGoal = new Map<string, EvaluationRow | ReturnType<typeof computeEvaluationRow>>(
    existingRows.map((r) => [r.goalId, r]),
  );
  for (const row of computedRows) {
    mergedByGoal.set(row.goalId, row);
  }

  respondCompliance(res, periodKey, timespan, periodStart, periodEnd, "ai", [
    ...mergedByGoal.values(),
  ]);
}

// Single serverless function fronting all AI endpoints (Vercel's Hobby plan
// caps deployments at 12 functions) — routed by a `kind` query param.
async function parse(req: VercelRequest, res: VercelResponse) {
  if (req.query.kind === "meal-photo") {
    await parseMealPhoto(req, res);
    return;
  }
  if (req.query.kind === "insights") {
    await generateInsights(req, res);
    return;
  }
  if (req.query.kind === "nutritionCompliance") {
    await evaluateNutritionCompliance(req, res);
    return;
  }
  await parseEntry(req, res);
}

// nutritionCompliance can batch dozens of goals into one Anthropic call;
// raise the function's execution ceiling from Vercel's default so a large
// batch doesn't get killed mid-request (60s is the Hobby-plan max).
export const config = { maxDuration: 60 };

export default createHandler({ POST: parse });
