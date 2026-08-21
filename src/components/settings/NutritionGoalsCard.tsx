import type { NutritionGoal } from "@shared/types";
import { NUTRITION_GOAL_SUBJECT_TYPE_LABELS } from "@shared/validation/nutritionGoals";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiClient } from "@/lib/api-client";
import { NutritionGoalForm } from "./NutritionGoalForm";

export function NutritionGoalsCard() {
  const [goals, setGoals] = useState<NutritionGoal[] | null>(null);
  const [sheetGoal, setSheetGoal] = useState<NutritionGoal | "new" | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    try {
      const rows = await apiClient.get<NutritionGoal[]>("/settings?resource=nutrition-goals");
      setGoals(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar los objetivos.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(goal: NutritionGoal, active: boolean) {
    setGoals((prev) => prev?.map((g) => (g.id === goal.id ? { ...g, active } : g)) ?? prev);
    try {
      await apiClient.patch(`/settings?resource=nutrition-goals&id=${goal.id}`, { active });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar.");
      await load();
    }
  }

  async function remove(goal: NutritionGoal) {
    const confirmed = await confirm({
      title: "¿Eliminar este objetivo?",
      description: `Se eliminará "${goal.subjectLabel}" y todo su historial de cumplimiento. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/settings?resource=nutrition-goals&id=${goal.id}`);
      toast.success("Objetivo eliminado.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar.");
    }
  }

  async function move(goal: NutritionGoal, direction: -1 | 1) {
    if (!goals) return;
    const index = goals.findIndex((g) => g.id === goal.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= goals.length) return;

    const reordered = [...goals];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setGoals(reordered);

    try {
      await apiClient.patch("/settings?resource=nutrition-goals&action=reorder", {
        ids: reordered.map((g) => g.id),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al reordenar.");
      await load();
    }
  }

  function closeSheet() {
    setSheetGoal(null);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Objetivos nutricionales</CardTitle>
          <CardDescription>
            Macronutrientes, micronutrientes, ingredientes y categorías a cumplir cada día o semana.
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setSheetGoal("new")}>
          <Plus className="size-4" /> Nuevo
        </Button>
      </CardHeader>
      <CardContent>
        {goals === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has definido ningún objetivo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sujeto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Límite</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal, index) => (
                <TableRow key={goal.id}>
                  <TableCell className="whitespace-normal font-medium">
                    {goal.subjectLabel}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {
                        NUTRITION_GOAL_SUBJECT_TYPE_LABELS[
                          goal.subjectType as keyof typeof NUTRITION_GOAL_SUBJECT_TYPE_LABELS
                        ]
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {goal.limitType === "min" ? "mín." : "máx."} {goal.targetQuantity} {goal.unit}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {goal.timespan === "daily" ? "Diario" : "Semanal"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={goal.active}
                      onCheckedChange={(checked) => toggleActive(goal, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Subir"
                        disabled={index === 0}
                        onClick={() => move(goal, -1)}
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Bajar"
                        disabled={index === goals.length - 1}
                        onClick={() => move(goal, 1)}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar"
                        onClick={() => setSheetGoal(goal)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar"
                        onClick={() => remove(goal)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Sheet open={sheetGoal !== null} onOpenChange={(open) => !open && setSheetGoal(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetGoal === "new" ? "Nuevo objetivo" : "Editar objetivo"}</SheetTitle>
          </SheetHeader>
          {sheetGoal !== null && (
            <NutritionGoalForm
              goal={sheetGoal === "new" ? undefined : sheetGoal}
              onSaved={closeSheet}
            />
          )}
        </SheetContent>
      </Sheet>
      {dialog}
    </Card>
  );
}
