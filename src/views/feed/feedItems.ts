import type {
  MealWithDetails,
  PoopEntryWithPhotos,
  SleepSession,
  WorkoutWithDetails,
} from "@shared/types";
import { apiClient } from "@/lib/api-client";
import type { FeedItem } from "./types";

export const FEED_PAGE_SIZE = 10;

function buildQuery(to: string | undefined, limit: number) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (to) params.set("to", to);
  return params.toString();
}

// A row waiting to be shown, holding just enough to sort/consume it without
// the source's row type (T) leaking into the shared `sources` array below.
type BufferedEntry = { occurredAt: string; toItem: () => FeedItem };

type Source = {
  buffer: BufferedEntry[];
  exhausted: boolean;
  // Tops up the buffer to at least `pageSize` rows (unless exhausted).
  // Keeping every non-exhausted buffer at >= pageSize before each merge
  // guarantees the true chronological top `pageSize` across all sources is
  // always already in memory, however skewed the mix of record types is.
  topUp: (pageSize: number) => Promise<void>;
};

function createSource<T>(
  fetchPage: (to: string | undefined, limit: number) => Promise<T[]>,
  occurredAt: (row: T) => string,
  toItem: (row: T) => FeedItem,
): Source {
  let cursor: string | undefined;
  const source: Source = {
    buffer: [],
    exhausted: false,
    async topUp(pageSize) {
      if (source.exhausted || source.buffer.length >= pageSize) return;
      const rows = await fetchPage(cursor, pageSize);
      source.buffer.push(
        ...rows.map((row) => ({ occurredAt: occurredAt(row), toItem: () => toItem(row) })),
      );
      if (rows.length < pageSize) {
        source.exhausted = true;
      } else {
        // Normalize to a "T"-separated ISO string before it round-trips
        // through a query param — Postgres returns timestamps space-
        // separated (e.g. "2026-08-16 16:05:00+00"), and that literal space
        // is ambiguous once URL-encoded (some query parsers don't decode
        // "+" back to a space), which corrupts the timezone offset server-side.
        cursor = new Date(occurredAt(rows[rows.length - 1])).toISOString();
      }
    },
  };
  return source;
}

export function createFeedLoader(pageSize: number = FEED_PAGE_SIZE) {
  const sources: Source[] = [
    createSource<MealWithDetails>(
      (to, limit) => apiClient.get<MealWithDetails[]>(`/meals?${buildQuery(to, limit)}`),
      (row) => row.eatenAt,
      (row) => ({ id: `meal:${row.id}`, kind: "meal", occurredAt: row.eatenAt, data: row }),
    ),
    createSource<SleepSession>(
      (to, limit) => apiClient.get<SleepSession[]>(`/sleep-sessions?${buildQuery(to, limit)}`),
      (row) => row.wentToBedAt,
      (row) => ({ id: `sleep:${row.id}`, kind: "sleep", occurredAt: row.wentToBedAt, data: row }),
    ),
    createSource<WorkoutWithDetails>(
      (to, limit) => apiClient.get<WorkoutWithDetails[]>(`/workouts?${buildQuery(to, limit)}`),
      (row) => row.startedAt,
      (row) => ({ id: `workout:${row.id}`, kind: "workout", occurredAt: row.startedAt, data: row }),
    ),
    createSource<PoopEntryWithPhotos>(
      (to, limit) => apiClient.get<PoopEntryWithPhotos[]>(`/poop-entries?${buildQuery(to, limit)}`),
      (row) => row.occurredAt,
      (row) => ({ id: `poop:${row.id}`, kind: "poop", occurredAt: row.occurredAt, data: row }),
    ),
  ];

  return {
    async loadPage(): Promise<{ items: FeedItem[]; hasMore: boolean }> {
      await Promise.all(sources.map((source) => source.topUp(pageSize)));

      const candidates = sources
        .flatMap((source) => source.buffer.map((entry) => ({ source, entry })))
        .sort(
          (a, b) => new Date(b.entry.occurredAt).getTime() - new Date(a.entry.occurredAt).getTime(),
        )
        .slice(0, pageSize);

      for (const { source, entry } of candidates) {
        source.buffer.splice(source.buffer.indexOf(entry), 1);
      }

      const hasMore = sources.some((source) => source.buffer.length > 0 || !source.exhausted);

      return { items: candidates.map(({ entry }) => entry.toItem()), hasMore };
    },
  };
}
