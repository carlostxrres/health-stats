// Timestamps round-trip through Postgres as whatever offset the DB
// session's timezone happens to use (typically UTC) — not the original
// entry's offset — so this must be an explicit conversion, not something
// read off the viewing device's own clock.
//
// This module-level value is the stored settings preference once loaded
// (see useSettings.tsx, which calls setDisplayTimeZone() on fetch); every
// function below already takes an optional `timeZone` override and falls
// back to it, so nothing else needs to change.
let displayTimeZone = "Europe/Madrid";

export function getDisplayTimeZone(): string {
  return displayTimeZone;
}

export function setDisplayTimeZone(timeZone: string): void {
  displayTimeZone = timeZone;
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

// "YYYY-MM-DD" from a Date's local Y/M/D — for pure calendar-date values
// (e.g. from a date-picker) that carry no timezone conversion of their own,
// as opposed to localDayKey(iso) which converts an absolute instant.
export function dayKeyFromDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "YYYY-MM-DD" `delta` calendar days from `day`. Parses/reformats using the
// runtime's local zone; safe because both steps use the same implicit zone,
// so the calendar date never shifts (same reasoning as formatDayTick).
export function addDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return dayKeyFromDate(date);
}

export function isWeekend(day: string) {
  const dayOfWeek = new Date(`${day}T00:00:00`).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Same reasoning as displayTimeZone above. Matches Date#getDay()'s
// convention (0=Sun..6=Sat).
let weekStartDay = 1; // Monday

export function getWeekStartDay(): number {
  return weekStartDay;
}

export function setWeekStartDay(day: number): void {
  weekStartDay = day;
}

// The 7 day-keys (in order) of the week containing `day`, starting on
// `weekStartDay`.
export function getWeekDays(day: string, weekStartDay: number = getWeekStartDay()): string[] {
  const date = new Date(`${day}T00:00:00`);
  const diff = (date.getDay() - weekStartDay + 7) % 7;
  const start = addDays(day, -diff);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatWeekRangeLabel(weekDays: string[]) {
  const [start, end] = [weekDays[0], weekDays[weekDays.length - 1]];
  return `${formatDayTick(start)} – ${formatDayLabel(end)}`;
}

// Every calendar day from `startDay` to `endDay`, inclusive.
export function enumerateDays(startDay: string, endDay: string) {
  const days: string[] = [];
  let cursor = startDay;
  while (cursor <= endDay) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

// Whole calendar days from `fromDay` to `toDay` (both "YYYY-MM-DD"). Parses
// with the same "T00:00:00" trick as addDays/formatDayTick above — safe
// because both sides use the same implicit runtime zone.
function dayDiff(fromDay: string, toDay: string) {
  const from = new Date(`${fromDay}T00:00:00`).getTime();
  const to = new Date(`${toDay}T00:00:00`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

// A feed-post timestamp, formatted per the app's social-feed convention:
// "hoy/ayer/hace dos días/el lunes/el 8 de agosto/el 30 de diciembre de
// 2025" followed by " a las hh:mm". The day-name cases (hoy/ayer/hace dos
// días) are fixed Spanish phrases rather than Intl.RelativeTimeFormat
// output, because RelativeTimeFormat spells "hace dos días" as "hace 2
// días" (digit, not word) — everything else here still goes through Intl.
export function formatPostDate(iso: string, timeZone: string = getDisplayTimeZone()) {
  const itemDay = localDayKey(iso, timeZone);
  const todayDay = localDayKey(new Date().toISOString(), timeZone);
  const diff = dayDiff(itemDay, todayDay);

  let dayLabel: string;
  if (diff === 0) {
    dayLabel = "hoy";
  } else if (diff === 1) {
    dayLabel = "ayer";
  } else if (diff === 2) {
    dayLabel = "hace dos días";
  } else if (diff >= 3 && diff <= 6) {
    const weekday = new Date(`${itemDay}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
    });
    dayLabel = `el ${weekday}`;
  } else {
    const includeYear = itemDay.slice(0, 4) !== todayDay.slice(0, 4);
    const date = new Date(`${itemDay}T00:00:00`).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: includeYear ? "numeric" : undefined,
    });
    dayLabel = `el ${date}`;
  }

  return `${dayLabel} a las ${localClock(iso, timeZone)}`;
}
