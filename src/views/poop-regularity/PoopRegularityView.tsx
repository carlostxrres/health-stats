import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, getWeekDays, localDayKey } from "@/lib/localTime";
import { BRISTOL_LEGEND, COUNT_LEGEND } from "./colorScales";
import { chunkIntoWeeks, daysSinceLastEntry, fetchDailyStats, HEATMAP_WEEKS } from "./dailyStats";
import { HeatmapGrid } from "./HeatmapGrid";
import type { ColorMode, DayStat } from "./types";

const MODE_ITEMS = [
  { value: "count", label: "Frecuencia" },
  { value: "bristol", label: "Consistencia (Bristol)" },
];

function windowFor(anchorDay: string) {
  const endDay = getWeekDays(anchorDay)[6];
  const startDay = addDays(endDay, -(HEATMAP_WEEKS * 7 - 1));
  return { startDay, endDay };
}

export function PoopRegularityView() {
  const [anchorDay, setAnchorDay] = useState(() => localDayKey(new Date().toISOString()));
  const [mode, setMode] = useState<ColorMode>("count");
  const [dayStats, setDayStats] = useState<Map<string, DayStat> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { startDay, endDay } = useMemo(() => windowFor(anchorDay), [anchorDay]);
  const isCurrentWindow = windowFor(localDayKey(new Date().toISOString())).endDay === endDay;

  useEffect(() => {
    let cancelled = false;
    setDayStats(null);
    setError(null);
    fetchDailyStats(startDay, endDay)
      .then((stats) => {
        if (!cancelled) setDayStats(stats);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar la regularidad.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [startDay, endDay]);

  const weeks = useMemo(
    () => (dayStats ? chunkIntoWeeks(dayStats, startDay, endDay) : null),
    [dayStats, startDay, endDay],
  );
  const streakDays = dayStats ? daysSinceLastEntry(dayStats) : null;
  const legend = mode === "count" ? COUNT_LEGEND : BRISTOL_LEGEND;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-medium">Regularity</h1>
          <p className="text-sm text-muted-foreground">
            Un vistazo a cuándo y con qué frecuencia registras deposiciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            items={MODE_ITEMS}
            value={mode}
            onValueChange={(value) => setMode(value as ColorMode)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Año anterior"
            onClick={() => setAnchorDay((day) => addDays(day, -HEATMAP_WEEKS * 7))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Año siguiente"
            disabled={isCurrentWindow}
            onClick={() => setAnchorDay((day) => addDays(day, HEATMAP_WEEKS * 7))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && dayStats === null && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!error && dayStats !== null && weeks !== null && (
        <>
          <p className="text-sm text-foreground">
            {streakDays === null
              ? "Sin entradas en este periodo."
              : streakDays === 0
                ? "Última entrada: hoy."
                : streakDays === 1
                  ? "Última entrada: ayer."
                  : `Última entrada: hace ${streakDays} días.`}
          </p>

          <HeatmapGrid weeks={weeks} mode={mode} />

          <div className="flex flex-wrap items-center gap-3">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="size-3 rounded-[2px]" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
