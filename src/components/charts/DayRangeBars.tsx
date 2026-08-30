import { DefaultZIndexes, useXAxisScale, useYAxisScale, ZIndexLayer } from "recharts";

export type ChartDataRow = Record<string, string | [number, number] | boolean>;

export const BAR_WIDTH = 16;
const BAR_RADIUS = 4;
// Below this height a rounded rect's radius no longer even reads as a
// rounded rect, and thin segments (e.g. a poop entry lasting a few
// minutes) become nearly invisible. Enforcing a floor of 2x the radius
// keeps every segment visible at the cost of perfect proportionality.
const MIN_BAR_HEIGHT = BAR_RADIUS * 2;

// <rect rx> can only round all four corners at once, but here the radius
// carries meaning: it marks where an activity actually begins and ends. A
// segment clipped by a day boundary has to stay square on the clipped edge,
// so bars are drawn as paths with per-corner radii instead.
//
// Radii are clamped to half the width/height the way <rect rx>/<rect ry>
// clamp theirs. MIN_BAR_HEIGHT already floors every drawn bar at 2x the
// radius, so that clamp is inert today; it stays so this helper remains
// correct on its own terms if the floor ever changes.
function barPath(
  x: number,
  y: number,
  w: number,
  h: number,
  roundTop: boolean,
  roundBottom: boolean,
) {
  const rx = Math.min(BAR_RADIUS, w / 2);
  const ry = Math.min(BAR_RADIUS, h / 2);
  const [tx, ty] = roundTop ? [rx, ry] : [0, 0];
  const [bx, by] = roundBottom ? [rx, ry] : [0, 0];
  return [
    `M${x + tx},${y}`,
    `H${x + w - tx}`,
    tx && `A${tx},${ty} 0 0 1 ${x + w},${y + ty}`,
    `V${y + h - by}`,
    bx && `A${bx},${by} 0 0 1 ${x + w - bx},${y + h}`,
    `H${x + bx}`,
    bx && `A${bx},${by} 0 0 1 ${x},${y + h - by}`,
    `V${y + ty}`,
    tx && `A${tx},${ty} 0 0 1 ${x + tx},${y}`,
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

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
          // Which screen edge holds the range's start depends on whether the
          // y axis is reversed (both current callers reverse it, putting the
          // start on top), so derive it from the pixels rather than assume.
          const startAtTop = y1 <= y2;
          const before = row[`seg${index}ContinuesBefore`] === true;
          const after = row[`seg${index}ContinuesAfter`] === true;
          return (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: index is a fixed segment slot within this day, not a reorderable list item.
              key={`${row.day}-${index}`}
              d={barPath(
                cx - BAR_WIDTH / 2,
                height === MIN_BAR_HEIGHT ? center - height / 2 : top,
                BAR_WIDTH,
                height,
                startAtTop ? !before : !after,
                startAtTop ? !after : !before,
              )}
              fill={getFill(row, index)}
            />
          );
        });
      })}
    </ZIndexLayer>
  );
}
