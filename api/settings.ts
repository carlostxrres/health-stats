import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { appSettings } from "../db/schema/index.js";
import { settingsUpdateSchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";

const SETTINGS_ID = "default";

async function get(_req: VercelRequest, res: VercelResponse) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));
  if (!row) {
    res.status(404).json({ error: "Settings not seeded" });
    return;
  }
  res.status(200).json(row);
}

// numeric() columns take/return strings, not JS numbers (see metricEntries.value
// in db/schema/metrics.ts) — convert while preserving explicit nulls (clearing
// a field) vs undefined (field not sent, leave column untouched).
function numericOrNull(value: number | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : String(value);
}

async function update(req: VercelRequest, res: VercelResponse) {
  const input = settingsUpdateSchema.parse(req.body);

  const [row] = await db
    .update(appSettings)
    .set({
      ...input,
      heightCm: numericOrNull(input.heightCm),
      weightGoalMinKg: numericOrNull(input.weightGoalMinKg),
      weightGoalMaxKg: numericOrNull(input.weightGoalMaxKg),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Settings not seeded" });
    return;
  }
  res.status(200).json(row);
}

export default createHandler({ GET: get, PATCH: update });
