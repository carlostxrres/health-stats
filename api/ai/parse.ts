import type { VercelRequest, VercelResponse } from "@vercel/node";
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
import { createHandler } from "../_lib/http.js";
import { buildGeneralDigest, buildMealDigest } from "../_lib/insightsDigest.js";

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
  await parseEntry(req, res);
}

export default createHandler({ POST: parse });
