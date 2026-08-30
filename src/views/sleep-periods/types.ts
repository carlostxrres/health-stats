export type SleepPeriodRow = {
  id: string;
  day: string;
  range: [number, number];
  startLabel: string;
  endLabel: string;
  isNap: boolean;
  isPartial: boolean;
  // True when this row is only part of a session that straddles a day
  // boundary, so `range`'s corresponding edge is a midnight cut and not the
  // real bedtime/wake time.
  continuesBefore: boolean;
  continuesAfter: boolean;
  isWeekendEnd: boolean;
};
