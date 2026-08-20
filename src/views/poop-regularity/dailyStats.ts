import { apiClient } from "@/lib/api-client";
import { addDays, enumerateDays, localDayKey } from "@/lib/localTime";
import type { DayStat } from "./types";

export const HEATMAP_WEEKS = 53;

type SummaryRow = { id: string; occurredAt: string; bristolScale: number | null };

// Fetches every poop entry in [startDay, endDay] (inclusive, "YYYY-MM-DD")
// and buckets it into one DayStat per calendar day in that range — bucketing
// happens client-side via localDayKey (timezone-correct per the viewer's
// clock), same convention as src/views/week/eventRows.ts, rather than a
// server-side GROUP BY which would bucket by the DB session's zone (UTC)
// and misplace entries near local midnight.
export async function fetchDailyStats(
  startDay: string,
  endDay: string,
): Promise<Map<string, DayStat>> {
  const from = `${startDay}T00:00:00.000Z`;
  const to = `${addDays(endDay, 1)}T00:00:00.000Z`;
  const query = `summary=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const rows = await apiClient.get<SummaryRow[]>(`/poop-entries?${query}`);

  const byDay = new Map<string, { count: number; bristolSum: number; bristolCount: number }>();
  for (const row of rows) {
    const day = localDayKey(row.occurredAt);
    const bucket = byDay.get(day) ?? { count: 0, bristolSum: 0, bristolCount: 0 };
    bucket.count += 1;
    if (row.bristolScale != null) {
      bucket.bristolSum += row.bristolScale;
      bucket.bristolCount += 1;
    }
    byDay.set(day, bucket);
  }

  const stats = new Map<string, DayStat>();
  for (const day of enumerateDays(startDay, endDay)) {
    const bucket = byDay.get(day);
    stats.set(day, {
      day,
      count: bucket?.count ?? 0,
      avgBristol:
        bucket && bucket.bristolCount > 0 ? bucket.bristolSum / bucket.bristolCount : null,
    });
  }
  return stats;
}

// Splits a day range into 7-day columns for the heatmap grid. Requires
// startDay/endDay to be week-aligned (a multiple of 7 days apart) — callers
// build the range from getWeekDays so this always holds.
export function chunkIntoWeeks(
  dayStats: Map<string, DayStat>,
  startDay: string,
  endDay: string,
): DayStat[][] {
  const days = enumerateDays(startDay, endDay);
  const weeks: DayStat[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((day) => dayStats.get(day) ?? { day, count: 0, avgBristol: null }),
    );
  }
  return weeks;
}

// Days between the most recent day with at least one entry and the end of
// the visible window — null if no entry falls anywhere in that window.
// dayStats always has one entry per calendar day (see fetchDailyStats), so
// the index distance from the end directly gives the day count.
export function daysSinceLastEntry(dayStats: Map<string, DayStat>): number | null {
  const days = [...dayStats.keys()].sort();
  for (let i = days.length - 1; i >= 0; i--) {
    if ((dayStats.get(days[i])?.count ?? 0) > 0) {
      return days.length - 1 - i;
    }
  }
  return null;
}
