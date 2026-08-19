export type ColorMode = "count" | "bristol";

export type DayStat = {
  day: string;
  count: number;
  avgBristol: number | null;
};
