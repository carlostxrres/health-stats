import type { MetricEntry } from "@shared/types";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { useSettings } from "@/hooks/useSettings";
import { apiClient } from "@/lib/api-client";
import { bmiWeightThresholds } from "@/lib/bmi";
import { loess } from "@/lib/loess";

type WeightPoint = { x: number; y: number };

const chartConfig: ChartConfig = {
  weight: { label: "Peso", color: "var(--chart-1)" },
  trend: { label: "Tendencia", color: "var(--chart-2)" },
} satisfies ChartConfig;

// Fixed semantic colors (blue/green/amber/red), independent of the user's
// chosen chart hue — these bands communicate a real health-risk gradient, so
// "obesidad" must stay reliably red-ish regardless of cosmetic preference.
const BMI_BAND_COLORS = {
  underweight: "oklch(0.7 0.15 250)",
  normal: "oklch(0.7 0.15 145)",
  overweight: "oklch(0.75 0.15 80)",
  obese: "oklch(0.65 0.2 25)",
} as const;

function formatAxisDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Rounds a rough day-step up to a "nice" 1/2/5/10-times-a-power-of-ten value,
// the same trick chart libraries use for picking readable tick intervals.
function niceStepDays(roughStepDays: number) {
  const magnitude = 10 ** Math.floor(Math.log10(roughStepDays));
  const residual = roughStepDays / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

// recharts' own "nice tick" algorithm rounds to nice numbers in raw
// milliseconds, not calendar days, so ticks don't land on day boundaries and
// look unevenly spaced once formatted as dates. Computing day-aligned ticks
// ourselves keeps the axis genuinely proportional to time.
function getNiceDayTicks(minX: number, maxX: number, targetCount = 5): number[] {
  if (minX >= maxX) return [minX];

  const totalDays = (maxX - minX) / DAY_MS;
  const roughStepDays = Math.max(1, totalDays / (targetCount - 1));
  const stepMs = Math.max(1, Math.round(niceStepDays(roughStepDays))) * DAY_MS;

  const ticks: number[] = [];
  let tick = startOfLocalDay(minX);
  if (tick < minX) tick += stepMs;
  for (; tick <= maxX; tick += stepMs) {
    ticks.push(tick);
  }
  return ticks.length > 0 ? ticks : [minX, maxX];
}

function formatTooltipDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-ES", {
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function WeightView() {
  const { settings } = useSettings();
  const [points, setPoints] = useState<WeightPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBmi, setShowBmi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MetricEntry[]>("/metrics?metricType=weight")
      .then((entries) => {
        if (cancelled) return;
        const next = entries
          .map((entry) => ({ x: new Date(entry.recordedAt).getTime(), y: Number(entry.value) }))
          .sort((a, b) => a.x - b.x);
        setPoints(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar el peso.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>;
  }

  if (!points) {
    return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (points.length === 0) {
    return (
      <Empty className="m-4">
        <EmptyHeader>
          <EmptyTitle>Todavía no hay registros de peso.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const trend = loess(points);

  const heightCm = settings?.heightCm != null ? Number(settings.heightCm) : null;
  const weightGoalMinKg =
    settings?.weightGoalMinKg != null ? Number(settings.weightGoalMinKg) : null;
  const weightGoalMaxKg =
    settings?.weightGoalMaxKg != null ? Number(settings.weightGoalMaxKg) : null;
  const bmiThresholds = showBmi && heightCm != null ? bmiWeightThresholds(heightCm) : null;

  const domainValues = [
    ...points.map((point) => point.y),
    ...(weightGoalMinKg != null ? [weightGoalMinKg] : []),
    ...(weightGoalMaxKg != null ? [weightGoalMaxKg] : []),
    ...(bmiThresholds
      ? [bmiThresholds.underweightMax, bmiThresholds.normalMax, bmiThresholds.overweightMax]
      : []),
  ];
  const yDomain: [number, number] = [Math.min(...domainValues), Math.max(...domainValues)];

  const activeConfig: ChartConfig = {
    ...chartConfig,
    ...(weightGoalMinKg != null
      ? { goalMin: { label: "Peso mín. objetivo", color: "var(--chart-highlight)" } }
      : {}),
    ...(weightGoalMaxKg != null
      ? { goalMax: { label: "Peso máx. objetivo", color: "var(--chart-highlight-2)" } }
      : {}),
    ...(bmiThresholds
      ? {
          bmiUnderweight: { label: "IMC infrapeso", color: BMI_BAND_COLORS.underweight },
          bmiNormal: { label: "IMC normal", color: BMI_BAND_COLORS.normal },
          bmiOverweight: { label: "IMC sobrepeso", color: BMI_BAND_COLORS.overweight },
          bmiObese: { label: "IMC obesidad", color: BMI_BAND_COLORS.obese },
        }
      : {}),
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h1 className="font-heading text-lg font-medium">Body weight (simple)</h1>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">
              Cada punto es una medición registrada. La línea muestra la tendencia local.
            </p>
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Sobre las variaciones de peso"
                  />
                }
              >
                <Info className="size-4" />
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <p>
                  No prestes demasiada atención al peso de un único día. Es normal ver variaciones
                  de ±1 kg o ±2 kg de un día para otro simplemente por hidratación, cantidad de sal
                  ingerida, glucógeno almacenado, o contenido gastrointestinal.
                </p>
                <p className="text-muted-foreground">
                  La línea de tendencia usa un suavizado por regresión local (LOESS), no una media
                  móvil de 7 días: se ajusta mejor cuando los registros no son diarios ni a la misma
                  hora.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 pt-2">
          <Toggle
            pressed={showBmi}
            onPressedChange={setShowBmi}
            disabled={heightCm == null}
            variant="outline"
          >
            Mostrar IMC
          </Toggle>
          {heightCm == null && (
            <p className="text-xs text-muted-foreground">
              Añade tu altura en Ajustes para ver el IMC.
            </p>
          )}
        </div>
      </div>
      <ChartLegendContent config={activeConfig} />
      <ChartContainer config={activeConfig} className="aspect-auto h-[60vh] w-full">
        <ComposedChart margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={getNiceDayTicks(points[0].x, points[points.length - 1].x)}
            tickFormatter={formatAxisDate}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={yDomain}
            padding={{ top: 20, bottom: 20 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={56}
            tickFormatter={(value) => `${Math.round(value * 100) / 100} kg`}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, label, payload }) => (
              <ChartTooltipContent
                active={active}
                label={label}
                payload={payload
                  // Scatter reports both its x and y fields to the tooltip (it's a 2D
                  // shape); we only want the weight value, not the raw x timestamp.
                  ?.filter((item) => item.dataKey !== "x")
                  // Scatter also ignores the `name` prop for its value entry and
                  // labels it after the dataKey ("y") instead — rename it back so
                  // the config lookup below resolves it to "Peso".
                  .map((item) => (item.name === "y" ? { ...item, name: "weight" } : item))}
                labelFormatter={(_, tooltipPayload) => {
                  const x = tooltipPayload?.[0]?.payload?.x;
                  return typeof x === "number" ? formatTooltipDate(x) : "";
                }}
                formatter={(value) => `${Number(value).toFixed(2)} kg`}
              />
            )}
          />
          <Scatter
            name="weight"
            data={points}
            dataKey="y"
            fill="var(--color-weight)"
            shape={({ cx, cy }: { cx?: number; cy?: number }) =>
              cx === undefined || cy === undefined ? null : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--color-weight)"
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              )
            }
          />
          <Line
            name="trend"
            data={trend}
            dataKey="y"
            type="monotone"
            stroke="var(--color-trend)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {bmiThresholds && (
            <>
              <ReferenceArea
                y1={yDomain[0]}
                y2={bmiThresholds.underweightMax}
                fill={BMI_BAND_COLORS.underweight}
                fillOpacity={0.15}
                strokeOpacity={0}
              />
              <ReferenceArea
                y1={bmiThresholds.underweightMax}
                y2={bmiThresholds.normalMax}
                fill={BMI_BAND_COLORS.normal}
                fillOpacity={0.15}
                strokeOpacity={0}
              />
              <ReferenceArea
                y1={bmiThresholds.normalMax}
                y2={bmiThresholds.overweightMax}
                fill={BMI_BAND_COLORS.overweight}
                fillOpacity={0.15}
                strokeOpacity={0}
              />
              <ReferenceArea
                y1={bmiThresholds.overweightMax}
                y2={yDomain[1]}
                fill={BMI_BAND_COLORS.obese}
                fillOpacity={0.15}
                strokeOpacity={0}
              />
            </>
          )}
          {weightGoalMinKg != null && (
            <ReferenceLine
              y={weightGoalMinKg}
              stroke="var(--chart-highlight)"
              strokeDasharray="4 4"
              label={{
                value: `Mín: ${weightGoalMinKg} kg`,
                position: "insideBottomRight",
                fontSize: 12,
              }}
            />
          )}
          {weightGoalMaxKg != null && (
            <ReferenceLine
              y={weightGoalMaxKg}
              stroke="var(--chart-highlight-2)"
              strokeDasharray="4 4"
              label={{
                value: `Máx: ${weightGoalMaxKg} kg`,
                position: "insideTopRight",
                fontSize: 12,
              }}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
