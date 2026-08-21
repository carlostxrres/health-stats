import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  bodyPhotos,
  healthEpisodes,
  meals,
  medications,
  metricEntries,
  poopEntries,
  sleepSessions,
  workouts,
} from "../db/schema/index.js";
import { ENTRY_TYPE_CODES, type EntryTypeCode } from "../shared/entryTypes.js";
import {
  COMPOSITE_METRIC_CODES,
  METRIC_DEFINITIONS,
  WORKOUT_TYPES,
} from "../shared/metricCatalog.js";
import { EPISODE_TYPE_LABELS, entriesQuerySchema } from "../shared/validation/index.js";
import { db } from "./_lib/db.js";
import { createHandler } from "./_lib/http.js";
import { filterVisibleTypes, isTypeHiddenFrom } from "./_lib/privacy.js";

const LOOKUPS: { type: EntryTypeCode; query: (id: string) => Promise<unknown | undefined> }[] = [
  {
    type: "metric",
    query: (id) => db.query.metricEntries.findFirst({ where: eq(metricEntries.id, id) }),
  },
  {
    type: "meal",
    query: (id) =>
      db.query.meals.findFirst({
        where: eq(meals.id, id),
        with: { ingredients: true, photos: true },
      }),
  },
  {
    type: "medication",
    query: (id) => db.query.medications.findFirst({ where: eq(medications.id, id) }),
  },
  {
    type: "workout",
    query: (id) =>
      db.query.workouts.findFirst({
        where: eq(workouts.id, id),
        with: { metrics: true, sets: true, photos: true },
      }),
  },
  {
    type: "sleep",
    query: (id) => db.query.sleepSessions.findFirst({ where: eq(sleepSessions.id, id) }),
  },
  {
    type: "poop",
    query: (id) =>
      db.query.poopEntries.findFirst({ where: eq(poopEntries.id, id), with: { photos: true } }),
  },
  {
    type: "health_episode",
    query: (id) => db.query.healthEpisodes.findFirst({ where: eq(healthEpisodes.id, id) }),
  },
  {
    type: "body_photo",
    query: (id) =>
      db.query.bodyPhotos.findFirst({ where: eq(bodyPhotos.id, id), with: { files: true } }),
  },
];

type NormalizedEntry = {
  id: string;
  type: EntryTypeCode;
  occurredAt: string;
  title: string;
  source: string;
};

function dateRangeBounds(from?: string, to?: string) {
  return {
    gteValue: from ? `${from}T00:00:00.000Z` : undefined,
    lteValue: to ? `${to}T23:59:59.999Z` : undefined,
  };
}

