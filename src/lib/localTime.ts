// This app is single-user (see README), so rather than tracking a
// per-user timezone preference, times are displayed in a fixed zone
// regardless of the viewing device's own timezone. Change this if you
// move. Timestamps round-trip through Postgres as whatever offset the DB
// session's timezone happens to use (typically UTC) — not the original
// entry's offset — so this must be an explicit conversion, not something
// read off the viewing device's own clock.
export const DISPLAY_TIME_ZONE = "Europe/Madrid";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const clockPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// "YYYY-MM-DD" in DISPLAY_TIME_ZONE (en-CA formats dates in that order).
export function localDayKey(iso: string) {
  return dayKeyFormatter.format(new Date(iso));
}

export function localClock(iso: string) {
  return clockFormatter.format(new Date(iso));
}

// Hour-of-day (0-24, with fractional minutes/seconds) in DISPLAY_TIME_ZONE.
export function localHourOfDay(iso: string) {
  const parts = clockPartsFormatter.formatToParts(new Date(iso));
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
