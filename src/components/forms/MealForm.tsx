import { MEAL_TYPE_LABELS, MEAL_TYPES, mealInputSchema } from "@shared/validation";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
import { PhotoUploader, type UploadedPhotoFile } from "@/components/forms/PhotoUploader";
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

const MEAL_TYPE_ITEMS = MEAL_TYPES.map((type) => ({
  value: type,
  label: MEAL_TYPE_LABELS[type],
}));

export type MealInitialData = {
  mealType: string;
  title: string;
  description: string | null;
  eatenAt: string;
  location: string | null;
  ingredients: { ingredient: string; quantityValue: string | null; quantityUnit: string | null }[];
  photos: { storagePath: string }[];
};

type FormValues = {
  mealType: string;
  title: string;
  description: string;
  eatenAtLocal: string;
  location: string;
  ingredients: { ingredient: string; quantityValue: string; quantityUnit: string }[];
};

export function MealForm({
  entryId,
  initialData,
  onPhotosChange,
}: {
  entryId?: string;
  initialData?: MealInitialData;
  onPhotosChange?: (photos: UploadedPhotoFile[]) => void;
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
          mealType: initialData.mealType,
          title: initialData.title,
          description: initialData.description ?? "",
          eatenAtLocal: isoToLocalInputValue(initialData.eatenAt),
          location: initialData.location ?? "",
          ingredients: initialData.ingredients.map((i) => ({
            ingredient: i.ingredient,
            quantityValue: i.quantityValue ?? "",
            quantityUnit: i.quantityUnit ?? "",
          })),
        }
      : {
          mealType: MEAL_TYPES[0],
          title: "",
          description: "",
          eatenAtLocal: nowAsLocalInputValue(),
          location: "",
          ingredients: [],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = mealInputSchema.safeParse({
      mealType: values.mealType,
      title: values.title,
      description: values.description || undefined,
      eatenAt: localInputToIso(values.eatenAtLocal),
      location: values.location || undefined,
      ingredients: values.ingredients
        .filter((i) => i.ingredient.trim() !== "")
        .map((i) => ({
          ingredient: i.ingredient,
          quantityValue: i.quantityValue ? Number(i.quantityValue) : undefined,
          quantityUnit: i.quantityUnit || undefined,
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
        await apiClient.patch(`/meals/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/meals", parsed.data);
      setStatus("success");
      setPhotoPaths([]);
      onPhotosChange?.([]);
      reset({
        mealType: values.mealType,
        title: "",
        description: "",
        eatenAtLocal: nowAsLocalInputValue(),
        location: "",
        ingredients: [],
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
          name="mealType"
          render={({ field }) => (
            <Select items={MEAL_TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {MEAL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field label="Título">
        <Input {...register("title", { required: true })} placeholder="Ensalada de lentejas" />
      </Field>
      <Field label="Descripción (opcional)">
        <Textarea rows={2} {...register("description")} />
      </Field>
      <Field label="Fecha y hora">
        <Input type="datetime-local" {...register("eatenAtLocal", { required: true })} />
      </Field>
      <Field label="Lugar (opcional)">
        <Input {...register("location")} />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Ingredientes</span>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Ingrediente"
              {...register(`ingredients.${index}.ingredient` as const)}
            />
            <Input
              className="w-20"
              placeholder="Cant."
              {...register(`ingredients.${index}.quantityValue` as const)}
            />
            <Input
              className="w-20"
              placeholder="Unidad"
              {...register(`ingredients.${index}.quantityUnit` as const)}
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ ingredient: "", quantityValue: "", quantityUnit: "" })}
        >
          <Plus className="size-3.5" /> Añadir ingrediente
        </Button>
      </div>

      <Field label="Fotos (opcional)">
        <PhotoUploader
          pathPrefix="meals"
          value={photoPaths}
          onChange={setPhotoPaths}
          onFilesChange={onPhotosChange}
        />
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
