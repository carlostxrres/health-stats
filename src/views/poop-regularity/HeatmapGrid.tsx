import { formatDayLabel, getWeekStartDay } from "@/lib/localTime";
import { colorForDay } from "./colorScales";
import type { ColorMode, DayStat } from "./types";

// Date#getDay() order (0=Sun..6=Sat) — rotated to start at weekStartDay to
// label the grid's 7 rows.
const WEEKDAY_INITIALS = ["D", "L", "M", "X", "J", "V", "S"];

function weekdayLabels(weekStartDay: number) {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_INITIALS[(weekStartDay + i) % 7]);
}

function formatMonthAbbrev(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-ES", { month: "short" });
}

function cellTooltip(stat: DayStat) {
  const parts = [formatDayLabel(stat.day), `${stat.count} entrada${stat.count === 1 ? "" : "s"}`];
  if (stat.avgBristol != null) parts.push(`Bristol medio ${stat.avgBristol.toFixed(1)}`);
  return parts.join(" · ");
}

export function HeatmapGrid({ weeks, mode }: { weeks: DayStat[][]; mode: ColorMode }) {
  const labels = weekdayLabels(getWeekStartDay());

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <div className="flex flex-col gap-[3px] pt-[18px]">
        {labels.map((label, index) => (
          <div key={label} className="flex h-3 w-4 items-center text-[10px] text-muted-foreground">
            {index % 2 === 1 ? label : ""}
          </div>
        ))}
      </div>
      <div className="flex gap-[3px]">
        {weeks.map((week, weekIndex) => {
          const firstDay = week[0];
          const prevFirstDay = weeks[weekIndex - 1]?.[0];
          const showMonthLabel =
            weekIndex === 0 ||
            (prevFirstDay && firstDay.day.slice(0, 7) !== prevFirstDay.day.slice(0, 7));
          return (
            <div key={firstDay.day} className="flex flex-col gap-[3px]">
              <div className="h-[14px] text-[10px] text-muted-foreground">
                {showMonthLabel ? formatMonthAbbrev(firstDay.day) : ""}
              </div>
              {week.map((stat) => (
                <div
                  key={stat.day}
                  title={cellTooltip(stat)}
                  className="size-3 rounded-[2px]"
                  style={{ backgroundColor: colorForDay(stat, mode) }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
