import type { SleepSession } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { BAR_WIDTH, type ChartDataRow, DayRangeBars } from "@/components/charts/DayRangeBars";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { apiClient } from "@/lib/api-client";
import {
  AXIS_TICKS,
  clockHourToAxisValue,
  formatBoundaryOffset,
  splitByBoundaryDay,
} from "@/lib/dayBoundary";
import { enumerateDays, formatDayTick, isWeekend, localDayKey } from "@/lib/localTime";
import { BoundaryHourSelect } from "./BoundaryHourSelect";
import { SleepPeriodTooltipContent } from "./SleepPeriodTooltipContent";
import type { SleepPeriodRow } from "./types";

const chartConfig = {
  sleep: { label: "Entre semana", color: "var(--chart-3)" },
  sleepWeekend: { label: "Fin de semana", color: "var(--chart-highlight)" },
} satisfies ChartConfig;

// Postgres `time` columns round-trip as "HH:MM:SS" strings.
function parseClockHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

export function SleepPeriodsView() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<SleepSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boundaryHour, setBoundaryHour] = useState(18);
  const [excludeNaps, setExcludeNaps] = useState(true);

  const bedtimeAxisValue =
    settings?.bedtimeGoal != null
      ? clockHourToAxisValue(parseClockHour(settings.bedtimeGoal), boundaryHour)
      : null;
  const wakeAxisValue =
    settings?.wakeTimeGoal != null
      ? clockHourToAxisValue(parseClockHour(settings.wakeTimeGoal), boundaryHour)
      : null;

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<SleepSession[]>("/sleep-sessions")
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar el sueño.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { chartData, sessionsByDay, maxSessionsPerDay } = useMemo(() => {
    const filteredSessions = excludeNaps
      ? (sessions ?? []).filter((session) => !session.isNap)
      : (sessions ?? []);
    const rows = filteredSessions.flatMap((session): SleepPeriodRow[] => {
      const segments = splitByBoundaryDay(
        { start: session.wentToBedAt, end: session.wokeUpAt },
        boundaryHour,
      );
      const isWeekendEnd = isWeekend(localDayKey(session.wokeUpAt));
      return segments.map((segment, index) => ({
        id: `${session.id}:${index}`,
        day: segment.day,
        range: segment.range,
        startLabel: formatBoundaryOffset(segment.range[0], boundaryHour),
        endLabel: formatBoundaryOffset(segment.range[1], boundaryHour),
        isNap: session.isNap,
        isPartial: segment.continuesBefore || segment.continuesAfter,
        isWeekendEnd,
        continuesBefore: segment.continuesBefore,
        continuesAfter: segment.continuesAfter,
      }));
    });

    const sessionsByDay = new Map<string, SleepPeriodRow[]>();
    for (const row of rows) {
      const existing = sessionsByDay.get(row.day);
      if (existing) {
        existing.push(row);
      } else {
        sessionsByDay.set(row.day, [row]);
      }
    }
    for (const dayRows of sessionsByDay.values()) {
      dayRows.sort((a, b) => a.range[0] - b.range[0]);
    }

    if (rows.length === 0) {
      return { chartData: [], sessionsByDay, maxSessionsPerDay: 0 };
    }

    const presentDays = [...sessionsByDay.keys()].sort();
    const allDays = enumerateDays(presentDays[0], presentDays[presentDays.length - 1]);
    const maxSessionsPerDay = Math.max(
      ...presentDays.map((day) => sessionsByDay.get(day)?.length ?? 0),
    );

    const chartData: ChartDataRow[] = allDays.map((day) => {
      const row: ChartDataRow = { day };
      const dayRows = sessionsByDay.get(day) ?? [];
      dayRows.forEach((sessionRow, index) => {
        row[`seg${index}`] = sessionRow.range;
        row[`seg${index}Weekend`] = sessionRow.isWeekendEnd;
        row[`seg${index}ContinuesBefore`] = sessionRow.continuesBefore;
        row[`seg${index}ContinuesAfter`] = sessionRow.continuesAfter;
      });
      return row;
    });

    return { chartData, sessionsByDay, maxSessionsPerDay };
  }, [sessions, boundaryHour, excludeNaps]);

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>;
  }

  if (!sessions) {
    return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (chartData.length === 0) {
    return (
      <Empty className="m-4">
        <EmptyHeader>
          <EmptyTitle>Todavía no hay registros de sueño.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2 p-4">
      <div className="flex flex-wrap justify-between gap-2 pb-4">
        <div>
          <h1 className="font-heading text-lg font-medium">Sleep periods</h1>
          <p className="text-sm text-muted-foreground">
            A qué horas te acuestas y te levantas cada día, para ver lo regulares que son.
          </p>
        </div>

        <div className="flex gap-4 pt-2 items-center lg:items-start">
          <BoundaryHourSelect value={boundaryHour} onChange={setBoundaryHour} />
          <Separator orientation="vertical" />
          <div className="flex gap-2 lg:flex-col">
            <Label htmlFor="exclude-naps">Excluir siestas</Label>
            <Switch id="exclude-naps" checked={excludeNaps} onCheckedChange={setExcludeNaps} />
          </div>
        </div>
      </div>
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
            tickFormatter={(value) => formatBoundaryOffset(value, boundaryHour)}
            reversed
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, label }) => (
              <SleepPeriodTooltipContent
                active={active}
                day={typeof label === "string" ? label : undefined}
                rows={(typeof label === "string" && sessionsByDay.get(label)) || []}
              />
            )}
          />
          <Bar dataKey="seg0" fill="transparent" maxBarSize={BAR_WIDTH} isAnimationActive={false} />
          <DayRangeBars
            chartData={chartData}
            maxSegments={maxSessionsPerDay}
            getFill={(row, index) =>
              row[`seg${index}Weekend`] ? "var(--color-sleepWeekend)" : "var(--color-sleep)"
            }
          />
          {bedtimeAxisValue != null && (
            <ReferenceLine
              y={bedtimeAxisValue}
              stroke="var(--chart-highlight-3)"
              strokeDasharray="4 4"
              label={{
                value: `Acostarme: ${settings?.bedtimeGoal?.slice(0, 5)}`,
                position: "insideBottomRight",
                fontSize: 12,
              }}
            />
          )}
          {wakeAxisValue != null && (
            <ReferenceLine
              y={wakeAxisValue}
              stroke="var(--chart-highlight-4)"
              strokeDasharray="4 4"
              label={{
                value: `Levantarme: ${settings?.wakeTimeGoal?.slice(0, 5)}`,
                position: "insideTopRight",
                fontSize: 12,
              }}
            />
          )}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
