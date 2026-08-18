import type { SleepSession } from "@shared/types";
import { Moon } from "lucide-react";
import { localClock } from "@/lib/localTime";
import { PostCard } from "./PostCard";

function formatDurationHours(wentToBedAt: string, wokeUpAt: string) {
  const hours = (new Date(wokeUpAt).getTime() - new Date(wentToBedAt).getTime()) / 3_600_000;
  return `${hours.toFixed(1)} horas`;
}

export function SleepPost({ session }: { session: SleepSession }) {
  return (
    <PostCard
      icon={Moon}
      verb={`Carlos durmió${session.isNap ? " una siesta" : ""}`}
      occurredAt={session.wentToBedAt}
    >
      <p className="font-medium text-foreground">
        {formatDurationHours(session.wentToBedAt, session.wokeUpAt)}
      </p>
      <p className="text-sm text-muted-foreground">
        Se levantó a las {localClock(session.wokeUpAt)}
      </p>
      {session.notes && <p className="text-sm text-muted-foreground">{session.notes}</p>}
      {session.qualityRating != null && (
        <p className="text-sm text-muted-foreground">
          Calidad del sueño: {session.qualityRating}/5
        </p>
      )}
      {session.wakeFeeling != null && (
        <p className="text-sm text-muted-foreground">
          Sensación al despertar: {session.wakeFeeling}/5
        </p>
      )}
    </PostCard>
  );
}
