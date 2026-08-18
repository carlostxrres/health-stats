import { addDays, localDayKey, localHourOfDay } from "@/lib/localTime";

export const AXIS_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

// Wraps (clockHour - boundaryHour) into [0, 24) — the core boundary-relative
// axis math shared by hoursSinceBoundary (from a timestamp) and
// clockHourToAxisValue (from a plain clock hour) below.
function wrapToBoundary(clockHour: number, boundaryHour: number) {
  const offset = clockHour - boundaryHour;
  return offset < 0 ? offset + 24 : offset;
}

// Hours + fraction since boundaryHour.
export function hoursSinceBoundary(iso: string, boundaryHour: number) {
  return wrapToBoundary(localHourOfDay(iso), boundaryHour);
}

// Converts a plain decimal clock hour (e.g. 22 for "22:00", 6.5 for "06:30")
// — not tied to any specific day — into the same boundary-relative axis
// space hoursSinceBoundary produces, for placing a fixed goal time on chart.
export function clockHourToAxisValue(clockHour: number, boundaryHour: number) {
  return wrapToBoundary(clockHour, boundaryHour);
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

// Splits one {start,end} period into one row per boundary-window (a 24h span
// starting at boundaryHour) it overlaps, clipping `range` to each window's
// edges. Day labels are anchored on the end day and counted *backward* per
// earlier segment (not forward from the start), so a period that fits in a
// single window still lands on the same day column regardless of
// boundaryHour. Only periods that actually straddle a boundary spill their
// earlier portion onto the preceding day(s).
export function splitByBoundaryDay(
  entry: { start: string; end: string },
  boundaryHour: number,
): { day: string; range: [number, number] }[] {
  const totalHours =
    (new Date(entry.end).getTime() - new Date(entry.start).getTime()) / (1000 * 60 * 60);
  let offset = hoursSinceBoundary(entry.start, boundaryHour);
  let remaining = totalHours;
  const ranges: [number, number][] = [];
  while (remaining > MIN_SEGMENT_HOURS) {
    const end = Math.min(offset + remaining, 24);
    ranges.push([offset, end]);
    remaining -= end - offset;
    offset = 0;
  }
  const endDay = localDayKey(entry.end);
  return ranges.map((range, index) => ({
    day: addDays(endDay, index - (ranges.length - 1)),
    range,
  }));
}
