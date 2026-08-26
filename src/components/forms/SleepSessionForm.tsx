import {
  QUALITY_RATING_INFO,
  QUALITY_RATING_QUESTION,
  QUALITY_RATING_SCALE_NOTE,
  QUALITY_RATING_VALUES,
  sleepSessionInputSchema,
  WAKE_FEELING_INFO,
  WAKE_FEELING_QUESTION,
  WAKE_FEELING_SCALE_NOTE,
  WAKE_FEELING_VALUES,
} from "@shared/validation";
import { Info } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Field } from "@/components/forms/Field";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiClient } from "@/lib/api-client";
import { isoToLocalInputValue, localInputToIso, nowAsLocalInputValue } from "@/lib/datetime";
import { confirmIfFuture } from "@/lib/futureTime";

function ScaleField({
  id,
  question,
  scaleNote,
  values,
  info,
  value,
  onValueChange,
}: {
  id: string;
  question: string;
  scaleNote: string;
  values: readonly number[];
  info: Record<number, { name: string; description: string }>;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label>{question}</Label>
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Ver escala completa"
              />
            }
          >
            <Info className="size-4" />
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <PopoverHeader>
              <PopoverTitle>{question}</PopoverTitle>
              <PopoverDescription>{scaleNote}</PopoverDescription>
            </PopoverHeader>
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto text-sm">
              {values.map((v) => (
                <li key={v}>
                  <span className="font-medium">
                    {v} — {info[v].name}
                  </span>
                  <p className="text-muted-foreground">{info[v].description}</p>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <RadioGroup value={value} onValueChange={onValueChange} className="flex flex-col gap-2">
        {values.map((v) => (
          <label key={v} htmlFor={`${id}-${v}`} className="flex items-center gap-2 text-sm">
            <RadioGroupItem id={`${id}-${v}`} value={String(v)} />
            {v} — {info[v].name}
          </label>
        ))}
      </RadioGroup>
      {value && <p className="text-sm text-muted-foreground">{info[Number(value)].description}</p>}
    </div>
  );
}

export type SleepSessionInitialData = {
  wentToBedAt: string;
  wokeUpAt: string;
  isNap: boolean;
  qualityRating: number | null;
  wakeFeeling: number | null;
  notes: string | null;
};

type FormValues = {
  wentToBedAtLocal: string;
  wokeUpAtLocal: string;
  isNap: boolean;
  qualityRating: string;
  wakeFeeling: string;
  notes: string;
};

export function SleepSessionForm({
  entryId,
  initialData,
}: {
  entryId?: string;
  initialData?: SleepSessionInitialData;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
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
          wentToBedAtLocal: isoToLocalInputValue(initialData.wentToBedAt),
          wokeUpAtLocal: isoToLocalInputValue(initialData.wokeUpAt),
          isNap: initialData.isNap,
          qualityRating: initialData.qualityRating != null ? String(initialData.qualityRating) : "",
          wakeFeeling: initialData.wakeFeeling != null ? String(initialData.wakeFeeling) : "",
          notes: initialData.notes ?? "",
        }
      : {
          wentToBedAtLocal: nowAsLocalInputValue(),
          wokeUpAtLocal: nowAsLocalInputValue(),
          isNap: false,
          qualityRating: "",
          wakeFeeling: "",
          notes: "",
        },
  });

  async function onSubmit(values: FormValues) {
    setStatus("idle");
    setErrorMessage(null);

    const parsed = sleepSessionInputSchema.safeParse({
      wentToBedAt: localInputToIso(values.wentToBedAtLocal),
      wokeUpAt: localInputToIso(values.wokeUpAtLocal),
      isNap: values.isNap,
      qualityRating: values.qualityRating ? Number(values.qualityRating) : undefined,
      wakeFeeling: values.wakeFeeling ? Number(values.wakeFeeling) : undefined,
      notes: values.notes || undefined,
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    if (!(await confirmIfFuture(confirm, parsed.data.wokeUpAt))) return;

    try {
      if (entryId) {
        await apiClient.patch(`/sleep-sessions/${entryId}`, parsed.data);
        navigate("/logs");
        return;
      }
      await apiClient.post("/sleep-sessions", parsed.data);
      setStatus("success");
      reset({
        wentToBedAtLocal: nowAsLocalInputValue(),
        wokeUpAtLocal: nowAsLocalInputValue(),
        isNap: false,
        qualityRating: "",
        wakeFeeling: "",
        notes: "",
      });
    } catch (err) {
      if (err instanceof Error && err.message === "OVERLAP") {
        setOverlapDialogOpen(true);
        return;
      }
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Hora de acostarse">
        <Input type="datetime-local" {...register("wentToBedAtLocal", { required: true })} />
      </Field>
      <Field label="Hora de levantarse">
        <Input type="datetime-local" {...register("wokeUpAtLocal", { required: true })} />
      </Field>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="isNap"
          render={({ field }) => (
            <Checkbox
              id="isNap"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
            />
          )}
        />
        <label htmlFor="isNap" className="text-sm">
          Es una siesta
        </label>
      </div>

      <Controller
        control={control}
        name="qualityRating"
        render={({ field }) => (
          <ScaleField
            id="quality-rating"
            question={QUALITY_RATING_QUESTION}
            scaleNote={QUALITY_RATING_SCALE_NOTE}
            values={QUALITY_RATING_VALUES}
            info={QUALITY_RATING_INFO}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="wakeFeeling"
        render={({ field }) => (
          <ScaleField
            id="wake-feeling"
            question={WAKE_FEELING_QUESTION}
            scaleNote={WAKE_FEELING_SCALE_NOTE}
            values={WAKE_FEELING_VALUES}
            info={WAKE_FEELING_INFO}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />
      <Field label="Notas (opcional)">
        <Textarea rows={2} {...register("notes")} />
      </Field>

      {status === "error" && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      {status === "success" && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : entryId ? "Guardar cambios" : "Guardar"}
      </Button>

      {dialog}

      <AlertDialog open={overlapDialogOpen} onOpenChange={setOverlapDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este periodo se solapa con otro existente</AlertDialogTitle>
            <AlertDialogDescription>
              Ya tienes un registro de sueño que se solapa con este horario. Ajusta la hora de
              acostarte o de levantarte para que no coincidan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOverlapDialogOpen(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
