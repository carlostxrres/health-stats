import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function HomePage() {
  return (
    <Empty className="mx-auto max-w-lg">
      <EmptyHeader>
        <EmptyTitle>health-stats</EmptyTitle>
        <EmptyDescription>Próximamente: un resumen de tu actividad reciente.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
