import { medicationInputSchema } from "@shared/validation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiClient } from "@/lib/api-client";
import { isoToLocalInputValue, localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";
import { confirmIfFuture } from "@/lib/futureTime";

export type MedicationInitialData = {
  title: string;
  takenAt: string;
  location: string | null;
};

type FormValues = { title: string; takenAtLocal: string; location: string };

export function MedicationForm({
  entryId,
  initialData,
}: {
  entryId?: string;
  initialData?: MedicationInitialData;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: initialData
      ? {
          title: initialData.title,
          takenAtLocal: isoToLocalInputValue(initialData.takenAt),
          location: initialData.location ?? "",
        }
      : { title: "", takenAtLocal: nowAsLocalInputValue(), location: "" },
  });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = medicationInputSchema.safeParse({
      title: values.title,
      takenAt: localInputToIso(values.takenAtLocal),
      location: values.location || undefined,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    if (!(await confirmIfFuture(confirm, parsed.data.takenAt))) return;

    try {
      if (entryId) {
        await apiClient.patch(`/medications/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/medications", parsed.data);
      setStatus("success");
      reset({ title: "", takenAtLocal: nowAsLocalInputValue(), location: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Título">
        <Input {...register("title", { required: true })} placeholder="Ibuprofeno 600mg" />
      </Field>
      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("takenAtLocal", { required: true })} />
      </Field>
      <Field label="Lugar (opcional)">
        <Input {...register("location")} />
      </Field>

      {status === "error" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {status === "success" && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : entryId ? "Guardar cambios" : "Guardar"}
      </Button>

      {dialog}
    </form>
  );
}
