import type { NutritionGoal } from "@shared/types";
import {
  NUTRITION_GOAL_SUBJECT_TYPE_LABELS,
  NUTRITION_GOAL_SUBJECT_TYPES,
  type NutritionGoalInput,
  nutritionGoalInputSchema,
} from "@shared/validation/nutritionGoals";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";

type FormValues = {
  subjectLabel: string;
  subjectType: NutritionGoalInput["subjectType"];
  clarification: string;
  limitType: NutritionGoalInput["limitType"];
  targetQuantity: string;
  unit: string;
  timespan: NutritionGoalInput["timespan"];
  active: boolean;
};

const EMPTY_DEFAULTS: FormValues = {
  subjectLabel: "",
  subjectType: "macro",
  clarification: "",
  limitType: "min",
  targetQuantity: "",
  unit: "",
  timespan: "daily",
  active: true,
};

function buildDefaults(goal: NutritionGoal): FormValues {
  return {
    subjectLabel: goal.subjectLabel,
    subjectType: goal.subjectType as FormValues["subjectType"],
    clarification: goal.clarification ?? "",
    limitType: goal.limitType as FormValues["limitType"],
    targetQuantity: goal.targetQuantity,
    unit: goal.unit,
    timespan: goal.timespan as FormValues["timespan"],
    active: goal.active,
  };
}

export function NutritionGoalForm({
  goal,
  onSaved,
}: {
  goal?: NutritionGoal;
  onSaved: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: goal ? buildDefaults(goal) : EMPTY_DEFAULTS });

  async function onSubmit(values: FormValues) {
    const parsed = nutritionGoalInputSchema.safeParse({
      subjectLabel: values.subjectLabel.trim(),
      subjectType: values.subjectType,
      clarification: values.clarification.trim() || null,
      limitType: values.limitType,
      targetQuantity: Number(values.targetQuantity),
      unit: values.unit.trim(),
      timespan: values.timespan,
      active: values.active,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      if (goal) {
        await apiClient.patch(`/settings?resource=nutrition-goals&id=${goal.id}`, parsed.data);
      } else {
        await apiClient.post("/settings?resource=nutrition-goals", parsed.data);
      }
      toast.success(goal ? "Objetivo actualizado." : "Objetivo creado.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
      <Field label="Sujeto">
        <Input
          placeholder="Proteína, Sardinas en lata, Fermentados…"
          {...register("subjectLabel")}
        />
      </Field>

      <Field label="Tipo">
        <Controller
          control={control}
          name="subjectType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUTRITION_GOAL_SUBJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {NUTRITION_GOAL_SUBJECT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Aclaración (opcional)">
        <Textarea
          placeholder='Ayuda a la IA a interpretar objetivos ambiguos, ej. "cualquier fermentado: yogur, kéfir, chucrut, kimchi, miso"'
          rows={2}
          {...register("clarification")}
        />
      </Field>

      <Field label="Límite">
        <Controller
          control={control}
          name="limitType"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
              <label htmlFor="limit-min" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="limit-min" value="min" /> Mínimo
              </label>
              <label htmlFor="limit-max" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="limit-max" value="max" /> Máximo
              </label>
            </RadioGroup>
          )}
        />
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Cantidad">
            <Input type="number" step="0.01" min="0" {...register("targetQuantity")} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Unidad">
            <Input placeholder="g, piezas, latas, veces…" {...register("unit")} />
          </Field>
        </div>
      </div>

      <Field label="Periodo">
        <Controller
          control={control}
          name="timespan"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
              <label htmlFor="timespan-daily" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="timespan-daily" value="daily" /> Al día
              </label>
              <label htmlFor="timespan-weekly" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="timespan-weekly" value="weekly" /> A la semana
              </label>
            </RadioGroup>
          )}
        />
      </Field>

      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <label htmlFor="nutrition-goal-active" className="flex items-center gap-2 text-sm">
            <Switch
              id="nutrition-goal-active"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            Activo
          </label>
        )}
      />

      <SheetFooter className="p-0">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : goal ? "Guardar cambios" : "Crear objetivo"}
        </Button>
      </SheetFooter>
    </form>
  );
}