async function fetchMetrics(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: metricEntries.id,
      occurredAt: metricEntries.recordedAt,
      metricType: metricEntries.metricType,
      value: metricEntries.value,
      valueSecondary: metricEntries.valueSecondary,
      unit: metricEntries.unit,
      source: metricEntries.source,
    })
    .from(metricEntries)
    .where(
      and(
        gteValue ? gte(metricEntries.recordedAt, gteValue) : undefined,
        lteValue ? lte(metricEntries.recordedAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => {
    const definition = METRIC_DEFINITIONS.find((m) => m.code === row.metricType);
    const label = definition?.label ?? row.metricType;
    const isComposite = (COMPOSITE_METRIC_CODES as string[]).includes(row.metricType);
    const title = isComposite
      ? `${label}: ${row.value}/${row.valueSecondary}${row.unit}`
      : `${label}: ${row.value}${row.unit}`;
    return { id: row.id, type: "metric", occurredAt: row.occurredAt, title, source: row.source };
  });
}

async function fetchMeals(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({ id: meals.id, occurredAt: meals.eatenAt, title: meals.title, source: meals.source })
    .from(meals)
    .where(
      and(
        gteValue ? gte(meals.eatenAt, gteValue) : undefined,
        lteValue ? lte(meals.eatenAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => ({ ...row, type: "meal" as const }));
}

async function fetchMedications(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: medications.id,
      occurredAt: medications.takenAt,
      title: medications.title,
      source: medications.source,
    })
    .from(medications)
    .where(
      and(
        gteValue ? gte(medications.takenAt, gteValue) : undefined,
        lteValue ? lte(medications.takenAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => ({ ...row, type: "medication" as const }));
}

async function fetchWorkouts(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: workouts.id,
      occurredAt: workouts.startedAt,
      workoutType: workouts.workoutType,
      durationMinutes: workouts.durationMinutes,
      source: workouts.source,
    })
    .from(workouts)
    .where(
      and(
        gteValue ? gte(workouts.startedAt, gteValue) : undefined,
        lteValue ? lte(workouts.startedAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => {
    const label = WORKOUT_TYPES.find((t) => t.code === row.workoutType)?.label ?? row.workoutType;
    const title = row.durationMinutes ? `${label} · ${row.durationMinutes} min` : label;
    return { id: row.id, type: "workout", occurredAt: row.occurredAt, title, source: row.source };
  });
}

async function fetchSleepSessions(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: sleepSessions.id,
      occurredAt: sleepSessions.wentToBedAt,
      wokeUpAt: sleepSessions.wokeUpAt,
      isNap: sleepSessions.isNap,
      source: sleepSessions.source,
    })
    .from(sleepSessions)
    .where(
      and(
        gteValue ? gte(sleepSessions.wentToBedAt, gteValue) : undefined,
        lteValue ? lte(sleepSessions.wentToBedAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => {
    const hours =
      (new Date(row.wokeUpAt).getTime() - new Date(row.occurredAt).getTime()) / 3_600_000;
    const title = `${row.isNap ? "Siesta" : "Sueño"} · ${hours.toFixed(1)} h`;
    return { id: row.id, type: "sleep", occurredAt: row.occurredAt, title, source: row.source };
  });
}

async function fetchPoopEntries(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: poopEntries.id,
      occurredAt: poopEntries.occurredAt,
      bristolScale: poopEntries.bristolScale,
      source: poopEntries.source,
    })
    .from(poopEntries)
    .where(
      and(
        gteValue ? gte(poopEntries.occurredAt, gteValue) : undefined,
        lteValue ? lte(poopEntries.occurredAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    type: "poop",
    occurredAt: row.occurredAt,
    title: row.bristolScale != null ? `Deposición · Bristol ${row.bristolScale}` : "Deposición",
    source: row.source,
  }));
}

async function fetchHealthEpisodes(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: healthEpisodes.id,
      occurredAt: healthEpisodes.startedAt,
      episodeType: healthEpisodes.episodeType,
      title: healthEpisodes.title,
      source: healthEpisodes.source,
    })
    .from(healthEpisodes)
    .where(
      and(
        gteValue ? gte(healthEpisodes.startedAt, gteValue) : undefined,
        lteValue ? lte(healthEpisodes.startedAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => {
    const typeLabel =
      EPISODE_TYPE_LABELS[row.episodeType as keyof typeof EPISODE_TYPE_LABELS] ?? row.episodeType;
    return {
      id: row.id,
      type: "health_episode",
      occurredAt: row.occurredAt,
      title: `${typeLabel}: ${row.title}`,
      source: row.source,
    };
  });
}

async function fetchBodyPhotos(from?: string, to?: string): Promise<NormalizedEntry[]> {
  const { gteValue, lteValue } = dateRangeBounds(from, to);
  const rows = await db
    .select({
      id: bodyPhotos.id,
      occurredAt: bodyPhotos.takenAt,
      description: bodyPhotos.description,
      source: bodyPhotos.source,
    })
    .from(bodyPhotos)
    .where(
      and(
        gteValue ? gte(bodyPhotos.takenAt, gteValue) : undefined,
        lteValue ? lte(bodyPhotos.takenAt, lteValue) : undefined,
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    type: "body_photo",
    occurredAt: row.occurredAt,
    title: row.description ?? "Foto corporal",
    source: row.source,
  }));
}

const FETCHERS: Record<EntryTypeCode, (from?: string, to?: string) => Promise<NormalizedEntry[]>> =
  {
    metric: fetchMetrics,
    meal: fetchMeals,
    medication: fetchMedications,
    workout: fetchWorkouts,
    sleep: fetchSleepSessions,
    poop: fetchPoopEntries,
    health_episode: fetchHealthEpisodes,
    body_photo: fetchBodyPhotos,
  };

async function list(req: VercelRequest, res: VercelResponse) {
  const rawType = req.query.type;
  const type = rawType === undefined ? undefined : Array.isArray(rawType) ? rawType : [rawType];

  const query = entriesQuerySchema.parse({
    type,
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
    sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
    limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
    offset: typeof req.query.offset === "string" ? req.query.offset : undefined,
  });

  const requestedTypes = query.type && query.type.length > 0 ? query.type : ENTRY_TYPE_CODES;
  const typesToFetch = await filterVisibleTypes(req, requestedTypes);

  // The Supabase pooler runs in transaction mode (Supavisor, port 6543), which
  // does not support multiple concurrent queries multiplexed over the same
  // pooled connection — Promise.all across these fetchers hangs after the
  // second or third query. Run them sequentially instead.
  const all: NormalizedEntry[] = [];
  for (const entryType of typesToFetch) {
    const rows = await FETCHERS[entryType](query.from, query.to);
    all.push(...rows);
  }

  all.sort((a, b) => {
    const diff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    return query.sort === "asc" ? diff : -diff;
  });

  const items = all.slice(query.offset, query.offset + query.limit);

  res.status(200).json({ items, total: all.length });
}

async function getById(req: VercelRequest, res: VercelResponse, id: string) {
  for (const lookup of LOOKUPS) {
    const data = await lookup.query(id);
    if (data) {
      if (await isTypeHiddenFrom(req, lookup.type)) break;
      res.status(200).json({ type: lookup.type, data });
      return;
    }
  }

  res.status(404).json({ error: "Not found" });
}

async function get(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (id) {
    await getById(req, res, id);
    return;
  }
  await list(req, res);
}

export default createHandler({ GET: get });
