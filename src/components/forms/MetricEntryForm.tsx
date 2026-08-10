import {
  BODY_SITE_LABELS,
  BODY_SITE_METRIC_CODES,
  BODY_SITES,
  COMPOSITE_METRIC_CODES,
  METRIC_DEFINITIONS,
} from "@shared/metricCatalog";
import { metricEntryInputSchema } from "@shared/validation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/forms/Field";
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
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

type FormValues = {
  metricType: string;
  value: string;
  valueSecondary: string;
  bodySite: string;
  recordedAtLocal: string;
  notes: string;
};

export function MetricEntryForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      metricType: METRIC_DEFINITIONS[0].code,
      value: "",
      valueSecondary: "",
      bodySite: "",
      recordedAtLocal: nowAsLocalInputValue(),
      notes: "",
    },
  });

  const metricType = watch("metricType");
  const isComposite = (COMPOSITE_METRIC_CODES as string[]).includes(metricType);
  const needsBodySite = (BODY_SITE_METRIC_CODES as string[]).includes(metricType);
  const definition = METRIC_DEFINITIONS.find((m) => m.code === metricType);

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = metricEntryInputSchema.safeParse({
      metricType: values.metricType,
      value: Number(values.value),
      valueSecondary: values.valueSecondary ? Number(values.valueSecondary) : undefined,
      bodySite: values.bodySite || undefined,
      recordedAt: localInputToIso(values.recordedAtLocal),
      notes: values.notes || undefined,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      await apiClient.post("/metrics", parsed.data);
      setStatus("success");
      reset({
        metricType: values.metricType,
        value: "",
        valueSecondary: "",
        bodySite: "",
        recordedAtLocal: nowAsLocalInputValue(),
        notes: "",
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Indicador">
        <Controller
          control={control}
          name="metricType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_DEFINITIONS.map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field
            label={`Valor${definition ? ` (${definition.defaultUnit})` : ""}`}
            error={errors.value?.message}
          >
            <Input type="number" step="any" {...register("value", { required: true })} />
          </Field>
        </div>
        {isComposite && (
          <div className="flex-1">
            <Field label="Diastólica (mmHg)">
              <Input type="number" step="any" {...register("valueSecondary")} />
            </Field>
          </div>
        )}
      </div>

      {needsBodySite && (
        <Field label="Zona corporal">
          <Controller
            control={control}
            name="bodySite"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una zona" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_SITES.map((site) => (
                    <SelectItem key={site} value={site}>
                      {BODY_SITE_LABELS[site]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}

      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("recordedAtLocal", { required: true })} />
      </Field>

      <Field label="Notas (opcional)">
        <Textarea rows={2} {...register("notes")} />
      </Field>

      {status === "error" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {status === "success" && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
