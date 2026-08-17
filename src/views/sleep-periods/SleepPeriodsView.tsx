import type { SleepSession } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { apiClient } from "@/lib/api-client";

// The Y axis is a 24h band starting at this hour, not at midnight, so a
// normal night's sleep (evening to next morning) never wraps around the
// edge of the axis. Change this if your bedtime tends to fall outside the
// 18:00-18:00 window.
const DAY_BOUNDARY_HOUR = 18;

type SleepPeriodRow = {
  id: string;
  day: string;
  range: [number, number];
  wentToBedAt: string;
  wokeUpAt: string;
};

const chartConfig = {
  sleep: { label: "Periodo de sueño", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Reads the wall-clock time straight off the Date object (browser-local
// getters), the same convention src/lib/datetime.ts relies on: the offset
// stored alongside each timestamp is the browser's own, so this recovers
// the local time the entry was made in.
function hoursSinceBoundary(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const offset = hours - DAY_BOUNDARY_HOUR;
  return offset < 0 ? offset + 24 : offset;
}

function localDayKey(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Converts an axis value (hours since DAY_BOUNDARY_HOUR) back into a clock
// time, e.g. 0 -> "18:00", 6 -> "00:00", 11.5 -> "05:30".
function formatBoundaryOffset(offsetHours: number) {
  const totalMinutes = Math.round((DAY_BOUNDARY_HOUR * 60 + offsetHours * 60) % (24 * 60));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatDayTick(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatDayLabel(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const AXIS_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function SleepPeriodTooltipContent({ active, row }: { active?: boolean; row?: SleepPeriodRow }) {
  if (!active || !row) return null;
  const hours = row.range[1] - row.range[0];

  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatDayLabel(row.day)}</div>
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <span>
          {formatClock(row.wentToBedAt)}–{formatClock(row.wokeUpAt)}
        </span>
        <span className="font-mono tabular-nums text-foreground">{hours.toFixed(1)} h</span>
      </div>
    </div>
  );
}

export function SleepPeriodsView() {
  const [sessions, setSessions] = useState<SleepSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const { chartData, rowById } = useMemo(() => {
    // Naps happen at all kinds of hours and would clutter a chart about
    // bedtime/wake-time consistency, so only the main, non-nap sleep of
    // each night is plotted here.
    const rows = (sessions ?? [])
      .filter((session) => !session.isNap)
      .map((session): SleepPeriodRow => {
        const start = hoursSinceBoundary(session.wentToBedAt);
        const durationHours =
          (new Date(session.wokeUpAt).getTime() - new Date(session.wentToBedAt).getTime()) /
          (1000 * 60 * 60);
        return {
          id: session.id,
          day: localDayKey(session.wentToBedAt),
          range: [start, start + durationHours],
          wentToBedAt: session.wentToBedAt,
          wokeUpAt: session.wokeUpAt,
        };
      })
      // Sorted (not grouped) by bed time: two sessions can share the same
      // calendar bed-date (one just after midnight, another that evening),
      // so each session gets its own bar/x-position rather than being
      // merged by day.
      .sort((a, b) => a.wentToBedAt.localeCompare(b.wentToBedAt));

    const rowById = new Map(rows.map((row) => [row.id, row]));
    return { chartData: rows, rowById };
  }, [sessions]);

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>;
  }

  if (!sessions) {
    return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (chartData.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Todavía no hay registros de sueño.</p>;
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Sleep periods</h1>
        <p className="text-sm text-muted-foreground">
          A qué horas te acuestas y te levantas cada día, para ver lo regulares que son.
        </p>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[60vh] w-full">
        <BarChart data={chartData} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="id"
            tickFormatter={(id: string) => {
              const row = rowById.get(id);
              return row ? formatDayTick(row.day) : "";
            }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            type="number"
            domain={[0, 24]}
            ticks={AXIS_TICKS}
            tickFormatter={formatBoundaryOffset}
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
                row={typeof label === "string" ? rowById.get(label) : undefined}
              />
            )}
          />
          <Bar dataKey="range" fill="var(--color-sleep)" radius={4} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
