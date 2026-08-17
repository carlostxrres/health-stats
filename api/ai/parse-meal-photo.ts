import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  aiMealSchema,
  buildMealAiTool,
  buildMealInitialData,
  parseMealPhotoRequestSchema,
} from "../_lib/aiSchemas.js";
import { anthropic } from "../_lib/anthropic.js";
import { createHandler } from "../_lib/http.js";

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

export default createHandler({ POST: parseMealPhoto });
