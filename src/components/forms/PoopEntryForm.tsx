import {
  BRISTOL_SCALE_LABELS,
  BRISTOL_SCALE_VALUES,
  poopEntryInputSchema,
  STOOL_COLOR_LABELS,
  STOOL_COLORS,
} from "@shared/validation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

const BRISTOL_ITEMS = BRISTOL_SCALE_VALUES.map((v) => ({
  value: String(v),
  label: BRISTOL_SCALE_LABELS[v],
}));
const COLOR_ITEMS = STOOL_COLORS.map((c) => ({ value: c, label: STOOL_COLOR_LABELS[c] }));
const FELT_COMPLETE_ITEMS = [
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

export type PoopEntryInitialData = {
  occurredAt: string;
  location: string | null;
  bristolScale: number | null;
  urgency: number | null;
  effort: number | null;
  feltComplete: boolean | null;
  color: string | null;
  durationMinutes: number | null;
  notes: string | null;
  photos: { storagePath: string }[];
};

type FormValues = {
  occurredAtLocal: string;
  location: string;
  bristolScale: string;
  urgency: string;
  effort: string;
  feltComplete: string;
  color: string;
  durationMinutes: string;
  notes: string;
};

const EMPTY_VALUES: FormValues = {
  occurredAtLocal: nowAsLocalInputValue(),
  location: "",
  bristolScale: "",
  urgency: "",
  effort: "",
  feltComplete: "",
  color: "",
  durationMinutes: "",
  notes: "",
};

export function PoopEntryForm({
  entryId,
  initialData,
}: {
  entryId?: string;
  initialData?: PoopEntryInitialData;
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
          occurredAtLocal: isoToLocalInputValue(initialData.occurredAt),
          location: initialData.location ?? "",
          bristolScale: initialData.bristolScale != null ? String(initialData.bristolScale) : "",
          urgency: initialData.urgency != null ? String(initialData.urgency) : "",
          effort: initialData.effort != null ? String(initialData.effort) : "",
          feltComplete: initialData.feltComplete != null ? String(initialData.feltComplete) : "",
          color: initialData.color ?? "",
          durationMinutes:
            initialData.durationMinutes != null ? String(initialData.durationMinutes) : "",
          notes: initialData.notes ?? "",
        }
      : EMPTY_VALUES,
  });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = poopEntryInputSchema.safeParse({
      occurredAt: localInputToIso(values.occurredAtLocal),
      location: values.location || undefined,
      bristolScale: values.bristolScale ? Number(values.bristolScale) : undefined,
      urgency: values.urgency ? Number(values.urgency) : undefined,
      effort: values.effort ? Number(values.effort) : undefined,
      feltComplete: values.feltComplete ? values.feltComplete === "true" : undefined,
      color: values.color || undefined,
      durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
      notes: values.notes || undefined,
      photoStoragePaths: photoPaths,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      if (entryId) {
        await apiClient.patch(`/poop-entries/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/poop-entries", parsed.data);
      setStatus("success");
      setPhotoPaths([]);
      reset({ ...EMPTY_VALUES, occurredAtLocal: nowAsLocalInputValue() });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("occurredAtLocal", { required: true })} />
      </Field>

      <Field label="Ubicación (opcional)">
        <Input placeholder="Casa, trabajo…" {...register("location")} />
      </Field>

      <Field label="Escala de Bristol (consistencia, opcional)">
        <Controller
          control={control}
          name="bristolScale"
          render={({ field }) => (
            <Select items={BRISTOL_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {BRISTOL_SCALE_VALUES.map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {BRISTOL_SCALE_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Urgencia (1-5, opcional)">
            <Input type="number" min={1} max={5} {...register("urgency")} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Esfuerzo (1-5, opcional)">
            <Input type="number" min={1} max={5} {...register("effort")} />
          </Field>
        </div>
      </div>

      <Field label="Vaciado completo (opcional)">
        <Controller
          control={control}
          name="feltComplete"
          render={({ field }) => (
            <Select items={FELT_COMPLETE_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                {FELT_COMPLETE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Color (opcional)">
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <Select items={COLOR_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                {STOOL_COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {STOOL_COLOR_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Duración en minutos (opcional)">
        <Input type="number" min={0} {...register("durationMinutes")} />
      </Field>

      <Field label="Notas (opcional)">
        <Textarea rows={2} {...register("notes")} />
      </Field>

      <Field label="Fotos (opcional)">
        <PhotoUploader pathPrefix="poop-entries" value={photoPaths} onChange={setPhotoPaths} />
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
