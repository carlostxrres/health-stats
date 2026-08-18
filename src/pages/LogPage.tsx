import { ENTRY_TYPES, type EntryTypeCode } from "@shared/entryTypes";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AiPromptBar } from "@/components/AiPromptBar";
import { BodyPhotoForm, type BodyPhotoInitialData } from "@/components/forms/BodyPhotoForm";
import {
  HealthEpisodeForm,
  type HealthEpisodeInitialData,
} from "@/components/forms/HealthEpisodeForm";
import { MealForm, type MealInitialData } from "@/components/forms/MealForm";
import { MedicationForm, type MedicationInitialData } from "@/components/forms/MedicationForm";
import { MetricEntryForm, type MetricEntryInitialData } from "@/components/forms/MetricEntryForm";
import type { UploadedPhotoFile } from "@/components/forms/PhotoUploader";
import {
  SleepSessionForm,
  type SleepSessionInitialData,
} from "@/components/forms/SleepSessionForm";
import { WorkoutForm, type WorkoutInitialData } from "@/components/forms/WorkoutForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api-client";

function renderForm(
  code: EntryTypeCode,
  entryId: string | undefined,
  initialData: unknown,
  onMealPhotosChange: (photos: UploadedPhotoFile[]) => void,
) {
  switch (code) {
    case "metric":
      return (
        <MetricEntryForm entryId={entryId} initialData={initialData as MetricEntryInitialData} />
      );
    case "meal":
      return (
        <MealForm
          entryId={entryId}
          initialData={initialData as MealInitialData}
          onPhotosChange={entryId ? undefined : onMealPhotosChange}
        />
      );
    case "medication":
      return (
        <MedicationForm entryId={entryId} initialData={initialData as MedicationInitialData} />
      );
    case "workout":
      return <WorkoutForm entryId={entryId} initialData={initialData as WorkoutInitialData} />;
    case "sleep":
      return (
        <SleepSessionForm entryId={entryId} initialData={initialData as SleepSessionInitialData} />
      );
    case "health_episode":
      return (
        <HealthEpisodeForm
          entryId={entryId}
          initialData={initialData as HealthEpisodeInitialData}
        />
      );
    case "body_photo":
      return <BodyPhotoForm entryId={entryId} initialData={initialData as BodyPhotoInitialData} />;
  }
}

export function LogPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<EntryTypeCode>("metric");
  const [initialData, setInitialData] = useState<unknown>(null);
  const [mealPhotos, setMealPhotos] = useState<UploadedPhotoFile[]>([]);
  // Bumped on every AI parse so the form remounts even when the AI picks the
  // same type that was already selected — `key={id ?? selected}` alone
  // wouldn't change in that case, and react-hook-form only reads
  // `defaultValues` on mount, so the new initialData would otherwise be
  // silently ignored.
  const [aiFillVersion, setAiFillVersion] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitialData(null);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    apiClient
      .get<{ type: EntryTypeCode; data: unknown }>(`/entries/${id}`)
      .then((res) => {
        setSelected(res.type);
        setInitialData(res.data);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [id]);

  const current = ENTRY_TYPES.find((t) => t.code === selected) ?? ENTRY_TYPES[0];

  function handleAiParsed(type: EntryTypeCode, data: unknown) {
    setSelected(type);
    setInitialData(data);
    setAiFillVersion((v) => v + 1);
    setMealPhotos([]);
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`${current.apiPath}?id=${id}`);
      navigate("/logs");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar.");
      setDeleteDialogOpen(false);
      setDeleting(false);
    }
  }

  return (
    <div className={`flex w-full max-w-lg flex-col gap-4 p-4 md:mx-auto ${!id ? "pb-24" : ""}`}>
      <Card>
        <CardHeader>
          <CardTitle>{id ? "Editar entrada" : "Nueva entrada"}</CardTitle>
          <CardDescription>{id ? current.label : "Elige qué quieres registrar."}</CardDescription>
        </CardHeader>
        {!id && (
          <CardContent>
            <Select
              items={ENTRY_TYPES.map((type) => ({ value: type.code, label: type.label }))}
              value={selected}
              onValueChange={(value) => {
                const next = value as EntryTypeCode;
                setSelected(next);
                if (next !== "meal") setMealPhotos([]);
              }}
            >
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
        )}
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Cargando…
          </CardContent>
        </Card>
      )}
      {loadError && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {loadError}
          </CardContent>
        </Card>
      )}
      {!loading && !loadError && (
        <Card key={`${id ?? selected}:${aiFillVersion}`}>
          <CardContent className="flex flex-col gap-4">
            {renderForm(current.code, id, initialData, setMealPhotos)}

            {id && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/logs")}
                  >
                    Cancelar
                  </Button>
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger
                      render={<Button type="button" variant="destructive" className="flex-1" />}
                    >
                      Eliminar entrada
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta entrada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={deleting}
                          onClick={handleDelete}
                        >
                          {deleting ? "Eliminando…" : "Eliminar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!id && (
        <AiPromptBar
          onParsed={handleAiParsed}
          images={selected === "meal" ? mealPhotos : undefined}
        />
      )}
    </div>
  );
}
