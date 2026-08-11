import {
  EPISODE_TYPE_LABELS,
  HEALTH_EPISODE_TYPES,
  healthEpisodeInputSchema,
} from "@shared/validation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
import { isoToLocalInputValue, localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

export type HealthEpisodeInitialData = {
  episodeType: string;
  title: string;
  description: string | null;
  startedAt: string;
  recoveredAt: string | null;
};

type FormValues = {
  episodeType: string;
  title: string;
  description: string;
  startedAtLocal: string;
  recoveredAt: string;
};

export function HealthEpisodeForm({
  entryId,
  initialData,
}: {
  entryId?: string;
  initialData?: HealthEpisodeInitialData;
}) {
  const navigate = useNavigate();
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
          episodeType: initialData.episodeType,
          title: initialData.title,
          description: initialData.description ?? "",
          startedAtLocal: isoToLocalInputValue(initialData.startedAt),
          recoveredAt: initialData.recoveredAt ?? "",
        }
      : {
          episodeType: HEALTH_EPISODE_TYPES[0],
          title: "",
          description: "",
          startedAtLocal: nowAsLocalInputValue(),
          recoveredAt: "",
        },
  });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = healthEpisodeInputSchema.safeParse({
      episodeType: values.episodeType,
      title: values.title,
      description: values.description || undefined,
      startedAt: localInputToIso(values.startedAtLocal),
      recoveredAt: values.recoveredAt || undefined,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      if (entryId) {
        await apiClient.patch(`/health-episodes/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/health-episodes", parsed.data);
      setStatus("success");
      reset({
        episodeType: values.episodeType,
        title: "",
        description: "",
        startedAtLocal: nowAsLocalInputValue(),
        recoveredAt: "",
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
          name="episodeType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEALTH_EPISODE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EPISODE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Título">
        <Input {...register("title", { required: true })} placeholder="Esguince de tobillo" />
      </Field>
      <Field label="Descripción (opcional)">
        <Textarea rows={2} {...register("description")} />
      </Field>
      <Field label="Fecha de inicio">
        <Input type="datetime-local" {...register("startedAtLocal", { required: true })} />
      </Field>
      <Field label="Fecha de recuperación (vacío = en curso)">
        <Input type="date" {...register("recoveredAt")} />
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
