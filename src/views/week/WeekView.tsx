import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BAR_WIDTH, type ChartDataRow, DayRangeBars } from "@/components/charts/DayRangeBars";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { AXIS_TICKS, formatBoundaryOffset } from "@/lib/dayBoundary";
import { formatDayTick, getWeekDays, localDayKey } from "@/lib/localTime";
import { EventTooltipContent } from "./EventTooltipContent";
import { fetchWeekEvents } from "./eventRows";
import type { WeekEventRow } from "./types";
import { WeekSelector } from "./WeekSelector";

const chartConfig = {
  sleep: { label: "Sueño", color: "var(--chart-3)" },
  meal: { label: "Comidas", color: "var(--chart-highlight)" },
  workout: { label: "Deporte", color: "var(--chart-highlight-2)" },
  poop: { label: "Deposiciones", color: "var(--chart-highlight-3)" },
} satisfies ChartConfig;

export function WeekView() {
  const [weekStartDay, setWeekStartDay] = useState(
    () => getWeekDays(localDayKey(new Date().toISOString()))[0],
  );
  const [events, setEvents] = useState<WeekEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStartDay), [weekStartDay]);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError(null);
    fetchWeekEvents(weekDays)
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar la semana.");
      });
    return () => {
      cancelled = true;
    };
  }, [weekDays]);

  const { chartData, eventsByDay, maxEventsPerDay } = useMemo(() => {
    const eventsByDay = new Map<string, WeekEventRow[]>();
    for (const day of weekDays) eventsByDay.set(day, []);
    for (const row of events ?? []) {
      eventsByDay.get(row.day)?.push(row);
    }
    for (const dayRows of eventsByDay.values()) {
      dayRows.sort((a, b) => a.range[0] - b.range[0]);
    }

    const maxEventsPerDay = Math.max(0, ...[...eventsByDay.values()].map((rows) => rows.length));

    const chartData: ChartDataRow[] = weekDays.map((day) => {
      const row: ChartDataRow = { day };
      const dayRows = eventsByDay.get(day) ?? [];
      dayRows.forEach((eventRow, index) => {
        row[`seg${index}`] = eventRow.range;
        row[`seg${index}Kind`] = eventRow.kind;
        row[`seg${index}ContinuesBefore`] = eventRow.continuesBefore;
        row[`seg${index}ContinuesAfter`] = eventRow.continuesAfter;
      });
      return row;
    });

    return { chartData, eventsByDay, maxEventsPerDay };
  }, [events, weekDays]);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-medium">Week</h1>
          <p className="text-sm text-muted-foreground">
            Sueño, comidas, deporte y deposiciones de la semana, de un vistazo.
          </p>
        </div>
        <WeekSelector weekDays={weekDays} onWeekChange={setWeekStartDay} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!error && events === null && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!error && events !== null && (
        <>
          <ChartLegendContent config={chartConfig} />
          <ChartContainer config={chartConfig} className="aspect-auto h-[60vh] w-full">
            <BarChart data={chartData} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={formatDayTick}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                type="number"
                domain={[0, 24]}
                ticks={AXIS_TICKS}
                tickFormatter={(value) => formatBoundaryOffset(value, 0)}
                reversed
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={({ active, label }) => (
                  <EventTooltipContent
                    active={active}
                    day={typeof label === "string" ? label : undefined}
                    rows={(typeof label === "string" && eventsByDay.get(label)) || []}
                  />
                )}
              />
              <Bar
                dataKey="seg0"
                fill="transparent"
                maxBarSize={BAR_WIDTH}
                isAnimationActive={false}
              />
              <DayRangeBars
                chartData={chartData}
                maxSegments={maxEventsPerDay}
                getFill={(row, index) => `var(--color-${row[`seg${index}Kind`]})`}
              />
            </BarChart>
          </ChartContainer>
        </>
      )}
    </div>
  );
}
