export type SleepPeriodRow = {
  id: string;
  day: string;
  range: [number, number];
  startLabel: string;
  endLabel: string;
  isNap: boolean;
  isPartial: boolean;
  isWeekendEnd: boolean;
};
