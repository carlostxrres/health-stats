import type { ConfirmOptions } from "@/hooks/useConfirmDialog";

const BASE_NOISE_KG = 2;
const DRIFT_RATE_KG_PER_DAY = 0.25;
const MAX_THRESHOLD_KG = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// The allowed swing grows with how long ago the last measurement was, so a
// big gap since the last weigh-in doesn't get flagged as unreasonable.
export function evaluateWeightReasonableness(
  newValueKg: number,
  newRecordedAt: string,
  recentEntries: { value: string; recordedAt: string }[], // desc(recordedAt), most recent first
): { referenceKg: number; thresholdKg: number; daysElapsed: number } | null {
  if (recentEntries.length === 0) return null;

  const referenceKg = median(recentEntries.map((e) => Number(e.value)));
  const daysElapsed = Math.max(
    0,
    (new Date(newRecordedAt).getTime() - new Date(recentEntries[0].recordedAt).getTime()) / DAY_MS,
  );
  const thresholdKg = Math.min(
    MAX_THRESHOLD_KG,
    BASE_NOISE_KG + DRIFT_RATE_KG_PER_DAY * daysElapsed,
  );

  if (Math.abs(newValueKg - referenceKg) <= thresholdKg) return null;
  return { referenceKg, thresholdKg, daysElapsed };
}

export async function confirmIfUnreasonableWeight(
  confirm: (options: ConfirmOptions) => Promise<boolean>,
  newValueKg: number,
  newRecordedAt: string,
  recentEntries: { value: string; recordedAt: string }[],
): Promise<boolean> {
  const result = evaluateWeightReasonableness(newValueKg, newRecordedAt, recentEntries);
  if (!result) return true;
  const days = Math.round(result.daysElapsed);
  return confirm({
    title: "¿Seguro que el peso es correcto?",
    description:
      `Este valor (${newValueKg} kg) se aleja bastante de tu peso reciente ` +
      `(~${result.referenceKg.toFixed(1)} kg, hace ${days === 0 ? "menos de un día" : `${days} día${days === 1 ? "" : "s"}`}). ` +
      "¿Confirmas que es correcto?",
    confirmLabel: "Sí, es correcto",
    cancelLabel: "Revisar",
  });
}
