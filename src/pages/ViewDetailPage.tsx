import { useParams } from "react-router-dom";
import { getView } from "@/views/registry";

export function ViewDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const view = getView(slug);

  if (!view) {
    return (
      <div className="flex max-w-lg flex-1 flex-col items-center justify-center gap-1 p-4 text-center text-muted-foreground">
        <p className="font-heading text-lg font-medium text-foreground">Vista no encontrada</p>
        <p className="text-sm">No existe ninguna vista con este nombre.</p>
      </div>
    );
  }

  const ViewComponent = view.component;
  return <ViewComponent />;
}
