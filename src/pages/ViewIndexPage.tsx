import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function ViewIndexPage() {
  return (
    <Empty className="mx-auto max-w-lg">
      <EmptyHeader>
        <EmptyTitle>Selecciona una vista</EmptyTitle>
        <EmptyDescription>Elige una vista arriba para ver tus datos.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
