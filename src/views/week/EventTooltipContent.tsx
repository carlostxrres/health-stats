import { WORKOUT_TYPES } from "@shared/metricCatalog";
import { BRISTOL_SCALE_LABELS } from "@shared/validation";
import { formatDayLabel } from "@/lib/localTime";
import { PhotoThumbnail } from "./PhotoThumbnail";
import type { WeekEventRow } from "./types";

function EventRow({ row }: { row: WeekEventRow }) {
  const timeRange = (
    <span className="font-mono tabular-nums text-foreground">
      {row.startLabel}–{row.endLabel}
    </span>
  );

  if (row.kind === "sleep") {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Sueño{row.data.isNap ? " · siesta" : ""}</span>
        {timeRange}
      </div>
    );
  }

  if (row.kind === "meal") {
    const meal = row.data;
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-foreground">{meal.title}</span>
          {meal.location && <span className="text-muted-foreground">{meal.location}</span>}
          {meal.description && <span className="text-muted-foreground">{meal.description}</span>}
          {meal.photos.length > 0 && (
            <div className="mt-1 flex gap-1">
              {meal.photos.map((photo) => (
                <PhotoThumbnail key={photo.id} storagePath={photo.storagePath} />
              ))}
            </div>
          )}
        </div>
        {timeRange}
      </div>
    );
  }

  if (row.kind === "poop") {
    const entry = row.data;
    const headline =
      entry.bristolScale != null
        ? BRISTOL_SCALE_LABELS[entry.bristolScale as keyof typeof BRISTOL_SCALE_LABELS]
        : "Deposición";
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-foreground">{headline}</span>
          {entry.location && <span className="text-muted-foreground">{entry.location}</span>}
          {entry.notes && <span className="text-muted-foreground">{entry.notes}</span>}
          {entry.photos.length > 0 && (
            <div className="mt-1 flex gap-1">
              {entry.photos.map((photo) => (
                <PhotoThumbnail key={photo.id} storagePath={photo.storagePath} />
              ))}
            </div>
          )}
        </div>
        {timeRange}
      </div>
    );
  }

  const workout = row.data;
  const typeLabel =
    WORKOUT_TYPES.find((t) => t.code === workout.workoutType)?.label ?? workout.workoutType;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-foreground">{typeLabel}</span>
        {workout.metrics.length > 0 && (
          <span className="text-muted-foreground">
            {workout.metrics.map((m) => `${m.metricType}: ${m.value}${m.unit}`).join(" · ")}
          </span>
        )}
        {workout.notes && <span className="text-muted-foreground">{workout.notes}</span>}
        {workout.photos.length > 0 && (
          <div className="mt-1 flex gap-1">
            {workout.photos.map((photo) => (
              <PhotoThumbnail key={photo.id} storagePath={photo.storagePath} />
            ))}
          </div>
        )}
      </div>
      {timeRange}
    </div>
  );
}

export function EventTooltipContent({
  active,
  day,
  rows,
}: {
  active?: boolean;
  day?: string;
  rows: WeekEventRow[];
}) {
  if (!active || !day || rows.length === 0) return null;

  return (
    <div className="grid min-w-56 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatDayLabel(day)}</div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <EventRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
