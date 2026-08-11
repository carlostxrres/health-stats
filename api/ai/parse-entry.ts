import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AI_ENTRY_CONFIGS, buildAiTools, parseEntryRequestSchema } from "../_lib/aiSchemas.js";
import { anthropic } from "../_lib/anthropic.js";
import { createHandler } from "../_lib/http.js";

function buildSystemPrompt(now: string): string {
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

async function parseEntry(req: VercelRequest, res: VercelResponse) {
  const { text, now } = parseEntryRequestSchema.parse(req.body);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: buildSystemPrompt(now),
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

export default createHandler({ POST: parseEntry });
