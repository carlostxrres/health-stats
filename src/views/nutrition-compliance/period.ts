import {
  addDays,
  formatDayLabel,
  formatWeekRangeLabel,
  getWeekDays,
  localDayKey,
} from "@/lib/localTime";

export type Timespan = "daily" | "weekly";

// How many trailing periods (before the currently viewed one) the trend
// chart covers — roughly two weeks of days, or two months of weeks.
const HISTORY_LENGTH: Record<Timespan, number> = { daily: 13, weekly: 7 };

export function defaultPeriodKey(timespan: Timespan): string {
  const today = localDayKey(new Date().toISOString());
  return timespan === "daily" ? today : getWeekDays(today)[0];
}

export function stepPeriodKey(timespan: Timespan, periodKey: string, deltaPeriods: number): string {
  return timespan === "daily"
    ? addDays(periodKey, deltaPeriods)
    : addDays(periodKey, deltaPeriods * 7);
}

export function isCurrentPeriod(timespan: Timespan, periodKey: string): boolean {
  return periodKey === defaultPeriodKey(timespan);
}

export function periodLabel(timespan: Timespan, periodKey: string): string {
  return timespan === "daily"
    ? formatDayLabel(periodKey)
    : formatWeekRangeLabel(getWeekDays(periodKey));
}

// Ordered period keys from the oldest to the currently viewed one — used
// both as the trend chart's x-axis and to derive the range for the
// read-only cached-evaluations fetch, so every axis tick lines up with a
// fetched period even when that period has no cached row yet.
export function enumerateHistoryPeriods(timespan: Timespan, periodKey: string): string[] {
  const length = HISTORY_LENGTH[timespan];
  const keys: string[] = [];
  for (let i = length; i >= 0; i--) {
    keys.push(stepPeriodKey(timespan, periodKey, -i));
  }
  return keys;
}
