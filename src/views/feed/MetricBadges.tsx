import type { WorkoutMetric } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MAX_VISIBLE_METRICS = 4;

function formatMetric({ metricType, value, unit }: WorkoutMetric) {
  return `${metricType}: ${value}${unit}`;
}

// Same overflow treatment as IngredientBadges: a fixed cap so the card's
// height stays predictable, with the rest one tap away in a Popover.
export function MetricBadges({ metrics }: { metrics: WorkoutMetric[] }) {
  const visible = metrics.slice(0, MAX_VISIBLE_METRICS);
  const hiddenCount = metrics.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((metric) => (
        <Badge key={metric.id} variant="secondary" className="font-normal">
          {formatMetric(metric)}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Popover>
          <PopoverTrigger
            nativeButton={false}
            render={<Badge variant="outline" className="cursor-pointer font-normal" />}
          >
            +{hiddenCount} más
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <ul className="space-y-1 text-sm">
              {metrics.map((metric) => (
                <li key={metric.id}>{formatMetric(metric)}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
