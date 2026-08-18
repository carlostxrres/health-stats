// This app is single-user (see README) and doesn't have a settings screen
// yet, so the display timezone is this hardcoded default for now. Once a
// settings screen exists, getDisplayTimeZone() is the one place to swap in
// the stored user preference — every function below already takes an
// optional `timeZone` override and falls back to it, so nothing else needs
// to change.
//
// Timestamps round-trip through Postgres as whatever offset the DB
// session's timezone happens to use (typically UTC) — not the original
// entry's offset — so this must be an explicit conversion, not something
// read off the viewing device's own clock.
const DEFAULT_TIME_ZONE = "Europe/Madrid";

export function getDisplayTimeZone(): string {
  return DEFAULT_TIME_ZONE;
}

// Intl.DateTimeFormat instances are bound to a fixed timeZone at
// construction, so they're cached per zone rather than created once at
// module scope — cheap now (one zone), and correct once the zone can vary.
function cachedFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  timeZone: string,
  create: () => Intl.DateTimeFormat,
) {
  let formatter = cache.get(timeZone);
  if (!formatter) {
    formatter = create();
    cache.set(timeZone, formatter);
  }
  return formatter;
}

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();
const clockFormatters = new Map<string, Intl.DateTimeFormat>();
const clockPartsFormatters = new Map<string, Intl.DateTimeFormat>();

// "YYYY-MM-DD" in `timeZone` (en-CA formats dates in that order).
export function localDayKey(iso: string, timeZone: string = getDisplayTimeZone()) {
  const formatter = cachedFormatter(
    dayKeyFormatters,
    timeZone,
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
  );
  return formatter.format(new Date(iso));
}

export function localClock(iso: string, timeZone: string = getDisplayTimeZone()) {
  const formatter = cachedFormatter(
    clockFormatters,
    timeZone,
    () => new Intl.DateTimeFormat("es-ES", { timeZone, hour: "2-digit", minute: "2-digit" }),
  );
  return formatter.format(new Date(iso));
}

// Hour-of-day (0-24, with fractional minutes/seconds) in `timeZone`.
export function localHourOfDay(iso: string, timeZone: string = getDisplayTimeZone()) {
  const formatter = cachedFormatter(
    clockPartsFormatters,
    timeZone,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
  );
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get("hour") + get("minute") / 60 + get("second") / 3600;
}

// day strings are already plain "YYYY-MM-DD" calendar dates (see
// localDayKey), so parsing them without a timezone offset and formatting
// with the viewer's own locale/zone is safe: both steps use the same
// implicit zone, so the calendar date never shifts.
export function formatDayTick(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function formatDayLabel(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Every calendar day from `startDay` to `endDay`, inclusive.
export function enumerateDays(startDay: string, endDay: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDay}T00:00:00`);
  const end = new Date(`${endDay}T00:00:00`);
  while (cursor <= end) {
    const pad = (n: number) => String(n).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
