import type { ComponentType, ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";
import { formatPostDate } from "@/lib/localTime";

export function PostCard({
  icon: Icon,
  verb,
  occurredAt,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  verb: string;
  occurredAt: string;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const displayName = settings?.displayName;

  return (
    <Card>
      <CardContent className="flex gap-3">
        <Avatar>
          <AvatarFallback>
            <Icon className="size-4 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center text-sm font-medium text-foreground">
            {displayName && <span>{displayName}&nbsp;</span>}
            <span>{displayName ? verb.toLowerCase() : verb}</span>
            &nbsp;
            <span className="text-muted-foreground">· {formatPostDate(occurredAt)}</span>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
