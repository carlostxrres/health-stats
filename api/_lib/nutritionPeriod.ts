// Server-side counterpart to src/lib/localTime.ts's zone-aware helpers —
// that module is frontend-only, so period boundaries are recomputed here
// using the same double-conversion trick (format a UTC guess in the target
// zone, then correct by the observed offset) to stay DST-safe without a
// timezone library.
function zonedDayStartToUtcIso(dayKey: string, timeZone: string): string {
  const guess = new Date(`${dayKey}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(guess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const shownAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const correction = guess.getTime() - shownAsUtc;
  return new Date(guess.getTime() + correction).toISOString();
}

// Pure calendar-date arithmetic on a "YYYY-MM-DD" string — no timezone
// involved, just adding whole days, using UTC internally to sidestep local
// Date DST quirks.
function addDaysToKey(dayKey: string, delta: number): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

// `periodKey` is "YYYY-MM-DD": the day itself for a daily period, or the
// week's start day (already resolved client-side per weekStartDay, see
// getWeekDays) for a weekly period — so no weekStartDay is needed here.
export function resolvePeriod(
  timespan: "daily" | "weekly",
  periodKey: string,
  timeZone: string,
): { periodStart: string; periodEnd: string } {
  const periodStart = zonedDayStartToUtcIso(periodKey, timeZone);
  const endKey = addDaysToKey(periodKey, timespan === "daily" ? 1 : 7);
  const periodEnd = zonedDayStartToUtcIso(endKey, timeZone);
  return { periodStart, periodEnd };
}
