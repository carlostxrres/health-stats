import type { SleepSession } from "@shared/types";
import { addDays, localDayKey, localHourOfDay } from "@/lib/localTime";

export const AXIS_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

export const BOUNDARY_HOUR_ITEMS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

// Hours + fraction since boundaryHour.
export function hoursSinceBoundary(iso: string, boundaryHour: number) {
  const offset = localHourOfDay(iso) - boundaryHour;
  return offset < 0 ? offset + 24 : offset;
}

// Converts an axis value (hours since boundaryHour) back into a clock time,
// e.g. boundaryHour=18: 0 -> "18:00", 6 -> "00:00", 11.5 -> "05:30".
export function formatBoundaryOffset(offsetHours: number, boundaryHour: number) {
  const totalMinutes = Math.round((boundaryHour * 60 + offsetHours * 60) % (24 * 60));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const MIN_SEGMENT_HOURS = 1e-6; // guards against float noise re-triggering the loop below

// Splits one raw sleep session into one row per boundary-window (a 24h span
// starting at boundaryHour) it overlaps, clipping `range` to each window's
// edges. Day labels are anchored on the wake-up day and counted *backward*
// per earlier segment (not forward from bedtime), so a session that fits in
// a single window still lands on the same day column as before regardless
// of boundaryHour — matching the "grouped by the day the session ended"
// convention shared with the Sleep times view. Only sessions that actually
// straddle a boundary spill their earlier portion onto the preceding day(s).
export function splitByBoundaryDay(
  session: SleepSession,
  boundaryHour: number,
): { day: string; range: [number, number] }[] {
  const totalHours =
    (new Date(session.wokeUpAt).getTime() - new Date(session.wentToBedAt).getTime()) /
    (1000 * 60 * 60);
  let offset = hoursSinceBoundary(session.wentToBedAt, boundaryHour);
  let remaining = totalHours;
  const ranges: [number, number][] = [];
  while (remaining > MIN_SEGMENT_HOURS) {
    const end = Math.min(offset + remaining, 24);
    ranges.push([offset, end]);
    remaining -= end - offset;
    offset = 0;
  }
  const wakeDay = localDayKey(session.wokeUpAt);
  return ranges.map((range, index) => ({
    day: addDays(wakeDay, index - (ranges.length - 1)),
    range,
  }));
}
