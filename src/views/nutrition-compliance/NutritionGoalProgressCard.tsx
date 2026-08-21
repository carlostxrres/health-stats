import type { NutritionComplianceEvaluation, NutritionGoal } from "@shared/types";
import { MEAL_TYPE_LABELS } from "@shared/validation/meals";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { localClock } from "@/lib/localTime";

export function NutritionGoalProgressCard({
  goal,
  evaluation,
}: {
  goal: NutritionGoal;
  evaluation?: NutritionComplianceEvaluation;
}) {
  const percent = evaluation ? Math.min(100, Math.max(0, evaluation.percentComplete)) : 0;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{goal.subjectLabel}</span>
        {evaluation ? (
          <Badge variant={evaluation.met ? "default" : "secondary"}>
            {evaluation.met ? "Cumplido" : "No cumplido"}
          </Badge>
        ) : (
          <Badge variant="outline">Sin evaluar</Badge>
        )}
      </div>

      <Progress value={percent} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {evaluation ? evaluation.achievedQuantity : "—"} / {goal.targetQuantity} {goal.unit} ·{" "}
          {goal.limitType === "min" ? "mínimo" : "máximo"}
        </span>
        {evaluation && <span>{Math.round(evaluation.percentComplete)}%</span>}
      </div>

      {evaluation && evaluation.matchedItems.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {evaluation.matchedItems.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: AI-generated items are only ever displayed, never reordered.
            <li key={index}>
              {item.label}
              {item.quantity != null &&
                ` · ${item.quantity}${item.quantityUnit ? ` ${item.quantityUnit}` : ""}`}
              {item.matchedAt && ` · ${localClock(item.matchedAt)}`}
              {item.mealType &&
                ` · ${MEAL_TYPE_LABELS[item.mealType as keyof typeof MEAL_TYPE_LABELS] ?? item.mealType}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
