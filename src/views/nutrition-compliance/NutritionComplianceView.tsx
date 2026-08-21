import type { NutritionComplianceRow, NutritionGoal } from "@shared/types";
import {
  NUTRITION_GOAL_SUBJECT_TYPE_LABELS,
  NUTRITION_GOAL_SUBJECT_TYPES,
} from "@shared/validation/nutritionGoals";
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { formatDayTick, localClock } from "@/lib/localTime";
import { NutritionGoalProgressCard } from "./NutritionGoalProgressCard";
import {
  defaultPeriodKey,
  enumerateHistoryPeriods,
  isCurrentPeriod,
  periodLabel,
  stepPeriodKey,
  type Timespan,
} from "./period";

const chartConfig = {
  avgPercent: { label: "Cumplimiento medio", color: "var(--chart-highlight)" },
} satisfies ChartConfig;

export function NutritionComplianceView() {
  const [tab, setTab] = useState<Timespan>("daily");

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Cumplimiento</h1>
        <p className="text-sm text-muted-foreground">
          Objetivos nutricionales, día a día y semana a semana.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Timespan)}>
        <TabsList>
          <TabsTrigger value="daily">Diario</TabsTrigger>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <ComplianceTimespanPanel timespan="daily" />
        </TabsContent>
        <TabsContent value="weekly">
          <ComplianceTimespanPanel timespan="weekly" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComplianceTimespanPanel({ timespan }: { timespan: Timespan }) {
  const { session } = useAuth();
  const [periodKey, setPeriodKey] = useState(() => defaultPeriodKey(timespan));
  const [goals, setGoals] = useState<NutritionGoal[] | null>(null);
  const [history, setHistory] = useState<NutritionComplianceRow[] | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [historyRefreshNonce, setHistoryRefreshNonce] = useState(0);
  const [manualRefreshNonce, setManualRefreshNonce] = useState(0);

  const isCurrent = isCurrentPeriod(timespan, periodKey);

  useEffect(() => {
    setPeriodKey(defaultPeriodKey(timespan));
  }, [timespan]);

  useEffect(() => {
    apiClient
      .get<NutritionGoal[]>("/settings?resource=nutrition-goals")
      .then((rows) => setGoals(rows.filter((g) => g.timespan === timespan && g.active)))
      .catch(() => setGoals([]));
  }, [timespan]);

  const historyPeriods = useMemo(
    () => enumerateHistoryPeriods(timespan, periodKey),
    [timespan, periodKey],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: historyRefreshNonce isn't read in the body — bumping it after a successful evaluation deliberately re-fetches the now-updated cached rows.
  useEffect(() => {
    let cancelled = false;
    const from = historyPeriods[0];
    const to = historyPeriods[historyPeriods.length - 1];
    apiClient
      .get<NutritionComplianceRow[]>(
        `/entries?resource=nutrition-compliance&timespan=${timespan}&from=${from}&to=${to}`,
      )
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [timespan, historyPeriods, historyRefreshNonce]);

  // Evaluation is a write (it caches AI results in the DB), so — like every
  // other mutation in this app — it needs a session, even though this view
  // itself is a public read route. Logged-out visitors just see whatever's
  // already cached, with no attempt to trigger a fresh evaluation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: manualRefreshNonce isn't read in the body — bumping it deliberately re-triggers this evaluation for the "Actualizar" button.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setEvaluating(true);
    setEvaluateError(null);
    apiClient
      .post("/ai/parse?kind=nutritionCompliance", {
        timespan,
        periodKey,
        now: new Date().toISOString(),
      })
      .then(() => {
        if (cancelled) return;
        setHistoryRefreshNonce((n) => n + 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setEvaluateError(err instanceof Error ? err.message : "Error al evaluar el cumplimiento.");
      })
      .finally(() => {
        if (!cancelled) setEvaluating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, timespan, periodKey, manualRefreshNonce]);

  const chartData = useMemo(() => {
    const byPeriod = new Map<string, number[]>();
    for (const row of history ?? []) {
      const list = byPeriod.get(row.periodKey) ?? [];
      list.push(Math.min(100, Math.max(0, row.percentComplete)));
      byPeriod.set(row.periodKey, list);
    }
    return historyPeriods.map((key) => {
      const values = byPeriod.get(key);
      return {
        period: key,
        avgPercent:
          values && values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
      };
    });
  }, [history, historyPeriods]);

  const currentPeriodEvaluations = useMemo(
    () => (history ?? []).filter((row) => row.periodKey === periodKey),
    [history, periodKey],
  );

  const evalByGoal = useMemo(
    () => new Map(currentPeriodEvaluations.map((row) => [row.goalId, row])),
    [currentPeriodEvaluations],
  );

  const lastEvaluatedAt = currentPeriodEvaluations.reduce<string | null>(
    (latest, row) => (!latest || row.evaluatedAt > latest ? row.evaluatedAt : latest),
    null,
  );

  const groupedGoals = useMemo(
    () =>
      NUTRITION_GOAL_SUBJECT_TYPES.map((type) => ({
        type,
        goals: (goals ?? []).filter((g) => g.subjectType === type),
      })).filter((group) => group.goals.length > 0),
    [goals],
  );

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Periodo anterior"
            onClick={() => setPeriodKey((key) => stepPeriodKey(timespan, key, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-40 text-center text-sm">{periodLabel(timespan, periodKey)}</span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Periodo siguiente"
            disabled={isCurrent}
            onClick={() => setPeriodKey((key) => stepPeriodKey(timespan, key, 1))}
          >
            <ChevronRightIcon />
          </Button>
          {!isCurrent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPeriodKey(defaultPeriodKey(timespan))}
            >
              {timespan === "daily" ? "Hoy" : "Esta semana"}
            </Button>
          )}
        </div>
        {isCurrent && session && (
          <Button
            variant="ghost"
            size="sm"
            disabled={evaluating}
            onClick={() => setManualRefreshNonce((n) => n + 1)}
          >
            <RefreshCwIcon className="size-4" /> Actualizar
          </Button>
        )}
      </div>

      {!session && (
        <p className="text-xs text-muted-foreground">
          Inicia sesión para evaluar objetivos nuevos — de momento se muestra solo lo ya evaluado.
        </p>
      )}

      {session && lastEvaluatedAt && (
        <p className="text-xs text-muted-foreground">
          Última evaluación: {localClock(lastEvaluatedAt)}
        </p>
      )}

      {evaluateError && <p className="text-sm text-destructive">{evaluateError}</p>}

      {goals !== null && goals.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin objetivos {timespan === "daily" ? "diarios" : "semanales"}</EmptyTitle>
            <EmptyDescription>Defínelos en Ajustes → Objetivos nutricionales.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {goals !== null && goals.length > 0 && (
        <div className="flex flex-col gap-5">
          {groupedGoals.map((group) => (
            <div key={group.type} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {NUTRITION_GOAL_SUBJECT_TYPE_LABELS[group.type]}
              </h2>
              <div className="flex flex-col gap-2">
                {group.goals.map((goal) => (
                  <NutritionGoalProgressCard
                    key={goal.id}
                    goal={goal}
                    evaluation={evalByGoal.get(goal.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {history !== null && history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Tendencia</h2>
          <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
            <LineChart data={chartData} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickFormatter={formatDayTick}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="avgPercent"
                stroke="var(--color-avgPercent)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
