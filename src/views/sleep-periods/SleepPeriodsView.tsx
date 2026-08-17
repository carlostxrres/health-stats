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

// This app is single-user (see README), so rather than tracking a per-user
// timezone preference, times are displayed in a fixed zone regardless of
// the viewing device's own timezone. Change this if you move.
const DISPLAY_TIME_ZONE = "Europe/Madrid";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const clockFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

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

// "YYYY-MM-DD" in DISPLAY_TIME_ZONE, regardless of the viewing device's own
// timezone (en-CA formats dates in that order).
function localDayKey(iso: string) {
  return dayKeyFormatter.format(new Date(iso));
}

// Hours + fraction since DAY_BOUNDARY_HOUR, in DISPLAY_TIME_ZONE.
function hoursSinceBoundary(iso: string) {
  const parts = clockPartsFormatter.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hours = get("hour") + get("minute") / 60 + get("second") / 3600;
  const offset = hours - DAY_BOUNDARY_HOUR;
  return offset < 0 ? offset + 24 : offset;
}

function formatClock(iso: string) {
  return clockFormatter.format(new Date(iso));
}

// Converts an axis value (hours since DAY_BOUNDARY_HOUR) back into a clock
// time, e.g. 0 -> "18:00", 6 -> "00:00", 11.5 -> "05:30".
function formatBoundaryOffset(offsetHours: number) {
  const totalMinutes = Math.round((DAY_BOUNDARY_HOUR * 60 + offsetHours * 60) % (24 * 60));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// day strings are already plain "YYYY-MM-DD" calendar dates (see
// localDayKey), so parsing them without a timezone offset and formatting
// with the viewer's own locale/zone is safe: both steps use the same
// implicit zone, so the calendar date never shifts.
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

// Every calendar day from `startDay` to `endDay`, inclusive, so days with
// no sleep session still get an (empty) slot on the axis.
function enumerateDays(startDay: string, endDay: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDay}T00:00:00`);
  const end = new Date(`${endDay}T00:00:00`);
  while (cursor <= end) {
    const pad = (n: number) => String(n).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const AXIS_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function SleepPeriodTooltipContent({
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
              {formatClock(row.wentToBedAt)}–{formatClock(row.wokeUpAt)}
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

  const { chartData, sessionsByDay, maxSessionsPerDay } = useMemo(() => {
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
          // Grouped by the day the session ended, same convention as the
          // "Sleep times" view.
          day: localDayKey(session.wokeUpAt),
          range: [start, start + durationHours],
          wentToBedAt: session.wentToBedAt,
          wokeUpAt: session.wokeUpAt,
        };
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
      dayRows.sort((a, b) => a.wentToBedAt.localeCompare(b.wentToBedAt));
    }

    if (rows.length === 0) {
      return { chartData: [], sessionsByDay, maxSessionsPerDay: 0 };
    }

    const presentDays = [...sessionsByDay.keys()].sort();
    const allDays = enumerateDays(presentDays[0], presentDays[presentDays.length - 1]);
    const maxSessionsPerDay = Math.max(
      ...presentDays.map((day) => sessionsByDay.get(day)?.length ?? 0),
    );

    const chartData = allDays.map((day) => {
      const row: Record<string, string | [number, number]> = { day };
      const dayRows = sessionsByDay.get(day) ?? [];
      dayRows.forEach((sessionRow, index) => {
        row[`seg${index}`] = sessionRow.range;
      });
      return row;
    });

    return { chartData, sessionsByDay, maxSessionsPerDay };
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
            tickFormatter={formatBoundaryOffset}
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
          {Array.from({ length: maxSessionsPerDay }, (_, index) => (
            <Bar
              // biome-ignore lint/suspicious/noArrayIndexKey: seg{index} is a fixed dodge slot, not a reorderable list item.
              key={`seg${index}`}
              dataKey={`seg${index}`}
              fill="var(--color-sleep)"
              radius={4}
              maxBarSize={16}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
