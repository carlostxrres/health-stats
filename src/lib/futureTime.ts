import type { ConfirmOptions } from "@/hooks/useConfirmDialog";

// Clock skew between filling out the form and hitting submit is normal;
// only flag timestamps meaningfully ahead of "now".
const FUTURE_GRACE_MS = 5 * 60 * 1000;

export function isFutureTime(iso: string, graceMs: number = FUTURE_GRACE_MS): boolean {
  return new Date(iso).getTime() > Date.now() + graceMs;
}

// Shared copy for the "you're logging this in the future" confirm, used by
// every entry form. Returns true if the save should proceed.
export async function confirmIfFuture(
  confirm: (options: ConfirmOptions) => Promise<boolean>,
  iso: string,
): Promise<boolean> {
  if (!isFutureTime(iso)) return true;
  return confirm({
    title: "¿Fecha futura?",
    description:
      "La fecha y hora indicadas todavía no han llegado. ¿Seguro que quieres guardarlo así?",
    confirmLabel: "Guardar igual",
    cancelLabel: "Revisar",
  });
}
