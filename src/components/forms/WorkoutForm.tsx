import { WORKOUT_TYPES } from "@shared/metricCatalog";
import { workoutInputSchema } from "@shared/validation";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
import { PhotoUploader } from "@/components/forms/PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { isoToLocalInputValue, localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

const WORKOUT_TYPE_ITEMS = WORKOUT_TYPES.map((t) => ({ value: t.code, label: t.label }));

export type WorkoutInitialData = {
  workoutType: string;
  startedAt: string;
  durationMinutes: number | null;
  notes: string | null;
  metrics: { metricType: string; value: string; unit: string }[];
  sets: { exerciseName: string; setNumber: number; reps: number | null; weightKg: string | null }[];
  photos: { storagePath: string }[];
};

type FormValues = {
  workoutType: string;
  startedAtLocal: string;
  durationMinutes: string;
  notes: string;
  metrics: { metricType: string; value: string; unit: string }[];
  sets: { exerciseName: string; setNumber: string; reps: string; weightKg: string }[];
};

export function WorkoutForm({
  entryId,
  initialData,
}: {
  entryId?: string;
  initialData?: WorkoutInitialData;
}) {
  const navigate = useNavigate();
  const [photoPaths, setPhotoPaths] = useState<string[]>(
    initialData ? initialData.photos.map((p) => p.storagePath) : [],
  );
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: initialData
      ? {
          workoutType: initialData.workoutType,
          startedAtLocal: isoToLocalInputValue(initialData.startedAt),
          durationMinutes:
            initialData.durationMinutes != null ? String(initialData.durationMinutes) : "",
          notes: initialData.notes ?? "",
          metrics: initialData.metrics.map((m) => ({
            metricType: m.metricType,
            value: m.value,
            unit: m.unit,
          })),
          sets: initialData.sets.map((s) => ({
            exerciseName: s.exerciseName,
            setNumber: String(s.setNumber),
            reps: s.reps != null ? String(s.reps) : "",
            weightKg: s.weightKg ?? "",
          })),
        }
      : {
          workoutType: WORKOUT_TYPES[0].code,
          startedAtLocal: nowAsLocalInputValue(),
          durationMinutes: "",
          notes: "",
          metrics: [],
          sets: [],
        },
  });

  const metricsArray = useFieldArray({ control, name: "metrics" });
  const setsArray = useFieldArray({ control, name: "sets" });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = workoutInputSchema.safeParse({
      startedAt: localInputToIso(values.startedAtLocal),
      durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
      workoutType: values.workoutType,
      notes: values.notes || undefined,
      metrics: values.metrics
        .filter((m) => m.metricType.trim() !== "")
        .map((m) => ({ metricType: m.metricType, value: Number(m.value), unit: m.unit })),
      sets: values.sets
        .filter((s) => s.exerciseName.trim() !== "")
        .map((s, index) => ({
          exerciseName: s.exerciseName,
          setNumber: s.setNumber ? Number(s.setNumber) : index + 1,
          reps: s.reps ? Number(s.reps) : undefined,
          weightKg: s.weightKg ? Number(s.weightKg) : undefined,
        })),
      photoStoragePaths: photoPaths,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      if (entryId) {
        await apiClient.patch(`/workouts/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/workouts", parsed.data);
      setStatus("success");
      setPhotoPaths([]);
      reset({
        workoutType: values.workoutType,
        startedAtLocal: nowAsLocalInputValue(),
        durationMinutes: "",
        notes: "",
        metrics: [],
        sets: [],
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Tipo">
        <Controller
          control={control}
          name="workoutType"
          render={({ field }) => (
            <Select items={WORKOUT_TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_TYPES.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("startedAtLocal", { required: true })} />
      </Field>

      <Field label="Duración (min, opcional)">
        <Input type="number" {...register("durationMinutes")} />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Métricas (distancia, calorías, FC media…)</span>
        {metricsArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="ej. distance_km"
              {...register(`metrics.${index}.metricType` as const)}
            />
            <Input
              className="w-20"
              placeholder="Valor"
              {...register(`metrics.${index}.value` as const)}
            />
            <Input
              className="w-20"
              placeholder="Unidad"
              {...register(`metrics.${index}.unit` as const)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => metricsArray.remove(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => metricsArray.append({ metricType: "", value: "", unit: "" })}
        >
          <Plus className="size-3.5" /> Añadir métrica
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Series (fuerza)</span>
        {setsArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Ejercicio"
              {...register(`sets.${index}.exerciseName` as const)}
            />
            <Input
              className="w-16"
              placeholder="Set nº"
              {...register(`sets.${index}.setNumber` as const)}
            />
            <Input
              className="w-16"
              placeholder="Reps"
              {...register(`sets.${index}.reps` as const)}
            />
            <Input
              className="w-20"
              placeholder="Peso kg"
              {...register(`sets.${index}.weightKg` as const)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setsArray.remove(index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            setsArray.append({
              exerciseName: "",
              setNumber: String(setsArray.fields.length + 1),
              reps: "",
              weightKg: "",
            })
          }
        >
          <Plus className="size-3.5" /> Añadir serie
        </Button>
      </div>

      <Field label="Notas (opcional)">
        <Textarea rows={2} {...register("notes")} />
      </Field>

      <Field label="Fotos (opcional)">
        <PhotoUploader pathPrefix="workouts" value={photoPaths} onChange={setPhotoPaths} />
      </Field>

      {status === "error" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {status === "success" && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : entryId ? "Guardar cambios" : "Guardar"}
      </Button>
    </form>
  );
}
