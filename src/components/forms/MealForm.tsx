import { MEAL_TYPE_LABELS, MEAL_TYPES, mealInputSchema } from "@shared/validation";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
import { PhotoUploader, type UploadedPhotoFile } from "@/components/forms/PhotoUploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiClient } from "@/lib/api-client";
import { isoToLocalInputValue, localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";
import { confirmIfFuture } from "@/lib/futureTime";

const MEAL_TYPE_ITEMS = MEAL_TYPES.map((type) => ({
  value: type,
  label: MEAL_TYPE_LABELS[type],
}));

// Reasonable local-time windows (minutes since midnight) per meal type,
// outside of which we ask the user to double-check — snacks have none,
// they can happen whenever.
const MEAL_TIME_WINDOWS: Partial<Record<(typeof MEAL_TYPES)[number], [number, number]>> = {
  breakfast: [5 * 60, 11 * 60],
  lunch: [12 * 60, 16 * 60],
  dinner: [19 * 60, 23 * 60],
};

function isOutsideMealWindow(mealType: string, localValue: string): boolean {
  const window = MEAL_TIME_WINDOWS[mealType as keyof typeof MEAL_TIME_WINDOWS];
  if (!window) return false;
  const [hours, minutes] = localValue.slice(11, 16).split(":").map(Number);
  const minuteOfDay = hours * 60 + minutes;
  return minuteOfDay < window[0] || minuteOfDay > window[1];
}

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
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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

    if (isOutsideMealWindow(values.mealType, values.eatenAtLocal)) {
      const label = MEAL_TYPE_LABELS[values.mealType as (typeof MEAL_TYPES)[number]];
      const time = values.eatenAtLocal.slice(11, 16);
      const confirmed = await confirm({
        title: `¿Seguro que es ${label.toLowerCase()}?`,
        description: `Lo has registrado a las ${time}, fuera del horario habitual de ${label.toLowerCase()}. ¿Confirmas el tipo?`,
        confirmLabel: "Sí, es correcto",
        cancelLabel: "Revisar",
      });
      if (!confirmed) return;
    }

    if (!(await confirmIfFuture(confirm, parsed.data.eatenAt))) return;

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
      if (err instanceof Error && err.message === "DUPLICATE_MEAL_TYPE") {
        setDuplicateDialogOpen(true);
        return;
      }
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

      {dialog}

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ya tienes esta comida registrada hoy</AlertDialogTitle>
            <AlertDialogDescription>
              Solo puede haber un desayuno, un almuerzo y una cena por día. Cambia el tipo o la
              fecha para guardar este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateDialogOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
