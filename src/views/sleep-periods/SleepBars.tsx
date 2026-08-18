import { DefaultZIndexes, useXAxisScale, useYAxisScale, ZIndexLayer } from "recharts";
import type { ChartDataRow } from "./types";

export const BAR_WIDTH = 16;

// Recharts dodges sibling <Bar> series horizontally by default, which is
// exactly wrong here: segments split from the same or different sessions
// onto the same day column should all share one x position, not fan out
// side by side. Drawing them ourselves — reading pixel coordinates straight
// from the chart's own axis scales via useXAxisScale/useYAxisScale — sidesteps
// that entirely. A single invisible <Bar> stays in the parent chart purely
// so hovering a day column still drives the tooltip/cursor highlight.
//
// Rendering into ZIndexLayer(DefaultZIndexes.bar) matters too: without it
// this content paints outside recharts' zIndex portal system entirely,
// which lands it *behind* the tooltip's hover cursor (zIndex 200) and the
// cursor band ends up covering the bars. Using the same zIndex a real <Bar>
// would use keeps paint order correct.
export function SleepBars({
  chartData,
  maxSegments,
}: {
  chartData: ChartDataRow[];
  maxSegments: number;
}) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;
  return (
    <ZIndexLayer zIndex={DefaultZIndexes.bar}>
      {chartData.flatMap((row) => {
        const cx = xScale(row.day, { position: "middle" });
        if (cx == null) return [];
        return Array.from({ length: maxSegments }, (_, index) => {
          const range = row[`seg${index}`] as [number, number] | undefined;
          if (!range) return null;
          const isWeekendEnd = row[`seg${index}Weekend`];
          const y1 = yScale(range[0]);
          const y2 = yScale(range[1]);
          if (y1 == null || y2 == null) return null;
          return (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: index is a fixed segment slot within this day, not a reorderable list item.
              key={`${row.day}-${index}`}
              x={cx - BAR_WIDTH / 2}
              y={Math.min(y1, y2)}
              width={BAR_WIDTH}
              height={Math.abs(y2 - y1)}
              rx={4}
              fill={isWeekendEnd ? "var(--color-sleepWeekend)" : "var(--color-sleep)"}
            />
          );
        });
      })}
    </ZIndexLayer>
  );
}
