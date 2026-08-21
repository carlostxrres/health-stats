import { ENTRY_TYPES, type EntryTypeCode } from "@shared/entryTypes";
import { settingsUpdateSchema } from "@shared/validation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { Field } from "@/components/forms/Field";
import { NutritionGoalsCard } from "@/components/settings/NutritionGoalsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { type AppSettings, useSettings } from "@/hooks/useSettings";
import { apiClient } from "@/lib/api-client";
import { chartHighlightColor } from "@/lib/chartHue";
import { COMMON_TIME_ZONES } from "@/lib/timezones";

type FormValues = {
  displayName: string;
  heightCm: string;
  birthDate: string;
  timeZone: string;
  weekStartDay: string;
  chartHue: number;
  sleepGoalHours: string;
  sleepGoalMinutes: string;
  bedtimeGoal: string;
  wakeTimeGoal: string;
  weightGoalMinKg: string;
  weightGoalMaxKg: string;
  privateEntryTypes: EntryTypeCode[];
};

const EMPTY_DEFAULTS: FormValues = {
  displayName: "",
  heightCm: "",
  birthDate: "",
  timeZone: "Europe/Madrid",
  weekStartDay: "1",
  chartHue: 30,
  sleepGoalHours: "",
  sleepGoalMinutes: "",
  bedtimeGoal: "",
  wakeTimeGoal: "",
  weightGoalMinKg: "",
  weightGoalMaxKg: "",
  privateEntryTypes: [],
};

function buildDefaults(settings: AppSettings): FormValues {
  const totalMinutes = settings.sleepGoalMinutes;
  return {
    displayName: settings.displayName ?? "",
    heightCm: settings.heightCm ?? "",
    birthDate: settings.birthDate ?? "",
    timeZone: settings.timeZone,
    weekStartDay: String(settings.weekStartDay),
    chartHue: settings.chartHue,
    sleepGoalHours: totalMinutes != null ? String(Math.floor(totalMinutes / 60)) : "",
    sleepGoalMinutes: totalMinutes != null ? String(totalMinutes % 60) : "",
    bedtimeGoal: settings.bedtimeGoal?.slice(0, 5) ?? "",
    wakeTimeGoal: settings.wakeTimeGoal?.slice(0, 5) ?? "",
    weightGoalMinKg: settings.weightGoalMinKg ?? "",
    weightGoalMaxKg: settings.weightGoalMaxKg ?? "",
    privateEntryTypes: settings.privateEntryTypes as EntryTypeCode[],
  };
}

export function SettingsPage() {
  const { settings, loading, refetch } = useSettings();
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY_DEFAULTS });

  useEffect(() => {
    if (settings) reset(buildDefaults(settings));
  }, [settings, reset]);

  const chartHue = watch("chartHue");

  async function onSubmit(values: FormValues) {
    const hours = values.sleepGoalHours ? Number(values.sleepGoalHours) : null;
    const minutes = values.sleepGoalMinutes ? Number(values.sleepGoalMinutes) : null;
    const sleepGoalMinutes =
      hours !== null || minutes !== null ? (hours ?? 0) * 60 + (minutes ?? 0) : null;

    const parsed = settingsUpdateSchema.safeParse({
      displayName: values.displayName.trim() || null,
      heightCm: values.heightCm ? Number(values.heightCm) : null,
      birthDate: values.birthDate || null,
      timeZone: values.timeZone,
      weekStartDay: Number(values.weekStartDay),
      chartHue: values.chartHue,
      sleepGoalMinutes,
      bedtimeGoal: values.bedtimeGoal || null,
      wakeTimeGoal: values.wakeTimeGoal || null,
      weightGoalMinKg: values.weightGoalMinKg ? Number(values.weightGoalMinKg) : null,
      weightGoalMaxKg: values.weightGoalMaxKg ? Number(values.weightGoalMaxKg) : null,
      privateEntryTypes: values.privateEntryTypes,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    try {
      await apiClient.patch("/settings", parsed.data);
      await refetch();
      toast.success("Ajustes guardados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  if (loading && !settings) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-6 p-4 md:mx-auto">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-6 p-4 md:mx-auto"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <h1 className="font-heading text-lg font-medium">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Preferencias personales de la app.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Cómo apareces en el feed y tus datos personales.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Nombre para mostrar">
            <Input placeholder="Carlos" {...register("displayName")} />
          </Field>
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Altura (cm)">
                <Input type="number" step="0.1" min="0" {...register("heightCm")} />
              </Field>
            </div>
            <div className="flex-1">
              <Controller
                control={control}
                name="birthDate"
                render={({ field }) => (
                  <DatePickerField
                    label="Fecha de nacimiento"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional</CardTitle>
          <CardDescription>Zona horaria y calendario.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Zona horaria">
            <Controller
              control={control}
              name="timeZone"
              render={({ field }) => (
                <Select
                  items={COMMON_TIME_ZONES}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIME_ZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Primer día de la semana">
            <Controller
              control={control}
              name="weekStartDay"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-6"
                >
                  <label htmlFor="week-start-monday" className="flex items-center gap-2 text-sm">
                    <RadioGroupItem id="week-start-monday" value="1" /> Lunes
                  </label>
                  <label htmlFor="week-start-sunday" className="flex items-center gap-2 text-sm">
                    <RadioGroupItem id="week-start-sunday" value="0" /> Domingo
                  </label>
                </RadioGroup>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Color base de los gráficos destacados.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={control}
            name="chartHue"
            render={({ field }) => (
              <Field label={`Tono (${field.value}°)`}>
                <Slider
                  min={0}
                  max={359}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(Array.isArray(value) ? value[0] : value)}
                />
              </Field>
            )}
          />
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="h-8 flex-1 rounded-md"
                style={{ background: chartHighlightColor(chartHue, index) }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos</CardTitle>
          <CardDescription>Metas personales.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Horas de sueño objetivo">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="24"
                className="w-20"
                {...register("sleepGoalHours")}
              />
              <span className="text-sm text-muted-foreground">h</span>
              <Input
                type="number"
                min="0"
                max="59"
                className="w-20"
                {...register("sleepGoalMinutes")}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </Field>
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Hora de acostarme">
                <Input type="time" {...register("bedtimeGoal")} />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Hora de levantarme">
                <Input type="time" {...register("wakeTimeGoal")} />
              </Field>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Peso mínimo (kg)">
                <Input type="number" step="0.1" min="0" {...register("weightGoalMinKg")} />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Peso máximo (kg)">
                <Input type="number" step="0.1" min="0" {...register("weightGoalMaxKg")} />
              </Field>
            </div>
          </div>
        </CardContent>
      </Card>

      <NutritionGoalsCard />

      <Card>
        <CardHeader>
          <CardTitle>Privacidad</CardTitle>
          <CardDescription>Tipos de entrada ocultos si no has iniciado sesión.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={control}
            name="privateEntryTypes"
            render={({ field }) => (
              <div className="flex flex-col gap-3">
                {ENTRY_TYPES.map((type) => (
                  <label
                    key={type.code}
                    htmlFor={`private-${type.code}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={`private-${type.code}`}
                      checked={field.value.includes(type.code)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, type.code]
                            : field.value.filter((code) => code !== type.code),
                        )
                      }
                    />
                    {type.shortLabel}
                  </label>
                ))}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t bg-background/95 px-4 py-4 backdrop-blur">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
