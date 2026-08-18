import type { SleepSession } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useSettings } from "@/hooks/useSettings";
import { apiClient } from "@/lib/api-client";
import {
  formatDayLabel,
  formatDayTick,
  formatHoursMinutes,
  localClock,
  localDayKey,
} from "@/lib/localTime";

type SleepSegment = {
  hours: number;
  wentToBedAt: string;
  wokeUpAt: string;
  isNap: boolean;
};

type DayBar = { day: string } & Record<string, number | string>;

const chartConfig = {
  sleep: { label: "Horas dormidas", color: "var(--chart-2)" },
} satisfies ChartConfig;

function sessionHours(wentToBedAt: string, wokeUpAt: string) {
  return (new Date(wokeUpAt).getTime() - new Date(wentToBedAt).getTime()) / (1000 * 60 * 60);
}

function SleepTooltipContent({
  active,
  day,
  segments,
}: {
  active?: boolean;
  day?: string;
  segments: SleepSegment[];
}) {
  if (!active || !day || segments.length === 0) return null;
  const total = segments.reduce((sum, segment) => sum + segment.hours, 0);

  return (
    <div className="grid min-w-48 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatDayLabel(day)}</div>
      <div className="grid gap-1">
        {segments.map((segment) => (
          <div
            key={segment.wentToBedAt}
            className="flex items-center justify-between gap-3 text-muted-foreground"
          >
            <span>
              {localClock(segment.wentToBedAt)}–{localClock(segment.wokeUpAt)}
              {segment.isNap ? " · siesta" : ""}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {formatHoursMinutes(segment.hours)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-1 font-medium">
        <span>Total</span>
        <span className="font-mono tabular-nums">{formatHoursMinutes(total)}</span>
      </div>
    </div>
  );
}

export function SleepTimesView() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<SleepSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const goalHours = settings?.sleepGoalMinutes != null ? settings.sleepGoalMinutes / 60 : null;

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

  const { chartData, segmentsByDay, maxSegments } = useMemo(() => {
    const byDay = new Map<string, SleepSegment[]>();
    for (const session of sessions ?? []) {
      const day = localDayKey(session.wokeUpAt);
      const segment: SleepSegment = {
        hours: sessionHours(session.wentToBedAt, session.wokeUpAt),
        wentToBedAt: session.wentToBedAt,
        wokeUpAt: session.wokeUpAt,
        isNap: session.isNap,
      };
      const existing = byDay.get(day);
      if (existing) {
        existing.push(segment);
      } else {
        byDay.set(day, [segment]);
      }
    }

    for (const segments of byDay.values()) {
      segments.sort((a, b) => a.wentToBedAt.localeCompare(b.wentToBedAt));
    }

    const days = [...byDay.keys()].sort();
    const maxSegments = days.reduce((max, day) => Math.max(max, byDay.get(day)?.length ?? 0), 0);

    const chartData: DayBar[] = days.map((day) => {
      const segments = byDay.get(day) ?? [];
      const row: DayBar = { day };
      segments.forEach((segment, index) => {
        row[`seg${index}`] = segment.hours;
      });
      return row;
    });

    return { chartData, segmentsByDay: byDay, maxSegments };
  }, [sessions]);

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
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Sleep times</h1>
        <p className="text-sm text-muted-foreground">
          Horas dormidas cada día. Cada barra se divide en los periodos de sueño de ese día.
        </p>
      </div>
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
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            tickFormatter={(value) => `${value} h`}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, label }) => (
              <SleepTooltipContent
                active={active}
                day={typeof label === "string" ? label : undefined}
                segments={(typeof label === "string" && segmentsByDay.get(label)) || []}
              />
            )}
          />
          {Array.from({ length: maxSegments }, (_, index) => (
            <Bar
              // biome-ignore lint/suspicious/noArrayIndexKey: seg{index} is a fixed stack slot, not a reorderable list item.
              key={`seg${index}`}
              dataKey={`seg${index}`}
              stackId="sleep"
              fill="var(--color-sleep)"
              stroke="var(--background)"
              strokeWidth={2}
              maxBarSize={24}
            />
          ))}
          {goalHours != null && (
            <ReferenceLine
              y={goalHours}
              stroke="var(--chart-highlight)"
              strokeDasharray="4 4"
              label={{
                value: `Objetivo: ${formatHoursMinutes(goalHours)}`,
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
