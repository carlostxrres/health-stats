import { DefaultZIndexes, useXAxisScale, useYAxisScale, ZIndexLayer } from "recharts";

export type ChartDataRow = Record<string, string | [number, number] | boolean>;

export const BAR_WIDTH = 16;
const BAR_RADIUS = 4;
// Below this height a rounded rect's radius no longer even reads as a
// rounded rect, and thin segments (e.g. a poop entry lasting a few
// minutes) become nearly invisible. Enforcing a floor of 2x the radius
// keeps every segment visible at the cost of perfect proportionality.
const MIN_BAR_HEIGHT = BAR_RADIUS * 2;

// Recharts dodges sibling <Bar> series horizontally by default, which is
// exactly wrong here: segments split from the same or different sources
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
export function DayRangeBars({
  chartData,
  maxSegments,
  getFill,
}: {
  chartData: ChartDataRow[];
  maxSegments: number;
  getFill: (row: ChartDataRow, segmentIndex: number) => string;
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
          const y1 = yScale(range[0]);
          const y2 = yScale(range[1]);
          if (y1 == null || y2 == null) return null;
          const top = Math.min(y1, y2);
          const height = Math.max(Math.abs(y2 - y1), MIN_BAR_HEIGHT);
          const center = (y1 + y2) / 2;
          return (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: index is a fixed segment slot within this day, not a reorderable list item.
              key={`${row.day}-${index}`}
              x={cx - BAR_WIDTH / 2}
              y={height === MIN_BAR_HEIGHT ? center - height / 2 : top}
              width={BAR_WIDTH}
              height={height}
              rx={BAR_RADIUS}
              fill={getFill(row, index)}
            />
          );
        });
      })}
    </ZIndexLayer>
  );
}
