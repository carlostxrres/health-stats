import { formatDayLabel } from "@/lib/localTime";
import type { SleepPeriodRow } from "./types";

export function SleepPeriodTooltipContent({
  active,
  day,
  rows,
}: {
  active?: boolean;
  day?: string;
  rows: SleepPeriodRow[];
}) {
  if (!active || !day || rows.length === 0) return null;

  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatDayLabel(day)}</div>
      <div className="grid gap-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 text-muted-foreground"
          >
            <span>
              {row.startLabel}–{row.endLabel}
              {row.isNap ? " · siesta" : ""}
              {row.isPartial ? " · parcial" : ""}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {(row.range[1] - row.range[0]).toFixed(1)} h
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
