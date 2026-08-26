import type * as React from "react";

import { cn } from "@/lib/utils";

function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "grid w-full gap-2 rounded-xl bg-card px-4 py-3 text-sm text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "grid gap-2 text-sm text-muted-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
