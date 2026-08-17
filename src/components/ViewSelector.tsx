import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { VIEWS } from "@/views/registry";

export function ViewSelector() {
  return (
    <nav className="flex gap-3 overflow-x-auto border-b p-4">
      {VIEWS.map((view) => (
        <NavLink
          key={view.slug}
          to={`/view/${view.slug}`}
          className={({ isActive }) =>
            cn(
              "flex w-24 shrink-0 flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors hover:bg-accent",
              isActive ? "border-primary bg-accent" : "border-border",
            )
          }
        >
          <view.icon className="size-6 text-foreground" />
          <span className="text-xs leading-tight font-medium text-foreground">{view.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
