import type { MetricEntry } from "@shared/types";
import { useEffect, useState } from "react";
import { CartesianGrid, ComposedChart, Line, Scatter, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { apiClient } from "@/lib/api-client";
import { loess } from "@/lib/loess";

type WeightPoint = { x: number; y: number };

const chartConfig: ChartConfig = {
  weight: { label: "Peso", color: "var(--chart-1)" },
  trend: { label: "Tendencia", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatAxisDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatTooltipDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function WeightView() {
  const [points, setPoints] = useState<WeightPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    return <p className="p-4 text-sm text-muted-foreground">Todavía no hay registros de peso.</p>;
  }

  const trend = loess(points);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Body weight (simple)</h1>
        <p className="text-sm text-muted-foreground">
          Cada punto es una medición registrada. La línea muestra la tendencia local.
        </p>
      </div>
      <ChartLegendContent config={chartConfig} />
      <ChartContainer config={chartConfig} className="aspect-auto h-[60vh] w-full">
        <ComposedChart margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatAxisDate}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={56}
            tickFormatter={(value) => `${value} kg`}
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
                formatter={(value) => `${Number(value).toFixed(1)} kg`}
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
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
