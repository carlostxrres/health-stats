import { WORKOUT_TYPES } from "@shared/metricCatalog";
import type { WorkoutWithDetails } from "@shared/types";
import { Dumbbell, MapPin } from "lucide-react";
import { MetricBadges } from "./MetricBadges";
import { PostCard } from "./PostCard";
import { PostPhotoCarousel } from "./PostPhotoCarousel";
import { WorkoutSetsTable } from "./WorkoutSetsTable";

export function WorkoutPost({ workout }: { workout: WorkoutWithDetails }) {
  const typeLabel =
    WORKOUT_TYPES.find((type) => type.code === workout.workoutType)?.label ?? workout.workoutType;

  return (
    <PostCard icon={Dumbbell} verb="Entrenó" occurredAt={workout.startedAt}>
      <p className="font-medium text-foreground">
        {typeLabel}
        {workout.durationMinutes ? ` de ${workout.durationMinutes} minutos` : ""}
      </p>
      {workout.location && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {workout.location}
        </p>
      )}
      {workout.notes && <p className="text-sm text-muted-foreground">{workout.notes}</p>}
      {workout.photos.length > 0 && <PostPhotoCarousel photos={workout.photos} />}
      {workout.metrics.length > 0 && <MetricBadges metrics={workout.metrics} />}
      {workout.sets.length > 0 && <WorkoutSetsTable sets={workout.sets} />}
    </PostCard>
  );
}
