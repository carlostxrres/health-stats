import { useState } from "react";
import { BodyPhotoForm } from "@/components/forms/BodyPhotoForm";
import { HealthEpisodeForm } from "@/components/forms/HealthEpisodeForm";
import { MealForm } from "@/components/forms/MealForm";
import { MedicationForm } from "@/components/forms/MedicationForm";
import { MetricEntryForm } from "@/components/forms/MetricEntryForm";
import { SleepSessionForm } from "@/components/forms/SleepSessionForm";
import { WorkoutForm } from "@/components/forms/WorkoutForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ENTRY_TYPES = [
  {
    code: "metric",
    label: "Indicador (peso, perímetro, biomarcador, pasos, ánimo…)",
    render: () => <MetricEntryForm />,
  },
  { code: "meal", label: "Comida", render: () => <MealForm /> },
  { code: "medication", label: "Medicamento / suplemento", render: () => <MedicationForm /> },
  { code: "workout", label: "Entrenamiento / deporte", render: () => <WorkoutForm /> },
  { code: "sleep", label: "Sueño", render: () => <SleepSessionForm /> },
  { code: "health_episode", label: "Lesión / enfermedad", render: () => <HealthEpisodeForm /> },
  { code: "body_photo", label: "Foto corporal", render: () => <BodyPhotoForm /> },
] as const;

export function NewEntryPage() {
  const [selected, setSelected] = useState<(typeof ENTRY_TYPES)[number]["code"]>("metric");
  const current = ENTRY_TYPES.find((t) => t.code === selected) ?? ENTRY_TYPES[0];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Nueva entrada</CardTitle>
          <CardDescription>Elige qué quieres registrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selected} onValueChange={(value) => setSelected(value as typeof selected)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((type) => (
                <SelectItem key={type.code} value={type.code}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card key={current.code}>
        <CardContent>{current.render()}</CardContent>
      </Card>
    </div>
  );
}
