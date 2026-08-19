import type { ColorMode, DayStat } from "./types";

// Sequential intensity ramp on the same hue already assigned to "poop"
// elsewhere in the app (WeekView's chartConfig uses --chart-highlight-3,
// hue 305.02) — varying lightness/chroma instead of hue, same idea as the
// app's own --chart-1..5 greyscale ramp.
const COUNT_STEPS = [
  "oklch(0.97 0.01 305.02)", // 0 entries
  "oklch(0.85 0.09 305.02)", // 1
  "oklch(0.72 0.14 305.02)", // 2
  "oklch(0.55 0.18 305.02)", // 3+
] as const;

// Fixed semantic palette (not user-configurable hue), same precedent as
// BMI_BAND_COLORS in WeightView.tsx — Bristol is a health signal, not a
// cosmetic category, and reuses that view's green/red for "normal"/"concerning".
const BRISTOL_BAND_COLORS = {
  hard: "oklch(0.75 0.15 80)", // 1-2: constipated
  normal: "oklch(0.7 0.15 145)", // 3-4: normal
  loose: "oklch(0.72 0.17 55)", // 5-6: loose
  liquid: "oklch(0.65 0.2 25)", // 7: diarrhea
} as const;

function bristolBand(avgBristol: number): keyof typeof BRISTOL_BAND_COLORS {
  if (avgBristol <= 2) return "hard";
  if (avgBristol <= 4) return "normal";
  if (avgBristol <= 6) return "loose";
  return "liquid";
}

export function colorForDay(stat: DayStat, mode: ColorMode): string {
  if (mode === "count") {
    const step = Math.min(stat.count, COUNT_STEPS.length - 1);
    return COUNT_STEPS[step];
  }
  if (stat.avgBristol == null) return "var(--muted)";
  return BRISTOL_BAND_COLORS[bristolBand(stat.avgBristol)];
}

export const COUNT_LEGEND = [
  { color: COUNT_STEPS[0], label: "0" },
  { color: COUNT_STEPS[1], label: "1" },
  { color: COUNT_STEPS[2], label: "2" },
  { color: COUNT_STEPS[3], label: "3+" },
];

export const BRISTOL_LEGEND = [
  { color: BRISTOL_BAND_COLORS.hard, label: "Duro (1-2)" },
  { color: BRISTOL_BAND_COLORS.normal, label: "Normal (3-4)" },
  { color: BRISTOL_BAND_COLORS.loose, label: "Blando (5-6)" },
  { color: BRISTOL_BAND_COLORS.liquid, label: "Líquido (7)" },
];
