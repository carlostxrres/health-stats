import { bodyPhotoInputSchema } from "@shared/validation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/forms/Field";
import { PhotoUploader } from "@/components/forms/PhotoUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";

type FormValues = { takenAtLocal: string; description: string };

export function BodyPhotoForm() {
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { takenAtLocal: nowAsLocalInputValue(), description: "" },
  });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = bodyPhotoInputSchema.safeParse({
      takenAt: localInputToIso(values.takenAtLocal),
      description: values.description || undefined,
      photoStoragePaths: photoPaths,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Añade al menos una foto.");
      return;
    }

    try {
      await apiClient.post("/body-photos", parsed.data);
      setStatus("success");
      setPhotoPaths([]);
      reset({ takenAtLocal: nowAsLocalInputValue(), description: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("takenAtLocal", { required: true })} />
      </Field>
      <Field label="Descripción (opcional)">
        <Textarea rows={2} {...register("description")} />
      </Field>
      <Field label="Fotos">
        <PhotoUploader pathPrefix="body-photos" value={photoPaths} onChange={setPhotoPaths} />
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
